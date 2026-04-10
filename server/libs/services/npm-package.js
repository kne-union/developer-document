const fp = require('fastify-plugin');
const fs = require('fs-extra');
const path = require('node:path');
const loadNpmInfo = require('@kne/load-npm-info');
const { deployPackage } = require('@kne/npm-tools');

const PACKAGE_TYPES = [
  { value: 'frontend', label: '前端组件' },
  { value: 'nodejs', label: 'NodeJS' },
  { value: 'engineering', label: '工程化' },
  { value: 'miniprogram', label: '小程序' },
  { value: 'prompts', label: 'Prompts' },
  { value: 'other', label: '其他' }
];

const outputPath = path.resolve(process.cwd(), 'build');

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const create = async ({ packageName, registry, name, description, type, keywords, isPublic }) => {
    return models.npmPackage.create({
      packageName,
      registry,
      name,
      description,
      type: type || 'other',
      keywords: keywords || [],
      repositoryData: [],
      isPublic: isPublic !== undefined ? isPublic : true
    });
  };

  const update = async ({ id, packageName, registry, name, description, type, keywords, isPublic }) => {
    const pkg = await models.npmPackage.findByPk(id);
    if (!pkg) {
      throw new Error('npm package 不存在');
    }
    return pkg.update({
      packageName,
      registry,
      name,
      description,
      type,
      keywords,
      isPublic
    });
  };

  const remove = async ({ id }) => {
    const pkg = await models.npmPackage.findByPk(id);
    if (!pkg) {
      throw new Error('npm package 不存在');
    }
    try {
      await fs.remove(path.resolve(outputPath, pkg.packageName));
    } catch (e) {}
    return pkg.destroy();
  };

  const deployExamples = async ({ id }) => {
    const pkg = await models.npmPackage.findByPk(id);
    if (!pkg) {
      return;
    }
    if (pkg.type !== 'frontend') {
      return;
    }
    let examples = [];
    const npmInfo = await loadNpmInfo(pkg.packageName, { registry: pkg.registry });
    await fs.ensureDir(path.resolve(outputPath, pkg.packageName));
    if (/^@kne\//.test(pkg.packageName)) {
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
        if (await fs.exists(path.resolve(outputPath, `@kne-components/${npmInfo.name}/${currentVersion}/package.json`))) {
          examples.push(currentVersion);
          continue;
        }
        try {
          await deployPackage(packageName, { registry: pkg.registry, output: outputPath });
          examples.push(currentVersion);
        } catch (e) {}
      }
    }
    await pkg.update({
      examples
    });
  };

  const detail = async ({ id }) => {
    const pkg = await models.npmPackage.findByPk(id);
    if (!pkg) {
      throw new Error('npm package 不存在');
    }
    return pkg;
  };

  const list = async ({ type, keyword, isPublic, perPage, currentPage }) => {
    const where = {};

    if (keyword) {
      where[Op.or] = ['packageName', 'name', 'description', 'readme', 'registry'].map(field => ({ [field]: { [Op.like]: `%${keyword}%` } }));
    }

    if (type) {
      where.type = type;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await models.npmPackage.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const getPublicList = async ({ type, keyword, perPage, currentPage }) => {
    const where = {
      isPublic: true
    };

    if (type) {
      where.type = type;
    }

    if (keyword) {
      where[Op.or] = ['packageName', 'name', 'description', 'readme', 'registry'].map(field => ({ [field]: { [Op.like]: `%${keyword}%` } }));
    }

    // 查询所有符合条件的数据，然后在应用层过滤
    const { rows, count } = await models.npmPackage.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const getTypes = () => {
    return PACKAGE_TYPES;
  };

  Object.assign(fastify[options.name].services, {
    npmPackage: {
      create,
      update,
      remove,
      detail,
      list,
      getPublicList,
      getTypes,
      deployExamples
    }
  });
});
