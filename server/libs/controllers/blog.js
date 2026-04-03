const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  // 创建博客
  fastify.post(
    `${options.prefix}/blog/create`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '创建博客',
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            publishTime: { type: 'string', format: 'date-time' },
            isPublic: { type: 'boolean' },
            groups: { type: 'array', items: { type: 'string' } }
          },
          required: ['title', 'content']
        }
      }
    },
    async request => {
      return services.blog.create({
        ...request.body,
        createdUserId: request.user.id
      });
    }
  );

  // 更新博客
  fastify.post(
    `${options.prefix}/blog/update`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '更新博客',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            publishTime: { type: 'string', format: 'date-time' },
            isPublic: { type: 'boolean' },
            groups: { type: 'array', items: { type: 'string' } }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.blog.update(request.body);
    }
  );

  // 删除博客
  fastify.post(
    `${options.prefix}/blog/delete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '删除博客',
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
      await services.blog.remove(request.body);
      return { success: true };
    }
  );

  // 获取博客详情
  fastify.get(
    `${options.prefix}/blog/detail`,
    {
      schema: {
        summary: '获取博客详情',
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
      return services.blog.detail(request.query);
    }
  );

  // 获取博客列表（管理后台）
  fastify.get(
    `${options.prefix}/blog/list`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '获取博客列表（管理后台）',
        query: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            keyword: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'published'] },
            isPublic: { type: 'boolean' },
            groups: { type: 'array', items: { type: 'string' } },
            pageSize: { type: 'number', default: 10 },
            current: { type: 'number', default: 1 },
            createdUserId: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.blog.list(request.query);
    }
  );

  // 发布博客
  fastify.post(
    `${options.prefix}/blog/publish`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '发布博客',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            publishTime: { type: 'string', format: 'date-time' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.blog.publish(request.body);
    }
  );

  // 取消发布博客
  fastify.post(
    `${options.prefix}/blog/unpublish`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '取消发布博客',
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
      return services.blog.unpublish(request.body);
    }
  );

  // 获取公开博客列表（前台）
  fastify.get(
    `${options.prefix}/blog/public/list`,
    {
      schema: {
        summary: '获取公开博客列表（前台）',
        query: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            groups: { type: 'array', items: { type: 'string' } },
            pageSize: { type: 'number', default: 10 },
            current: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.blog.getPublicList(request.query);
    }
  );
});
