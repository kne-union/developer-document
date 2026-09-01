const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const adminAuth = [authenticate.user, authenticate.admin];

  fastify.get(
    `${options.prefix}/search-analytics/records`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '搜索记录列表',
        query: {
          type: 'object',
          properties: {
            searchType: { type: 'string' },
            query: { type: 'string' },
            userId: { type: 'string' },
            zeroHitOnly: { type: 'boolean' },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => services.searchAnalytics.listRecords(request.query)
  );

  fastify.get(
    `${options.prefix}/search-analytics/summary`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '搜索统计汇总',
        query: {
          type: 'object',
          properties: {
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    async request => services.searchAnalytics.summary(request.query)
  );

  fastify.get(
    `${options.prefix}/search-analytics/trend`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '搜索趋势',
        query: {
          type: 'object',
          properties: {
            days: { type: 'number', default: 7 }
          }
        }
      }
    },
    async request => services.searchAnalytics.trend(request.query)
  );

  fastify.get(
    `${options.prefix}/search-analytics/top-queries`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '热门搜索词',
        query: {
          type: 'object',
          properties: {
            searchType: { type: 'string' },
            limit: { type: 'number', default: 10 },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    async request => services.searchAnalytics.topQueries(request.query)
  );
});
