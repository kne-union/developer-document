const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  // 创建文档
  fastify.post(
    `${options.prefix}/document/create`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '创建文档',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            content: { type: 'string', default: '' },
            status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
            isPublic: { type: 'boolean', default: false },
            groups: { type: 'array', items: { type: 'object' }, default: [] }
          },
          required: ['name']
        }
      }
    },
    async request => {
      return services.document.create({
        ...request.body,
        createdUserId: request.user.id
      });
    }
  );

  // 更新文档
  fastify.post(
    `${options.prefix}/document/update`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '更新文档',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            content: { type: 'string', default: '' },
            status: { type: 'string', enum: ['draft', 'published'], default: 'draft' },
            isPublic: { type: 'boolean', default: false },
            groups: { type: 'array', items: { type: 'object' }, default: [] }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.document.update(request.body);
    }
  );

  // 删除文档
  fastify.post(
    `${options.prefix}/document/delete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '删除文档',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      await services.document.remove(request.body);
      return { success: true };
    }
  );

  // 获取文档详情
  fastify.get(
    `${options.prefix}/document/detail`,
    {
      schema: {
        summary: '获取文档详情',
        query: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.document.detail(request.query);
    }
  );

  // 获取文档列表（管理后台）
  fastify.get(
    `${options.prefix}/document/list`,
    {
      onRequest: [authenticate.user],
      schema: {
        summary: '获取文档列表（管理后台）',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            isPublic: { type: 'boolean' },
            group: { type: 'string' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 },
            createdUserId: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.document.list(request.query);
    }
  );

  // 发布文档
  fastify.post(
    `${options.prefix}/document/publish`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '发布文档',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.document.publish(request.body);
    }
  );

  // 取消发布文档
  fastify.post(
    `${options.prefix}/document/unpublish`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '取消发布文档',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.document.unpublish(request.body);
    }
  );

  // 获取公开文档列表（前台）
  fastify.get(
    `${options.prefix}/document/public/list`,
    {
      schema: {
        summary: '获取公开文档列表（前台）',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            groups: { type: 'array', items: { type: 'string' } },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.document.getPublicList(request.query);
    }
  );
});
