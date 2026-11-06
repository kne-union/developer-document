const fp = require('fastify-plugin');
const { createDevTokenAuthenticate } = require('../utils/dev-token');

const assetBodyProperties = {
  type: { type: 'string', enum: ['rule', 'skill'] },
  name: { type: 'string' },
  title: { type: 'string' },
  description: { type: 'string' },
  alwaysApply: { type: 'boolean' },
  globs: { type: 'array', items: { type: 'string' } },
  category: { type: 'string' },
  keywords: { type: 'array', items: { type: 'string' } },
  content: { type: 'string' },
  status: { type: 'string', enum: ['active', 'closed'] },
  source: { type: 'string' }
};

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const adminAuth = [authenticate.user, authenticate.admin];
  const authenticateDevToken = createDevTokenAuthenticate(fastify);

  fastify.get(
    `${options.prefix}/skill/manage/list`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '技能/规则管理列表',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            type: { type: 'string', enum: ['rule', 'skill'] },
            category: { type: 'string' },
            status: { type: 'string' },
            createdUserId: { type: 'string' },
            source: { type: 'string' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => services.skillAsset.list(request.query)
  );

  fastify.get(
    `${options.prefix}/skill/manage/detail`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '技能/规则详情',
        query: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.skillAsset.detail(request.query)
  );

  fastify.post(
    `${options.prefix}/skill/manage/create`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '新建技能/规则',
        body: {
          type: 'object',
          properties: assetBodyProperties,
          required: ['name']
        }
      }
    },
    async request =>
      services.skillAsset.create({
        ...request.body,
        userId: request.userInfo.id
      })
  );

  fastify.post(
    `${options.prefix}/skill/manage/update`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '编辑技能/规则',
        body: {
          type: 'object',
          properties: Object.assign({ id: { type: 'string' } }, assetBodyProperties),
          required: ['id']
        }
      }
    },
    async request => services.skillAsset.update(request.body)
  );

  fastify.post(
    `${options.prefix}/skill/manage/close`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '关闭技能/规则',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.skillAsset.close(request.body)
  );

  fastify.post(
    `${options.prefix}/skill/manage/reopen`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '重新启用技能/规则',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.skillAsset.reopen(request.body)
  );

  fastify.post(
    `${options.prefix}/skill/manage/delete`,
    {
      onRequest: adminAuth,
      schema: {
        summary: '删除技能/规则',
        body: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      }
    },
    async request => services.skillAsset.remove(request.body)
  );

  fastify.get(
    `${options.prefix}/skill/search`,
    {
      onRequest: [authenticateDevToken],
      schema: {
        summary: '搜索技能/规则（AI 通道）',
        query: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string', enum: ['rule', 'skill'] },
            category: { type: 'string' },
            limit: { type: 'number', default: 5 }
          }
        }
      }
    },
    async request => services.skillAsset.search(request.query)
  );

  fastify.get(
    `${options.prefix}/skill/export`,
    {
      onRequest: [authenticateDevToken],
      schema: {
        summary: '按安装目标导出技能/规则安装清单（AI / CLI 通道）',
        query: {
          type: 'object',
          properties: {
            target: { type: 'string', enum: ['cursor', 'workbuddy'] },
            type: { type: 'string', enum: ['rule', 'skill'] },
            name: { type: 'string' },
            category: { type: 'string' },
            includeClosed: { type: 'boolean', default: false }
          },
          required: ['target']
        }
      }
    },
    async request => services.skillAsset.exportForTarget(request.query)
  );

  fastify.post(
    `${options.prefix}/skill/upload`,
    {
      onRequest: [authenticateDevToken],
      schema: {
        summary: '上传/更新技能或规则（AI 通道，幂等）',
        body: {
          type: 'object',
          properties: assetBodyProperties,
          required: ['name']
        }
      }
    },
    async request =>
      services.skillAsset.upsert({
        ...request.body,
        userId: request.userInfo.id
      })
  );
});
