const fp = require('fastify-plugin');
const { readZipUploadBuffer, sendZipDownload } = require('../utils/kne-document-io');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const adminAuth = [authenticate.user, authenticate.admin];

  fastify.get(
    `${options.prefix}/experience/manage/list`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '经验管理列表',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => services.experience.list(request.query)
  );

  fastify.get(
    `${options.prefix}/experience/manage/detail`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '经验详情',
        query: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.experience.detail(request.query)
  );

  fastify.post(
    `${options.prefix}/experience/manage/close`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '关闭经验',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.experience.close(request.body)
  );

  fastify.post(
    `${options.prefix}/experience/manage/reopen`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '重新启用经验',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.experience.reopen(request.body)
  );

  fastify.post(
    `${options.prefix}/experience/manage/delete`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '删除经验',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.experience.remove(request.body)
  );

  fastify.get(
    `${options.prefix}/experience/manage/export`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '导出经验 ZIP（按筛选条件）',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            category: { type: 'string' },
            status: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { buffer, count } = await services.experience.exportZip(request.query);
      sendZipDownload(reply, {
        buffer,
        filename: `experience-export-${Date.now()}-${count}.zip`
      });
    }
  );

  fastify.post(
    `${options.prefix}/experience/manage/import`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '导入经验 ZIP',
        querystring: {
          type: 'object',
          properties: {
            skipIfExists: { type: 'boolean', default: false },
            overwrite: { type: 'boolean', default: true }
          }
        }
      }
    },
    async request => {
      const buffer = await readZipUploadBuffer(request);
      const { skipIfExists, overwrite } = request.query;
      return services.experience.importZip({
        buffer,
        userId: request.userInfo.id,
        skipIfExists: skipIfExists === true || skipIfExists === 'true',
        overwrite: overwrite !== false && overwrite !== 'false'
      });
    }
  );

  fastify.get(
    `${options.prefix}/experience/exists`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '检查经验是否已存在（按 relativePath）',
        query: {
          type: 'object',
          properties: { relativePath: { type: 'string' } },
          required: ['relativePath']
        }
      }
    },
    async request => services.experience.exists(request.query)
  );

  fastify.post(
    `${options.prefix}/experience/upload`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '上传经验',
        body: {
          type: 'object',
          properties: {
            relativePath: { type: 'string' },
            content: { type: 'object' },
            skipIfExists: { type: 'boolean', default: false }
          },
          required: ['relativePath', 'content']
        }
      }
    },
    async request =>
      services.experience.upsert({
        ...request.body,
        userId: request.userInfo.id
      })
  );

  fastify.get(
    `${options.prefix}/experience/search`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '搜索经验',
        query: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number', default: 3 }
          }
        }
      }
    },
    async request =>
      services.experience.search({
        ...request.query,
        userId: request.userInfo.id,
        source: 'rest'
      })
  );
});
