const fp = require('fastify-plugin');
const fs = require('fs-extra');
const path = require('node:path');
const loadNpmInfo = require('@kne/load-npm-info');
const { deployPackage } = require('@kne/npm-tools');

const outputPath = path.resolve(process.cwd(), 'build');

const GROUP_LABELS = {
  business: '业务',
  general: '通用'
};

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const create = async ({ remote, url, packageName, tpl, name, description, group, versions, defaultVersion, isPublic }) => {
    return models.remoteComponent.create({
      remote,
      url,
      packageName,
      tpl,
      name,
      description,
      group: group || 'general',
      versions: versions || [],
      defaultVersion,
      isPublic: isPublic !== undefined ? isPublic : true
    });
  };

  const update = async ({ id, remote, url, packageName, tpl, name, description, group, versions, defaultVersion, isPublic }) => {
    const component = await models.remoteComponent.findByPk(id);
    if (!component) {
      throw new Error('远程组件不存在');
    }
    return component.update({
      remote,
      url,
      packageName,
      tpl,
      name,
      description,
      group,
      versions,
      defaultVersion,
      isPublic
    });
  };

  const remove = async ({ id }) => {
    const component = await models.remoteComponent.findByPk(id);
    if (!component) {
      throw new Error('远程组件不存在');
    }

    await component.destroy();
  };

  const detail = async ({ id }) => {
    return models.remoteComponent.findByPk(id);
  };

  const list = async ({ remote, name, keyword, group, isPublic, pageSize, current }) => {
    const where = {};

    const searchValue = remote || name || keyword;
    if (searchValue) {
      where[Op.or] = [{ remote: { [Op.like]: `%${searchValue}%` } }, { name: { [Op.like]: `%${searchValue}%` } }, { packageName: { [Op.like]: `%${searchValue}%` } }];
    }

    if (group) {
      where.group = group;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.remoteComponent.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const getPublicList = async ({ keyword, group, pageSize, current }) => {
    const where = {
      isPublic: true
    };

    if (group) {
      where.group = group;
    }

    if (keyword) {
      where[Op.or] = [{ remote: { [Op.like]: `%${keyword}%` } }, { name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }, { packageName: { [Op.like]: `%${keyword}%` } }];
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.remoteComponent.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const getGroups = () => {
    return Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }));
  };

  const deployComponents = async ({ id }) => {
    const component = await models.remoteComponent.findByPk(id);
    if (!component || !component.packageName) {
      return;
    }
    let examples = [];
    const npmInfo = await loadNpmInfo(component.packageName, { registry: component.registry });
    await fs.ensureDir(path.resolve(outputPath, component.packageName));
    if (/^@kne-components\//.test(component.packageName)) {
      const allVersions = Object.keys(npmInfo.versions);

      // 按大版本分组
      const majorVersionMap = new Map();
      allVersions.forEach(version => {
        const major = version.split('.')[0];
        if (!majorVersionMap.has(major)) {
          majorVersionMap.set(major, []);
        }
        majorVersionMap.get(major).push(version);
      });

      // 获取排序后的大版本列表（降序）
      const sortedMajors = Array.from(majorVersionMap.keys()).sort((a, b) => {
        const numA = parseInt(a.replace(/^\D/, ''), 10);
        const numB = parseInt(b.replace(/^\D/, ''), 10);
        return numB - numA;
      });

      // 最多保留最近10个大版本
      const recentMajors = sortedMajors.slice(0, 10);

      // 构建要部署的版本列表
      const versionsToDeploy = [];

      recentMajors.forEach((major, index) => {
        const versions = majorVersionMap.get(major);
        // 版本排序（降序，最新的在前）
        versions.sort((a, b) => {
          const partsA = a.split('.').map(p => parseInt(p.replace(/\D/g, ''), 10) || 0);
          const partsB = b.split('.').map(p => parseInt(p.replace(/\D/g, ''), 10) || 0);
          for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            if ((partsA[i] || 0) !== (partsB[i] || 0)) {
              return (partsB[i] || 0) - (partsA[i] || 0);
            }
          }
          return 0;
        });

        if (index === 0) {
          // 最后一个大版本，最多保留5个最近小版本
          versionsToDeploy.push(...versions.slice(0, 5));
        } else {
          // 其他大版本，只保留该大版本的最后一个版本
          versionsToDeploy.push(versions[0]);
        }
      });

      for (let currentVersion of versionsToDeploy) {
        const packageName = `@kne-components/${npmInfo.name}@${currentVersion}`;
        if (await fs.pathExists(path.resolve(outputPath, `@kne-components/${npmInfo.name}/${currentVersion}/package.json`))) {
          continue;
        }
        try {
          await deployPackage(packageName, { registry: component.registry, output: outputPath });
          examples.push(currentVersion);
        } catch (e) {}
      }
    }
    await component.update({ examples });
  };

  Object.assign(fastify[options.name].services, {
    remoteComponent: {
      create,
      update,
      remove,
      detail,
      list,
      getPublicList,
      getGroups,
      deployComponents
    }
  });
});
