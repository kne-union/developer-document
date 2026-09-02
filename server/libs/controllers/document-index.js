const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  fastify.get(
    `${options.prefix}/document-index/search`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '搜索组件/npm 文档索引',
        query: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            docId: { type: 'string' },
            version: { type: 'string' },
            limit: { type: 'number', default: 3 }
          }
        }
      }
    },
    async request =>
      services.documentIndex.search({
        ...request.query,
        userId: request.userInfo.id,
        source: 'rest'
      })
  );

  fastify.get(
    `${options.prefix}/document-index/content`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '按 ref 读取文档索引内容',
        query: {
          type: 'object',
          required: ['ref'],
          properties: {
            ref: { type: 'string' }
          }
        }
      }
    },
    async request => services.docRetrieval.resolveRef(request.query.ref)
  );
});
