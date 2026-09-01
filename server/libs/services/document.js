const fp = require('fastify-plugin');
const { Op, literal } = require('sequelize');
const { ftsWhere, ftsOrder, ftsHeadline } = require('../utils/fts');

const buildDocumentSearchText = ({ name, content }) => [name || '', content || ''].join('\n').trim();

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const searchTextColumn = models.document.rawAttributes.searchText.field;

  const create = async (userInfo, { name, content, status, isPublic, groups }) => {
    return models.document.create({
      name,
      content,
      searchText: buildDocumentSearchText({ name, content }),
      status: status || 'draft',
      isPublic: isPublic !== undefined ? isPublic : false,
      groups: groups || [],
      createdUserId: userInfo.id
    });
  };

  const update = async ({ id, name, content, status, isPublic, groups }) => {
    const document = await models.document.findByPk(id);
    if (!document) {
      throw new Error('文档不存在');
    }
    const nextName = name !== undefined ? name : document.name;
    const nextContent = content !== undefined ? content : document.content;
    return document.update({
      name,
      content,
      status,
      isPublic,
      groups,
      searchText: buildDocumentSearchText({ name: nextName, content: nextContent })
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

  const list = async ({ keyword, status, isPublic, group, perPage, currentPage, createdUserId, createdAtStart, createdAtEnd }) => {
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
      // 根据分组 code 获取该分组及其所有后代分组的 code
      const groupCodes = await fastify.group.services.getDescendantCodes({ code: group, type: 'document' });
      // PostgreSQL JSONB 数组查询：使用 @> 操作符按 code 匹配
      where[Op.and] = [literal(`(${groupCodes.map(code => `groups @> '[{"code":"${code}"}]'`).join(' OR ')})`)];
    }

    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await models.document.findAndCountAll({
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

  const getPublicList = async ({ keyword, groups, perPage, currentPage }) => {
    const where = {
      status: 'published',
      isPublic: true
    };

    if (keyword) {
      where[Op.or] = ['name', 'content'].map(name => ({ [Op.like]: { [name]: `%${keyword}%` } }));
    }

    if (groups && groups.length > 0) {
      // 获取所有分组及其后代分组的 code
      const allGroupCodes = [];
      for (const code of groups) {
        const descendantCodes = await fastify.group.services.getDescendantCodes({ code, type: 'document' });
        allGroupCodes.push(...descendantCodes);
      }
      // 去重
      const uniqueGroupCodes = [...new Set(allGroupCodes)];
      // PostgreSQL JSONB 数组查询：使用 @> 操作符按 code 匹配
      where[Op.and] = [literal(`(${uniqueGroupCodes.map(code => `groups @> '[{"code":"${code}"}]'`).join(' OR ')})`)];
    }

    const offset = (currentPage - 1) * perPage;

    const { count, rows } = await models.document.findAndCountAll({
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
      total: count,
      list: rows,
      perPage,
      currentPage
    };
  };

  const searchByFts = async ({ query, limit = 3, userId, source = 'rest' }) => {
    if (!query) {
      return [];
    }
    const rows = await models.document.findAll({
      where: ftsWhere(searchTextColumn),
      limit,
      order: ftsOrder(searchTextColumn),
      bind: { query },
      attributes: {
        include: [[ftsHeadline(searchTextColumn), 'snippet']]
      }
    });

    const results = rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      isPublic: row.isPublic,
      snippet: row.get('snippet')
    }));

    await services.searchRecord.recordSearch({
      searchType: 'document',
      query,
      results,
      userId,
      source
    });

    return results;
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
      getPublicList,
      searchByFts
    }
  });
});
