const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];

  const createBlogSearchTask = async () => {
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: `每日博客内容搜索 - ${new Date().toLocaleDateString('zh-CN')}`
      },
      targetId: 'system',
      targetType: 'blogSearch',
      type: 'blogSearch'
    });
    return task;
  };

  const saveBlogSearch = async ({ result, task }) => {
    console.log('博客搜索任务完成:', result);
    return result;
  };

  const createNpmPackageSyncTask = async ({ targetId = 'all' } = {}) => {
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: `NPM 包同步`
      },
      targetId,
      targetType: 'npmPackageSync',
      type: 'npmPackageSync'
    });
    return task;
  };

  const saveNpmPackageSync = async ({ result, task }) => {
    console.log('NPM 包同步任务完成:', result);
    return result;
  };

  Object.assign(services, {
    task: {
      createBlogSearchTask,
      saveBlogSearch,
      createNpmPackageSyncTask,
      saveNpmPackageSync
    }
  });
});
