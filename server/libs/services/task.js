const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];

  const createBlogSearchTask = async () => {
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: `知乎文章线索拉取 - ${new Date().toLocaleDateString('zh-CN')}`
      },
      // targetId 为 bigint 主键类型，系统级任务用 0 作哨兵（runner 不依赖该值）
      targetId: 0,
      targetType: 'blogSearch',
      type: 'blogSearch'
    });
    return task;
  };

  const saveBlogSearch = async ({ result, task }) => {
    console.log('知乎文章线索拉取任务完成:', result);
    return result;
  };

  const createNpmPackageSyncTask = async ({ targetId = 'all', version } = {}) => {
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: `NPM 包同步`,
        version: version || null
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

  const createRemoteComponentDeployTask = async ({ targetId = 'all', version } = {}) => {
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: `远程组件部署`,
        version: version || null
      },
      targetId,
      targetType: 'remoteComponentDeploy',
      type: 'remoteComponentDeploy'
    });
    return task;
  };

  const saveRemoteComponentDeploy = async ({ result, task }) => {
    console.log('远程组件部署任务完成:', result);
    return result;
  };

  Object.assign(services, {
    task: {
      createBlogSearchTask,
      saveBlogSearch,
      createNpmPackageSyncTask,
      saveNpmPackageSync,
      createRemoteComponentDeployTask,
      saveRemoteComponentDeploy
    }
  });
});
