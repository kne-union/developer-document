const fp = require('fastify-plugin');

const PACKAGE_TYPES = new Set(['frontend', 'nodejs', 'engineering', 'miniprogram', 'prompts', 'other']);

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

const resolvePackageType = type => (PACKAGE_TYPES.has(type) ? type : null);

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const triggerNpmPackageSync = async ({ packageName, version, registry, type }) => {
    if (!packageName) {
      throw new Error('packageName 不能为空');
    }

    const resolvedType = resolvePackageType(type);
    let pkg = await models.npmPackage.findOne({ where: { packageName } });
    let created = false;
    let typeUpdated = false;

    if (!pkg) {
      try {
        pkg = await services.npmPackage.create({
          packageName,
          registry: registry || 'https://registry.npmjs.org',
          name: displayNameFromPackage(packageName),
          type: resolvedType || 'other',
          isPublic: true
        });
        created = true;
      } catch (error) {
        pkg = await models.npmPackage.findOne({ where: { packageName } });
        if (!pkg) {
          throw error;
        }
      }
    }

    if (pkg) {
      const patch = {};
      if (registry && registry !== pkg.registry) {
        patch.registry = registry;
      }
      // CI 显式非 other 类型始终更新（不会用 other 降级已有类型）
      if (resolvedType && resolvedType !== 'other' && pkg.type !== resolvedType) {
        patch.type = resolvedType;
        typeUpdated = true;
      }
      if (Object.keys(patch).length > 0) {
        await pkg.update(patch);
        await pkg.reload();
      }
      if (typeUpdated && pkg.type === 'frontend') {
        try {
          await services.npmPackage.deployExamples({ id: pkg.id });
        } catch (e) {
          fastify.log.warn({ err: e, packageName }, 'deployExamples after type update failed');
        }
      }
    }

    const task = await services.task.createNpmPackageSyncTask({ targetId: pkg.id, version });
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

  const triggerRemoteComponentDeploy = async ({ remote, packageName, registry, url, tpl, version }) => {
    const resolvedRemote = remote || deriveRemoteFromPackageName(packageName);
    const resolvedPackageName = packageName || (resolvedRemote ? `@kne-components/${resolvedRemote}` : '');

    if (!resolvedRemote && !resolvedPackageName) {
      throw new Error('remote 或 packageName 至少提供一个');
    }

    let component = (resolvedRemote && (await models.remoteComponent.findOne({ where: { remote: resolvedRemote } }))) || (resolvedPackageName && (await models.remoteComponent.findOne({ where: { packageName: resolvedPackageName } })));
    let created = false;

    if (!component) {
      try {
        component = await services.remoteComponent.create({
          remote: resolvedRemote || displayNameFromPackage(resolvedPackageName),
          packageName: resolvedPackageName,
          registry: registry || 'https://registry.npmjs.org',
          url: url || '',
          tpl: tpl || '',
          name: resolvedRemote || displayNameFromPackage(resolvedPackageName),
          group: 'general',
          isPublic: true
        });
        created = true;
      } catch (error) {
        component = (resolvedRemote && (await models.remoteComponent.findOne({ where: { remote: resolvedRemote } }))) || (resolvedPackageName && (await models.remoteComponent.findOne({ where: { packageName: resolvedPackageName } })));
        if (!component) {
          throw error;
        }
      }
    } else {
      const patch = {};
      if (registry) {
        patch.registry = registry;
      }
      if (url) {
        patch.url = url;
      }
      if (tpl) {
        patch.tpl = tpl;
      }
      if (resolvedPackageName && !component.packageName) {
        patch.packageName = resolvedPackageName;
      }
      if (Object.keys(patch).length > 0) {
        await component.update(patch);
        await component.reload();
      }
    }

    const task = await services.task.createRemoteComponentDeployTask({ targetId: component.id, version });
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
