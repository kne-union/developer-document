/**
 * 应用中心子应用 OIDC 接入：子应用 server 依赖 @kne/fastify-oidc 时，
 * 首次部署在本系统（主 IdP）登记资源服务与 client，并强制以 central 模式启动。
 */
const path = require('node:path');
const fs = require('fs-extra');
const isEqual = require('lodash/isEqual');
const { decrypt, randomSecret } = require('@kne/fastify-oidc/libs/utils/crypto');

const OIDC_PACKAGE = '@kne/fastify-oidc';

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
    const { models, services } = oidc();
    if (!(await models.resourceServer.findOne({ where: { identifier } }))) {
      await services.resourceServer.create({ identifier, name, description: '应用中心子应用自动登记' });
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
      const item = await models.resourceServer.findOne({ where: { identifier: app.env.OIDC_AUDIENCE } });
      if (item) {
        await services.resourceServer.remove({ id: item.id });
      }
    }
  };

  return { systemEnvKeys: SYSTEM_ENV_KEYS, resolveSystemEnv, onAppRemoved };
};

module.exports = createAppOidc;
module.exports.supportsOidc = supportsOidc;
module.exports.SYSTEM_ENV_KEYS = SYSTEM_ENV_KEYS;
