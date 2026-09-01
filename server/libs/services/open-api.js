const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const triggerNpmPackageSync = async ({ packageName, version, registry }) => {
    const where = { packageName };
    if (registry) {
      where.registry = registry;
    }
    const pkg = await models.npmPackage.findOne({ where });
    if (!pkg) {
      const err = new Error(`未找到 npm 包: ${packageName}`);
      err.statusCode = 404;
      throw err;
    }
    const task = await services.task.createNpmPackageSyncTask({ targetId: pkg.id });
    return { success: true, taskId: task.id, targetId: pkg.id, packageName, version };
  };

  const triggerRemoteComponentDeploy = async ({ remote, packageName }) => {
    const where = {};
    if (remote) {
      where.remote = remote;
    } else if (packageName) {
      where.packageName = packageName;
    } else {
      throw new Error('remote 或 packageName 至少提供一个');
    }
    const component = await models.remoteComponent.findOne({ where });
    if (!component) {
      const err = new Error(`未找到远程组件: ${remote || packageName}`);
      err.statusCode = 404;
      throw err;
    }
    const task = await services.task.createRemoteComponentDeployTask({ targetId: component.id });
    return { success: true, taskId: task.id, targetId: component.id, remote: component.remote };
  };

  Object.assign(services, {
    openApi: {
      triggerNpmPackageSync,
      triggerRemoteComponentDeploy
    }
  });
});
