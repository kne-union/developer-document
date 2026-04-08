const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;

  // 创建远程组件
  fastify.post(
    `${options.prefix}/remote-component/create`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '创建远程组件',
        body: {
          type: 'object',
          properties: {
            remote: { type: 'string' },
            url: { type: 'string' },
            packageName: { type: 'string' },
            registry: { type: 'string' },
            tpl: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            group: { type: 'string' },
            versions: { type: 'array', items: { type: 'string' } },
            defaultVersion: { type: 'string' },
            isPublic: { type: 'boolean' }
          },
          required: ['remote']
        }
      }
    },
    async request => {
      const component = await services.remoteComponent.create(request.body);
      // 创建后触发部署任务
      if (component.packageName) {
        try {
          await services.task.createRemoteComponentDeployTask({ targetId: component.id });
        } catch (error) {
          console.error('触发远程组件部署任务失败:', error.message);
        }
      }
      return component;
    }
  );

  // 更新远程组件
  fastify.post(
    `${options.prefix}/remote-component/update`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '更新远程组件',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            remote: { type: 'string' },
            url: { type: 'string' },
            packageName: { type: 'string' },
            registry: { type: 'string' },
            tpl: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            group: { type: 'string' },
            versions: { type: 'array', items: { type: 'string' } },
            defaultVersion: { type: 'string' },
            isPublic: { type: 'boolean' }
          },
          required: ['id']
        }
      }
    },
    async request => {
      const component = await services.remoteComponent.update(request.body);
      // 更新后触发部署任务
      if (component.packageName) {
        try {
          await services.task.createRemoteComponentDeployTask({ targetId: component.id });
        } catch (error) {
          console.error('触发远程组件部署任务失败:', error.message);
        }
      }
      return component;
    }
  );

  // 删除远程组件
  fastify.post(
    `${options.prefix}/remote-component/delete`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '删除远程组件',
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
      await services.remoteComponent.remove(request.body);
      return { success: true };
    }
  );

  // 获取远程组件详情
  fastify.get(
    `${options.prefix}/remote-component/detail`,
    {
      schema: {
        summary: '获取远程组件详情',
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
      return services.remoteComponent.detail(request.query);
    }
  );

  // 获取远程组件列表
  fastify.get(
    `${options.prefix}/remote-component/list`,
    {
      onRequest: [authenticate.user, authenticate.admin],
      schema: {
        summary: '获取远程组件列表',
        query: {
          type: 'object',
          properties: {
            remote: { type: 'string' },
            name: { type: 'string' },
            keyword: { type: 'string' },
            group: { type: 'string' },
            isPublic: { type: 'boolean' },
            pageSize: { type: 'number', default: 10 },
            current: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.remoteComponent.list(request.query);
    }
  );

  // 获取公开远程组件列表
  fastify.get(
    `${options.prefix}/remote-component/public/list`,
    {
      schema: {
        summary: '获取公开远程组件列表',
        query: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            group: { type: 'string' },
            pageSize: { type: 'number', default: 20 },
            current: { type: 'number', default: 1 }
          }
        }
      }
    },
    async request => {
      return services.remoteComponent.getPublicList(request.query);
    }
  );
});
