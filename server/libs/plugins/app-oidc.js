/**
 * 应用中心子应用 OIDC 接入：子应用 server 依赖 @kne/fastify-oidc 时，
 * 首次部署在本系统（主 IdP）登记资源服务与 client，并强制以 central 模式启动。
 */
const path = require('node:path');
const fs = require('fs-extra');
const isEqual = require('lodash/isEqual');
const { decrypt, randomSecret } = require('@kne/fastify-oidc/libs/utils/crypto');
const createServiceClient = require('@kne/fastify-oidc/libs/resource/service-client');

const OIDC_PACKAGE = '@kne/fastify-oidc';
// 子应用 @kne/fastify-app-runtime 的 /open-api.json 放行带此 scope 的 client 令牌
const OPEN_API_SCOPE = 'open-api:read';
const DOCS_CLIENT_ID = 'app-center-docs';

const SYSTEM_ENV_KEYS = ['AUTH_MODE', 'OIDC_ISSUER', 'OIDC_AUDIENCE', 'OIDC_CLIENT_ID', 'OIDC_SERVICE_CLIENT_ID', 'OIDC_SERVICE_CLIENT_SECRET'];

const supportsOidc = async serverDir => {
  try {
    const pkg = await fs.readJson(path.join(serverDir, 'package.json'));
    return !!pkg.dependencies?.[OIDC_PACKAGE];
  } catch (e) {
    return false;
  }
};

const createAppOidc = (fastify, { pathPrefix = '/app' } = {}) => {
  const oidc = () => fastify.oidc;
  const { origin, issuer, serviceAudience } = fastify.oidcOptions;
  const { protocol } = new URL(origin);

  const clientIds = name => ({ spa: `app-${name}`, service: `app-${name}-service` });

  const resolveUrls = app => {
    const pathBase = `${origin}${pathPrefix}/${app.name}`;
    const domainBase = app.domain ? `${protocol}//${app.domain}` : null;
    return {
      bases: [domainBase, pathBase].filter(Boolean),
      // 子应用用 ORIGIN 拼邀请 / 重置密码等对外链接，路径模式必须带 /app/{name}；fastify-oidc 只取其 origin 部分
      appUrl: domainBase || pathBase,
      // 资源标识只作 token 的 aud，固定用路径形式，绑定 / 更换域名后不变
      audience: `${pathBase}/api`
    };
  };

  const spaMetadata = (app, { bases }) => ({
    application_type: 'web',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    redirect_uris: bases.map(base => `${base}/oidc-callback`),
    post_logout_redirect_uris: bases.map(base => `${base}/`),
    // 子应用与本系统同机，登出通知直连子应用端口，不经过网关
    backchannel_logout_uri: `http://127.0.0.1:${app.port}/api/oidc/backchannel-logout`,
    backchannel_logout_session_required: true
  });

  const ensureResourceServer = async ({ identifier, name }) => {
    const { models, services, options } = oidc();
    const existing = await models.resourceServer.findOne({ where: { identifier } });
    if (!existing) {
      await services.resourceServer.create({ identifier, name, scope: `${options.defaultResourceScope} ${OPEN_API_SCOPE}`, description: '应用中心子应用自动登记' });
      return;
    }
    const scopes = String(existing.scope || options.defaultResourceScope)
      .split(' ')
      .filter(Boolean);
    if (!scopes.includes(OPEN_API_SCOPE)) {
      await existing.update({ scope: [...scopes, OPEN_API_SCOPE].join(' ') });
    }
  };

  const ensureSpaClient = async ({ clientId, clientName, metadata, allowedResources }) => {
    const { models, services } = oidc();
    const existing = await models.client.findOne({ where: { clientId } });
    if (!existing) {
      await services.client.create({ clientId, clientName, metadata, allowedResources, description: '应用中心子应用自动登记' });
      return;
    }
    const nextMetadata = Object.assign({}, existing.metadata, metadata);
    if (!isEqual(nextMetadata, existing.metadata) || !isEqual(allowedResources, existing.allowedResources)) {
      await services.client.save({ id: existing.id, metadata: nextMetadata, allowedResources });
    }
  };

  const ensureServiceClient = async ({ clientId, clientName }) => {
    const { models, services, options } = oidc();
    const existing = await models.client.findOne({ where: { clientId } });
    if (!existing) {
      const clientSecret = randomSecret(32);
      await services.client.create({
        clientId,
        clientName,
        clientSecret,
        metadata: { grant_types: ['client_credentials'], response_types: [], token_endpoint_auth_method: 'client_secret_basic' },
        allowedResources: [serviceAudience],
        description: '应用中心子应用自动登记'
      });
      return clientSecret;
    }
    // 以认证管理中的实际 secret 为准（管理员可能重置过）
    return decrypt(options.keyEncryptionSecret, existing.clientSecret);
  };

  /** 本系统读取子应用文档用的 client：allowedResources 随需要读取的子应用 audience 增加 */
  const ensureDocsClient = async audience => {
    const { models, services, options } = oidc();
    const existing = await models.client.findOne({ where: { clientId: DOCS_CLIENT_ID } });
    if (!existing) {
      const clientSecret = randomSecret(32);
      await services.client.create({
        clientId: DOCS_CLIENT_ID,
        clientName: '应用中心文档读取',
        clientSecret,
        metadata: { grant_types: ['client_credentials'], response_types: [], token_endpoint_auth_method: 'client_secret_basic' },
        allowedResources: [audience],
        description: '应用中心 MCP 读取子应用 OpenAPI 文档'
      });
      return clientSecret;
    }
    const allowedResources = existing.allowedResources || [];
    if (!allowedResources.includes(audience)) {
      await services.client.save({ id: existing.id, allowedResources: [...allowedResources, audience] });
    }
    return decrypt(options.keyEncryptionSecret, existing.clientSecret);
  };

  let docsServiceClient = null;

  /** 签发访问子应用 /open-api.json 的服务令牌（audience 为子应用 OIDC_AUDIENCE，scope 为 open-api:read） */
  const getOpenApiToken = async app => {
    const audience = app.env?.OIDC_AUDIENCE;
    if (!audience) {
      throw new Error(`应用 ${app.name} 未接入 OIDC（server 未依赖 ${OIDC_PACKAGE} 或尚未部署），无法签发读取文档的令牌`);
    }
    await oidc().whenReady();
    await ensureResourceServer({ identifier: audience, name: app.label || app.name });
    const clientSecret = await ensureDocsClient(audience);
    if (!docsServiceClient || docsServiceClient.clientSecret !== clientSecret) {
      docsServiceClient = {
        clientSecret,
        client: createServiceClient({ options: { runtime: oidc().options.runtime, serviceClient: { clientId: DOCS_CLIENT_ID, clientSecret }, serviceScopes: [] } })
      };
    }
    return docsServiceClient.client.getServiceToken({ resource: audience, scope: OPEN_API_SCOPE });
  };

  const resolveSystemEnv = async ({ app, serverDir }) => {
    if (!(await supportsOidc(serverDir))) {
      return null;
    }
    await oidc().whenReady();
    const urls = resolveUrls(app);
    const ids = clientIds(app.name);
    await ensureResourceServer({ identifier: urls.audience, name: app.label || app.name });
    await ensureSpaClient({
      clientId: ids.spa,
      clientName: app.label || app.name,
      metadata: spaMetadata(app, urls),
      allowedResources: [urls.audience]
    });
    const serviceSecret = await ensureServiceClient({ clientId: ids.service, clientName: `${app.label || app.name} 服务端` });

    return Object.assign(
      {
        AUTH_MODE: 'central',
        OIDC_ISSUER: issuer,
        OIDC_AUDIENCE: urls.audience,
        OIDC_CLIENT_ID: ids.spa,
        OIDC_SERVICE_CLIENT_ID: ids.service,
        OIDC_SERVICE_CLIENT_SECRET: serviceSecret
      },
      app.env?.ORIGIN ? {} : { ORIGIN: urls.appUrl }
    );
  };

  const onAppRemoved = async ({ app }) => {
    if (!app.env?.OIDC_CLIENT_ID) {
      return;
    }
    const { models, services } = oidc();
    await oidc().whenReady();
    for (const clientId of [app.env.OIDC_CLIENT_ID, app.env.OIDC_SERVICE_CLIENT_ID].filter(Boolean)) {
      const item = await models.client.findOne({ where: { clientId } });
      if (item) {
        await services.client.remove({ id: item.id });
      }
    }
    if (app.env.OIDC_AUDIENCE) {
      const docsClient = await models.client.findOne({ where: { clientId: DOCS_CLIENT_ID } });
      if (docsClient && (docsClient.allowedResources || []).includes(app.env.OIDC_AUDIENCE)) {
        await services.client.save({ id: docsClient.id, allowedResources: docsClient.allowedResources.filter(item => item !== app.env.OIDC_AUDIENCE) });
      }
      const item = await models.resourceServer.findOne({ where: { identifier: app.env.OIDC_AUDIENCE } });
      if (item) {
        await services.resourceServer.remove({ id: item.id });
      }
    }
  };

  return { systemEnvKeys: SYSTEM_ENV_KEYS, resolveSystemEnv, onAppRemoved, getOpenApiToken };
};

module.exports = createAppOidc;
module.exports.supportsOidc = supportsOidc;
module.exports.SYSTEM_ENV_KEYS = SYSTEM_ENV_KEYS;
