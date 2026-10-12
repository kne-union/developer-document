const fp = require('fastify-plugin');
const { GRANT_TYPE, ACCESS_TOKEN_TYPE } = require('@kne/fastify-oidc/libs/idp/grants/token-exchange');
const { extractToken } = require('../utils/dev-token');

module.exports = fp(async (fastify, options) => {
  const { authenticate } = fastify.account;

  fastify.post(
    `${options.prefix}/dev-token/issue`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '签发开发者长期令牌（MCP、kne-document 同步使用）'
      }
    },
    async request => {
      const { issuer, devTokenAudience, serviceClient } = fastify.oidcOptions;
      // IdP 挂在本进程上，直接 inject 到 token 端点，不经公网 issuer 地址绕回自身
      const response = await fastify.inject({
        method: 'POST',
        url: `${new URL(issuer).pathname}/token`,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${Buffer.from(`${encodeURIComponent(serviceClient.clientId)}:${encodeURIComponent(serviceClient.clientSecret)}`).toString('base64')}`
        },
        payload: new URLSearchParams({
          grant_type: GRANT_TYPE,
          subject_token: extractToken(request),
          subject_token_type: ACCESS_TOKEN_TYPE,
          resource: devTokenAudience
        }).toString()
      });
      const data = response.json();
      if (response.statusCode !== 200) {
        const error = new Error(data.error_description || data.error || '签发开发者令牌失败');
        error.statusCode = response.statusCode === 400 ? 400 : 502;
        throw error;
      }
      return {
        token: data.access_token,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString()
      };
    }
  );
});
