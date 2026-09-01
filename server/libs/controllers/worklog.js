const fp = require('fastify-plugin');
const { readZipUploadBuffer, sendZipDownload } = require('../utils/kne-document-io');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const adminAuth = [authenticate.user, authenticate.admin];

  fastify.get(
    `${options.prefix}/worklog/manage/list`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '工作日志管理列表（可按用户筛选）',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            projectName: { type: 'string' },
            createdUserId: { type: 'string' },
            writtenAtStart: { type: 'string', format: 'date-time' },
            writtenAtEnd: { type: 'string', format: 'date-time' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => services.worklog.list(request.query)
  );

  fastify.get(
    `${options.prefix}/worklog/manage/detail`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '工作日志详情',
        query: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.worklog.detail(request.query)
  );

  fastify.get(
    `${options.prefix}/worklog/manage/export`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '导出工作日志 ZIP（按筛选条件）',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            projectName: { type: 'string' },
            createdUserId: { type: 'string' },
            writtenAtStart: { type: 'string', format: 'date-time' },
            writtenAtEnd: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    async (request, reply) => {
      const { buffer, count } = await services.worklog.exportZip(request.query);
      sendZipDownload(reply, {
        buffer,
        filename: `worklog-export-${Date.now()}-${count}.zip`
      });
    }
  );

  fastify.post(
    `${options.prefix}/worklog/manage/import`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '导入工作日志 ZIP',
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
      return services.worklog.importZip({
        buffer,
        userId: request.userInfo.id,
        skipIfExists: skipIfExists === true || skipIfExists === 'true',
        overwrite: overwrite !== false && overwrite !== 'false'
      });
    }
  );

  fastify.get(
    `${options.prefix}/worklog/exists`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '检查工作日志是否已存在（按 relativePath）',
        query: {
          type: 'object',
          properties: { relativePath: { type: 'string' } },
          required: ['relativePath']
        }
      }
    },
    async request => services.worklog.exists(request.query)
  );

  fastify.post(
    `${options.prefix}/worklog/upload`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '上传工作日志',
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
      services.worklog.upsert({
        ...request.body,
        userId: request.userInfo.id
      })
  );
});
