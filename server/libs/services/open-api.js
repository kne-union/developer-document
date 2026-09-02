const fp = require('fastify-plugin');

const displayNameFromPackage = packageName => {
  if (!packageName) {
    return '';
  }
  return packageName.includes('/') ? packageName.split('/').slice(1).join('/') : packageName.replace(/^@/, '');
};

const deriveRemoteFromPackageName = packageName => {
  if (!packageName) {
    return '';
  }
  return packageName.includes('/') ? packageName.split('/').slice(1).join('/') : packageName.replace(/^@/, '');
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const triggerNpmPackageSync = async ({ packageName, version, registry, type }) => {
    if (!packageName) {
      throw new Error('packageName 不能为空');
    }

    const PACKAGE_TYPES = new Set(['frontend', 'nodejs', 'engineering', 'miniprogram', 'prompts', 'other']);
    const resolvedType = PACKAGE_TYPES.has(type) ? type : 'other';

    let pkg = await models.npmPackage.findOne({ where: { packageName } });
    let created = false;

    if (!pkg) {
      pkg = await services.npmPackage.create({
        packageName,
        registry: registry || 'https://registry.npmjs.org',
        name: displayNameFromPackage(packageName),
        type: resolvedType,
        isPublic: true
      });
      created = true;
    }

    const task = await services.task.createNpmPackageSyncTask({ targetId: pkg.id });
    return {
      success: true,
      created,
      taskId: task.id,
      targetId: pkg.id,
      packageName,
      version,
      type: pkg.type
    };
  };

  const triggerRemoteComponentDeploy = async ({ remote, packageName, registry }) => {
    const resolvedRemote = remote || deriveRemoteFromPackageName(packageName);
    const resolvedPackageName = packageName || (resolvedRemote ? `@kne-components/${resolvedRemote}` : '');

    if (!resolvedRemote && !resolvedPackageName) {
      throw new Error('remote 或 packageName 至少提供一个');
    }

    const where = {};
    if (resolvedRemote) {
      where.remote = resolvedRemote;
    } else {
      where.packageName = resolvedPackageName;
    }

    let component = await models.remoteComponent.findOne({ where });
    let created = false;

    if (!component) {
      component = await services.remoteComponent.create({
        remote: resolvedRemote || displayNameFromPackage(resolvedPackageName),
        packageName: resolvedPackageName,
        registry: registry || 'https://registry.npmjs.org',
        name: resolvedRemote || displayNameFromPackage(resolvedPackageName),
        group: 'general',
        isPublic: true
      });
      created = true;
    }

    const task = await services.task.createRemoteComponentDeployTask({ targetId: component.id });
    return {
      success: true,
      created,
      taskId: task.id,
      targetId: component.id,
      remote: component.remote,
      packageName: component.packageName
    };
  };

  Object.assign(services, {
    openApi: {
      triggerNpmPackageSync,
      triggerRemoteComponentDeploy
    }
  });
});
