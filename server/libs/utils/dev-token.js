const unauthorized = message => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

const extractToken = request => {
  const header = request.headers.authorization;
  if (header && /^bearer\s+/i.test(header)) {
    return header.replace(/^bearer\s+/i, '').trim();
  }
  // 部分外部工具（kne-document 同步、MCP 初始化脚本）只会发 x-user-token 头
  return request.headers['x-user-token'] || null;
};

/**
 * 开发者长期令牌（aud 为开发者令牌资源）鉴权，其它令牌回退到常规用户鉴权。
 * 仅用于 MCP、kne-document 同步等需要长期凭证的接口。
 */
const createDevTokenAuthenticate = fastify => async request => {
  const token = extractToken(request);
  if (token) {
    let payload = null;
    try {
      payload = await fastify.oidc.verifier.verifyAccessToken(token, { audience: fastify.oidcOptions.devTokenAudience });
    } catch (e) {
      payload = null;
    }
    if (payload) {
      if (!payload.sub || (await fastify.oidc.revocation.isRevoked(payload))) {
        throw unauthorized('开发者令牌已失效，请重新签发');
      }
      const userInfo = await fastify.account.services.user.getUser({ id: payload.sub });
      if (!userInfo || !(userInfo.status === 0 || userInfo.status === 1)) {
        throw unauthorized('账号不可用');
      }
      request.user = {
        userId: String(payload.sub),
        clientId: payload.client_id || null,
        scope: payload.scope ? String(payload.scope).split(' ') : [],
        actor: payload.act?.sub || null,
        isClient: false,
        legacy: false,
        expiresAt: payload.exp || null,
        payload
      };
      request.authenticatePayload = { id: request.user.userId };
      request.userInfo = userInfo;
      return;
    }
  }
  if (!request.headers.authorization && token) {
    request.headers.authorization = `Bearer ${token}`;
  }
  await fastify.account.authenticate.user(request);
};

module.exports = { createDevTokenAuthenticate, extractToken };
