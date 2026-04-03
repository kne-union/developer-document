const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  // 手动触发博客搜索任务
  fastify.post(
    `${options.prefix}/task/blog-search`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '手动触发博客搜索任务'
      }
    },
    async request => {
      const task = await services.task.createBlogSearchTask();
      return {
        success: true,
        taskId: task.id,
        message: '博客搜索任务已创建'
      };
    }
  );

  // 手动触发 NPM 包同步任务
  fastify.post(
    `${options.prefix}/task/npm-package-sync`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '手动触发 NPM 包同步任务',
        body: {
          type: 'object',
          properties: {
            targetId: { type: 'string', description: '指定同步的包 ID，不传则同步所有' }
          }
        }
      }
    },
    async request => {
      const { targetId } = request.body || {};
      const task = await services.task.createNpmPackageSyncTask({ targetId: targetId || 'all' });
      return {
        success: true,
        taskId: task.id,
        message: 'NPM 包同步任务已创建'
      };
    }
  );
});
