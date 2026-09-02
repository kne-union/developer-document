const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.signature;

  fastify.post(
    `${options.prefix}/open-api/sync/npm-package`,
    {
      onRequest: [authenticate.openApi],
      schema: {
        summary: 'Open API 触发 NPM 包同步（不存在则自动创建；可回填 type/registry）',
        body: {
          type: 'object',
          properties: {
            packageName: { type: 'string' },
            version: { type: 'string' },
            registry: { type: 'string' },
            type: {
              type: 'string',
              enum: ['frontend', 'nodejs', 'engineering', 'miniprogram', 'prompts', 'other'],
              description: '创建时写入；已存在且传入非 other 时可更新（不会用 other 降级）'
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
        summary: 'Open API 触发远程组件部署（不存在则自动创建；无 url 时索引回退 npm README）',
        body: {
          type: 'object',
          properties: {
            remote: { type: 'string' },
            packageName: { type: 'string' },
            registry: { type: 'string' },
            url: { type: 'string' },
            tpl: { type: 'string' },
            version: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.openApi.triggerRemoteComponentDeploy(request.body);
    }
  );
});
