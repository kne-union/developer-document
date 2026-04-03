const fp = require('fastify-plugin');

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

  Object.assign(fastify[options.name].services, {
    remoteComponent: {
      create,
      update,
      remove,
      detail,
      list,
      getPublicList,
      getGroups
    }
  });
});
