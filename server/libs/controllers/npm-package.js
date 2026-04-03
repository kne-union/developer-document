const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  // 创建 npm package
  fastify.post(
    `${options.prefix}/npm-package/create`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '创建 npm package',
        body: {
          type: 'object',
          properties: {
            packageName: { type: 'string' },
            registry: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            isPublic: { type: 'boolean' }
          },
          required: ['packageName']
        }
      }
    },
    async request => {
      const pkg = await services.npmPackage.create(request.body);
      // 创建后立即触发同步任务
      try {
        await services.task.createNpmPackageSyncTask({ targetId: pkg.id });
      } catch (error) {
        console.error('触发 NPM 包同步任务失败:', error.message);
      }
      return pkg;
    }
  );

  // 更新 npm package
  fastify.post(
    `${options.prefix}/npm-package/update`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '更新 npm package',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            packageName: { type: 'string' },
            registry: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            type: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            isPublic: { type: 'boolean' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      const pkg = await services.npmPackage.update(request.body);
      // 更新后立即触发同步任务
      try {
        await services.task.createNpmPackageSyncTask({ targetId: pkg.id });
      } catch (error) {
        console.error('触发 NPM 包同步任务失败:', error.message);
      }
      return pkg;
    }
  );

  // 删除 npm package
  fastify.post(
    `${options.prefix}/npm-package/delete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '删除 npm package',
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
      await services.npmPackage.remove(request.body);
      return { success: true };
    }
  );

  // 获取 npm package 详情
  fastify.get(
    `${options.prefix}/npm-package/detail`,
    {
      schema: {
        summary: '获取 npm package 详情',
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
      return services.npmPackage.detail(request.query);
    }
  );

  // 获取 npm package 列表
  fastify.get(
    `${options.prefix}/npm-package/list`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '获取 npm package 列表',
        query: {
          type: 'object',
          properties: {
            packageName: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            keyword: { type: 'string' },
            isPublic: { type: 'boolean' },
            pageSize: { type: 'number', default: 10 },
            current: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.npmPackage.list(request.query);
    }
  );

  // 获取公开 npm package 列表
  fastify.get(
    `${options.prefix}/npm-package/public/list`,
    {
      schema: {
        summary: '获取公开 npm package 列表',
        query: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            keyword: { type: 'string' },
            pageSize: { type: 'number', default: 20 },
            current: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.npmPackage.getPublicList(request.query);
    }
  );

  // 获取 npm package 类型列表
  fastify.get(
    `${options.prefix}/npm-package/types`,
    {
      schema: {
        summary: '获取 npm package 类型列表'
      }
    },
    async () => {
      return services.npmPackage.getTypes();
    }
  );
});
