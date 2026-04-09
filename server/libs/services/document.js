const fp = require('fastify-plugin');
const { Op, literal } = require('sequelize');

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const create = async ({ name, content, status, isPublic, groups, createdUserId }) => {
    return models.document.create({
      name,
      content,
      status: status || 'draft',
      isPublic: isPublic !== undefined ? isPublic : false,
      groups: groups || [],
      createdUserId
    });
  };

  const update = async ({ id, name, content, status, isPublic, groups }) => {
    const document = await models.document.findByPk(id);
    if (!document) {
      throw new Error('文档不存在');
    }
    return document.update({
      name,
      content,
      status,
      isPublic,
      groups
    });
  };

  const remove = async ({ id }) => {
    const document = await models.document.findByPk(id);
    if (!document) {
      throw new Error('文档不存在');
    }
    return document.destroy();
  };

  const detail = async ({ id }) => {
    return models.document.findByPk(id, {
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone']
        }
      ]
    });
  };

  const list = async ({ keyword, status, isPublic, group, pageSize, current, createdUserId, createdAtStart, createdAtEnd }) => {
    const where = {};

    if (keyword) {
      where[Op.or] = ['name', 'content'].map(name => ({ [name]: { [Op.like]: `%${keyword}%` } }));
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

    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) {
        where.createdAt[Op.gte] = createdAtStart;
      }
      if (createdAtEnd) {
        where.createdAt[Op.lte] = createdAtEnd;
      }
    }

    if (group) {
      // 获取该分组及其所有后代分组的 id
      const groupIds = await fastify.group.services.getDescendantIds({ id: group, type: 'document' });
      // PostgreSQL JSONB 数组查询：使用 @> 操作符
      where[Op.and] = [literal(`(${groupIds.map(id => `groups @> '[{"id":"${id}"}]'`).join(' OR ')})`)];
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.document.findAndCountAll({
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

  const publish = async ({ id }) => {
    const document = await models.document.findByPk(id);
    if (!document) {
      throw new Error('文档不存在');
    }
    return document.update({
      status: 'published'
    });
  };

  const unpublish = async ({ id }) => {
    const document = await models.document.findByPk(id);
    if (!document) {
      throw new Error('文档不存在');
    }
    return document.update({
      status: 'draft'
    });
  };

  const getPublicList = async ({ keyword, groups, pageSize, current }) => {
    const where = {
      status: 'published',
      isPublic: true
    };

    if (keyword) {
      where[Op.or] = ['name', 'content'].map(name => ({ [Op.like]: { [name]: `%${keyword}%` } }));
    }

    if (groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 id
      const allGroupIds = [];
      for (const groupId of groups) {
        const descendantIds = await fastify.group.services.getDescendantIds({ id: groupId, type: 'document' });
        allGroupIds.push(...descendantIds);
      }
      // 去重
      const uniqueGroupIds = [...new Set(allGroupIds)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符
      where[Op.and] = [literal(`(${uniqueGroupIds.map(id => `groups @> '[{"id":"${id}"}]'`).join(' OR ')})`)];
    }

    const offset = (current - 1) * pageSize;

    const { count, rows } = await models.document.findAndCountAll({
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
      total: count,
      list: rows,
      pageSize,
      current
    };
  };

  Object.assign(fastify[options.name].services, {
    document: {
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
