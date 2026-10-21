const fp = require('fastify-plugin');
const { nextVersionRetryDelay } = require('../utils/retry');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

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

  const buildTaskName = ({ title, target, version, source, retryDelay }) => {
    const targetLabel = target ? `${target}${version ? `@${version}` : ''}` : '全部';
    return `${title} - ${targetLabel}${source === 'ci' ? '（CI 发布）' : ''}${retryDelay ? '（版本未就绪重试）' : ''}`;
  };

  const createNpmPackageSyncTask = async ({ targetId = 'all', version, source, retryDelay } = {}) => {
    const pkg = targetId === 'all' ? null : await models.npmPackage.findByPk(targetId);
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: buildTaskName({ title: 'NPM 包同步', target: pkg && pkg.packageName, version, source, retryDelay }),
        version: version || null,
        source: source || null,
        retryDelay: retryDelay || null
      },
      delay: retryDelay || 0,
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

  const createRemoteComponentDeployTask = async ({ targetId = 'all', version, source, retryDelay } = {}) => {
    const component = targetId === 'all' ? null : await models.remoteComponent.findByPk(targetId);
    const task = await fastify.task.services.create({
      runnerType: 'system',
      input: {
        name: buildTaskName({ title: '远程组件部署', target: component && (component.packageName || component.remote), version, source, retryDelay }),
        version: version || null,
        source: source || null,
        retryDelay: retryDelay || null
      },
      delay: retryDelay || 0,
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

  const versionRetryCreators = {
    npmPackageSync: createNpmPackageSyncTask,
    remoteComponentDeploy: createRemoteComponentDeployTask
  };

  // 目标版本未就绪（npm 发布延迟）时新建同类任务延后重试；原任务结果不受影响
  const scheduleVersionRetry = async ({ task }) => {
    const version = task.input?.version;
    const create = versionRetryCreators[task.type];
    if (!version || task.targetId === 'all' || !create) {
      return null;
    }
    const retryDelay = nextVersionRetryDelay(task.input?.retryDelay);
    if (!retryDelay) {
      return null;
    }
    const retryTask = await create({ targetId: task.targetId, version, source: task.input?.source, retryDelay });
    return { taskId: retryTask.id, retryDelay };
  };

  Object.assign(services, {
    task: {
      createBlogSearchTask,
      saveBlogSearch,
      createNpmPackageSyncTask,
      saveNpmPackageSync,
      createRemoteComponentDeployTask,
      saveRemoteComponentDeploy,
      scheduleVersionRetry
    }
  });
});
