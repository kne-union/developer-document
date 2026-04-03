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
    if (/^@kne\//.test(pkg.packageName)) {
      for (let currentVersion of Object.keys(npmInfo.versions)) {
        const packageName = `@kne-components/${npmInfo.name}@${currentVersion}`;
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

  const list = async ({ packageName, name, type, keyword, isPublic, pageSize, current }) => {
    const where = {};

    const searchValue = packageName || name || keyword;
    if (searchValue) {
      where[Op.or] = [{ packageName: { [Op.like]: `%${searchValue}%` } }, { name: { [Op.like]: `%${searchValue}%` } }];
    }

    if (type) {
      where.type = type;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.npmPackage.findAndCountAll({
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

  const getPublicList = async ({ type, keyword, pageSize, current }) => {
    const where = {
      isPublic: true
    };

    if (type) {
      where.type = type;
    }

    if (keyword) {
      where[Op.or] = [{ packageName: { [Op.like]: `%${keyword}%` } }, { name: { [Op.like]: `%${keyword}%` } }, { description: { [Op.like]: `%${keyword}%` } }];
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
