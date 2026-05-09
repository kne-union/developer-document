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

  const list = async ({ keyword, status, isPublic, group, groups, perPage, currentPage, createdUserId, publishTimeStart, publishTimeEnd }) => {
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

    if (group) {
      // 根据分组 code 获取该分组及其所有后代分组的 code
      const groupCodes = await fastify.group.services.getDescendantCodes({ code: group, type: 'blog' });
      // PostgreSQL JSONB 数组查询：使用 @> 操作符按 code 匹配
      where[Op.and] = [literal(`(${groupCodes.map(code => `groups @> '[{"code":"${code}"}]'`).join(' OR ')})`)];
    }

    if (!group && groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 code
      const allGroupCodes = [];
      for (const code of groups) {
        const descendantCodes = await fastify.group.services.getDescendantCodes({ code, type: 'blog' });
        allGroupCodes.push(...descendantCodes);
      }
      // 去重
      const uniqueGroupCodes = [...new Set(allGroupCodes)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符按 code 匹配
      where[Op.and] = [literal(`(${uniqueGroupCodes.map(code => `groups @> '[{"code":"${code}"}]'`).join(' OR ')})`)];
    }

    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await models.blog.findAndCountAll({
      where,
      limit: perPage,
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

  const getPublicList = async ({ keyword, groups, perPage, currentPage }) => {
    const where = {
      status: 'published',
      isPublic: true
    };

    if (keyword) {
      where[Op.or] = ['title', 'content'].map(name => ({ [name]: { [Op.like]: `%${keyword}%` } }));
    }

    if (groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 code
      const allGroupCodes = [];
      for (const code of groups) {
        const descendantCodes = await fastify.group.services.getDescendantCodes({ code, type: 'blog' });
        allGroupCodes.push(...descendantCodes);
      }
      // 去重
      const uniqueGroupCodes = [...new Set(allGroupCodes)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符按 code 匹配
      where[Op.and] = [literal(`(${uniqueGroupCodes.map(code => `groups @> '[{"code":"${code}"}]'`).join(' OR ')})`)];
    }

    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await models.blog.findAndCountAll({
      where,
      limit: perPage,
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
      perPage,
      currentPage
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
