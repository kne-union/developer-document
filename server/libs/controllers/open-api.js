const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.signature;

  fastify.post(
    `${options.prefix}/open-api/sync/npm-package`,
    {
      onRequest: [authenticate.openApi],
      schema: {
        summary: 'Open API 触发 NPM 包同步',
        body: {
          type: 'object',
          properties: {
            packageName: { type: 'string' },
            version: { type: 'string' },
            registry: { type: 'string' }
          },
          required: ['packageName']
        }
      }
    },
    async request => {
      return services.openApi.triggerNpmPackageSync(request.body);
    }
  );

  fastify.post(
    `${options.prefix}/open-api/sync/remote-component`,
    {
      onRequest: [authenticate.openApi],
      schema: {
        summary: 'Open API 触发远程组件部署',
        body: {
          type: 'object',
          properties: {
            remote: { type: 'string' },
            packageName: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.openApi.triggerRemoteComponentDeploy(request.body);
    }
  );
});
