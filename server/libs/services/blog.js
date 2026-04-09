const fp = require('fastify-plugin');
const { Op, literal } = require('sequelize');

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

  const list = async ({ keyword, status, isPublic, groups, pageSize, current, createdUserId, publishTimeStart, publishTimeEnd }) => {
    const where = {};

    if (keyword) {
      where[Op.or] = ['title', 'content'].map(name => ({ [name]: { [Op.like]: `%${keyword}%` } }));
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

    if (publishTimeStart || publishTimeEnd) {
      where.publishTime = {};
      if (publishTimeStart) {
        where.publishTime[Op.gte] = publishTimeStart;
      }
      if (publishTimeEnd) {
        where.publishTime[Op.lte] = publishTimeEnd;
      }
    }

    if (groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 id
      const allGroupIds = [];
      for (const groupId of groups) {
        const descendantIds = await fastify.group.services.getDescendantIds({ id: groupId, type: 'blog' });
        allGroupIds.push(...descendantIds);
      }
      // 去重
      const uniqueGroupIds = [...new Set(allGroupIds)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符
      where[Op.and] = [literal(`(${uniqueGroupIds.map(id => `groups @> '[{"id":"${id}"}]'`).join(' OR ')})`)];
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

  const getPublicList = async ({ keyword, groups, pageSize, current }) => {
    const where = {
      status: 'published',
      isPublic: true
    };

    if (keyword) {
      where[Op.or] = ['title', 'content'].map(name => ({ [name]: { [Op.like]: `%${keyword}%` } }));
    }

    if (groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 id
      const allGroupIds = [];
      for (const groupId of groups) {
        const descendantIds = await fastify.group.services.getDescendantIds({ id: groupId, type: 'blog' });
        allGroupIds.push(...descendantIds);
      }
      // 去重
      const uniqueGroupIds = [...new Set(allGroupIds)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符
      where[Op.and] = [literal(`(${uniqueGroupIds.map(id => `groups @> '[{"id":"${id}"}]'`).join(' OR ')})`)];
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
