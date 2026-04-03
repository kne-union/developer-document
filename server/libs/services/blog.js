const fp = require('fastify-plugin');
const { Op } = require('sequelize');

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const create = async ({ title, content, status, publishTime, isPublic, groups, createdUserId }) => {
    return models.blog.create({
      title,
      content,
      status: status || 'draft',
      publishTime,
      isPublic: isPublic !== undefined ? isPublic : true,
      groups: groups || [],
      createdUserId
    });
  };

  const update = async ({ id, title, content, status, publishTime, isPublic, groups }) => {
    const blog = await models.blog.findByPk(id);
    if (!blog) {
      throw new Error('博客不存在');
    }
    return blog.update({
      title,
      content,
      status,
      publishTime,
      isPublic,
      groups
    });
  };

  const remove = async ({ id }) => {
    const blog = await models.blog.findByPk(id);
    if (!blog) {
      throw new Error('博客不存在');
    }
    return blog.destroy();
  };

  const detail = async ({ id }) => {
    return models.blog.findByPk(id, {
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone']
        }
      ]
    });
  };

  const list = async ({ title, keyword, status, isPublic, groups, pageSize, current, createdUserId }) => {
    const where = {};

    // 支持 title 和 keyword 两种搜索参数
    const searchValue = title || keyword;
    if (searchValue) {
      where.title = { [Op.like]: `%${searchValue}%` };
    }

    if (status) {
      where.status = status;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    if (createdUserId) {
      where.createdUserId = createdUserId;
    }

    if (groups && groups.length > 0) {
      // 使用 LIKE 查询 JSON 数组中的元素（兼容 SQLite 和 PostgreSQL）
      where.groups = {
        [Op.or]: groups.map(group => ({ [Op.like]: `%"${group}"%` }))
      };
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.blog.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone']
        }
      ]
    });

    return {
      totalCount: count,
      pageData: rows
    };
  };

  const publish = async ({ id, publishTime }) => {
    const blog = await models.blog.findByPk(id);
    if (!blog) {
      throw new Error('博客不存在');
    }
    return blog.update({
      status: 'published',
      publishTime: publishTime || new Date()
    });
  };

  const unpublish = async ({ id }) => {
    const blog = await models.blog.findByPk(id);
    if (!blog) {
      throw new Error('博客不存在');
    }
    return blog.update({
      status: 'draft',
      publishTime: null
    });
  };

  const getPublicList = async ({ title, groups, pageSize, current }) => {
    const where = {
      status: 'published',
      isPublic: true
    };

    if (title) {
      where.title = { [Op.like]: `%${title}%` };
    }

    if (groups && groups.length > 0) {
      // 使用 LIKE 查询 JSON 数组中的元素（兼容 SQLite 和 PostgreSQL）
      where.groups = {
        [Op.or]: groups.map(group => ({ [Op.like]: `%"${group}"%` }))
      };
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.blog.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [['publishTime', 'DESC']],
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone']
        }
      ]
    });

    return {
      total: count,
      list: rows,
      pageSize,
      current
    };
  };

  Object.assign(fastify[options.name].services, {
    blog: {
      create,
      update,
      remove,
      detail,
      list,
      publish,
      unpublish,
      getPublicList
    }
  });
});
