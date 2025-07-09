const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  fastify.post(
    `${options.prefix}/setting/saveOrCreate`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '保存网站设置项',
        body: {
          type: 'object',
          properties: {
            settingKey: { type: 'string' },
            settingValue: { type: 'object' }
          },
          required: ['settingKey', 'settingValue']
        }
      }
    },
    async request => {
      return services.setting.saveOrCreate(request.body);
    }
  );

  fastify.get(
    `${options.prefix}/setting/detail`,
    {
      schema: {
        summary: '获取网站设置项'
      }
    },
    async request => {
      return services.setting.detail();
    }
  );
});
