const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  fastify.get(
    `${options.prefix}/blog-lead/list`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '文章线索列表',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed'] },
            channel: { type: 'string' },
            perPage: { type: 'number', default: 20 },
            currentPage: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.blogLead.list(request.query);
    }
  );

  fastify.get(
    `${options.prefix}/blog-lead/detail`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '文章线索详情',
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
      return services.blogLead.detail(request.query);
    }
  );

  fastify.post(
    `${options.prefix}/blog-lead/update`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '更新文章线索',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            summary: { type: 'string' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.blogLead.update(request.body);
    }
  );

  fastify.post(
    `${options.prefix}/blog-lead/delete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '删除文章线索',
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
      return services.blogLead.remove(request.body);
    }
  );

  fastify.post(
    `${options.prefix}/blog-lead/complete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '完成文章线索并写入博客',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            // 不设 default：未传时走渠道设置 defaultIsPublic / defaultGroups
            groups: { type: 'array', items: { type: 'object' } },
            isPublic: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'published'] }
          },
          required: ['id']
        }
      }
    },
    async request => {
      return services.blogLead.complete(request.userInfo, request.body);
    }
  );

  fastify.get(
    `${options.prefix}/blog-lead/settings`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '获取文章线索渠道设置'
      }
    },
    async () => {
      return services.blogLead.getSettings();
    }
  );

  fastify.post(
    `${options.prefix}/blog-lead/settings`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '保存文章线索渠道设置',
        body: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            accessSecret: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            countPerKeyword: { type: 'number' },
            scheduleType: { type: 'string', enum: ['daily', 'intervalHours'] },
            scheduleHour: { type: 'number' },
            intervalHours: { type: 'number' },
            maxRequestsPerRun: { type: 'number' },
            includeHot: { type: 'boolean' },
            hotLimit: { type: 'number' },
            defaultBlogStatus: { type: 'string', enum: ['draft', 'published'] },
            defaultIsPublic: { type: 'boolean' },
            defaultGroups: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    async request => {
      return services.blogLead.saveSettings(request.body || {});
    }
  );

  fastify.post(
    `${options.prefix}/blog-lead/fetch`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '手动触发知乎线索拉取任务'
      }
    },
    async () => {
      const task = await services.task.createBlogSearchTask();
      return {
        success: true,
        taskId: task.id,
        message: '文章线索拉取任务已创建'
      };
    }
  );
});
