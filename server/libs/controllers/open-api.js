const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.signature;

  fastify.post(
    `${options.prefix}/open-api/sync/npm-package`,
    {
      onRequest: [authenticate.openApi],
      schema: {
        summary: 'Open API 触发 NPM 包同步（不存在则自动创建后同步）',
        body: {
          type: 'object',
          properties: {
            packageName: { type: 'string' },
            version: { type: 'string' },
            registry: { type: 'string' },
            type: {
              type: 'string',
              enum: ['frontend', 'nodejs', 'engineering', 'miniprogram', 'prompts', 'other'],
              description: '仅自动创建时生效；缺省或非法值为 other'
            }
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
        summary: 'Open API 触发远程组件部署（不存在则按 remote/packageName 自动创建后部署）',
        body: {
          type: 'object',
          properties: {
            remote: { type: 'string' },
            packageName: { type: 'string' },
            registry: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.openApi.triggerRemoteComponentDeploy(request.body);
    }
  );
});
