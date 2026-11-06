const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { buildInstallManifest } = require('../utils/skillAssetFormat');

const TYPE_VALUES = ['rule', 'skill'];

const toList = value => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，\s]+/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const creatorInclude = {
    model: fastify.account.models.user,
    as: 'createdUser',
    attributes: ['id', 'email', 'phone', 'nickname']
  };

  const buildWhere = ({ keyword, type, category, status, createdUserId, source }) => {
    const where = {};
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (createdUserId) {
      where.createdUserId = createdUserId;
    }
    if (source) {
      where.source = source;
    }
    if (keyword) {
      // content 是 TEXT，直接 iLike；name/title/description 一并参与关键词匹配
      where[Op.or] = [{ name: { [Op.iLike]: `%${keyword}%` } }, { title: { [Op.iLike]: `%${keyword}%` } }, { description: { [Op.iLike]: `%${keyword}%` } }, { content: { [Op.iLike]: `%${keyword}%` } }];
    }
    return where;
  };

  const list = async ({ keyword, type, category, status, createdUserId, source, perPage = 20, currentPage = 1 } = {}) => {
    const where = buildWhere({ keyword, type, category, status, createdUserId, source });
    const offset = (currentPage - 1) * perPage;
    const { count, rows } = await models.skillAsset.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [['updatedAt', 'DESC']],
      include: [creatorInclude]
    });
    return { totalCount: count, pageData: rows };
  };

  const detail = async ({ id }) => {
    if (!id) {
      throw new Error('缺少 id');
    }
    return models.skillAsset.findByPk(id, { include: [creatorInclude] });
  };

  const get = async ({ id, type, name }) => {
    if (id) {
      return detail({ id });
    }
    if (!name) {
      throw new Error('id 或 name 至少提供一个');
    }
    return models.skillAsset.findOne({
      where: Object.assign({ name }, type ? { type } : {}),
      include: [creatorInclude]
    });
  };

  const buildFields = input => {
    const data = {};
    if (input.type !== undefined) {
      data.type = input.type;
    }
    if (input.name !== undefined) {
      data.name = String(input.name).trim();
    }
    if (input.title !== undefined) {
      data.title = input.title;
    }
    if (input.description !== undefined) {
      data.description = input.description;
    }
    if (input.alwaysApply !== undefined) {
      data.alwaysApply = !!input.alwaysApply;
    }
    if (input.globs !== undefined) {
      data.globs = toList(input.globs);
    }
    if (input.category !== undefined) {
      data.category = input.category;
    }
    if (input.keywords !== undefined) {
      data.keywords = toList(input.keywords);
    }
    if (input.content !== undefined) {
      data.content = input.content;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.source !== undefined) {
      data.source = input.source;
    }
    return data;
  };

  const create = async ({ userId, ...input }) => {
    const data = buildFields(input);
    const type = data.type || 'skill';
    if (!TYPE_VALUES.includes(type)) {
      throw new Error('type 必须是 rule 或 skill');
    }
    if (!data.name) {
      throw new Error('name 不能为空');
    }
    const existed = await models.skillAsset.findOne({ where: { type, name: data.name } });
    if (existed) {
      throw new Error(`${type === 'rule' ? '规则' : '技能'}「${data.name}」已存在`);
    }
    return models.skillAsset.create(Object.assign({}, data, { type, createdUserId: userId }));
  };

  const update = async ({ id, ...input }) => {
    if (!id) {
      throw new Error('缺少 id');
    }
    const row = await models.skillAsset.findByPk(id);
    if (!row) {
      throw new Error('技能/规则不存在');
    }
    // type 与 name 构成唯一键，不允许在编辑时修改
    const data = buildFields(input);
    delete data.type;
    delete data.name;
    return row.update(data);
  };

  // 供 MCP 使用：按 type + name 幂等写入（存在则更新，不存在则创建）
  const upsert = async ({ userId, ...input }) => {
    const data = buildFields(input);
    const type = data.type || 'skill';
    if (!TYPE_VALUES.includes(type)) {
      throw new Error('type 必须是 rule 或 skill');
    }
    if (!data.name) {
      throw new Error('name 不能为空');
    }
    const row = await models.skillAsset.findOne({ where: { type, name: data.name } });
    if (row) {
      const patch = Object.assign({}, data);
      delete patch.type;
      delete patch.name;
      await row.update(patch);
      return { action: 'updated', id: row.id, type, name: row.name };
    }
    const created = await models.skillAsset.create(Object.assign({}, data, { type, createdUserId: userId }));
    return { action: 'created', id: created.id, type, name: created.name };
  };

  const setStatus = async ({ id }, status) => {
    if (!id) {
      throw new Error('缺少 id');
    }
    const row = await models.skillAsset.findByPk(id);
    if (!row) {
      throw new Error('技能/规则不存在');
    }
    return row.update({ status });
  };

  const close = async ({ id }) => setStatus({ id }, 'closed');
  const reopen = async ({ id }) => setStatus({ id }, 'active');

  const remove = async ({ id }) => {
    if (!id) {
      throw new Error('缺少 id');
    }
    const row = await models.skillAsset.findByPk(id);
    if (!row) {
      throw new Error('技能/规则不存在');
    }
    await row.destroy();
    return { success: true };
  };

  const search = async ({ query, type, category, limit = 5 } = {}) => {
    const where = buildWhere({ keyword: query, type, category, status: 'active' });
    const rows = await models.skillAsset.findAll({
      where,
      limit,
      order: [['updatedAt', 'DESC']]
    });
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      title: row.title,
      description: row.description,
      category: row.category,
      alwaysApply: row.alwaysApply,
      globs: row.globs,
      keywords: row.keywords,
      snippet: String(row.content || '').slice(0, 800)
    }));
  };

  // 按安装目标导出安装清单：默认只导出 active，供 REST / MCP / CLI 共用
  const exportForTarget = async ({ target, type, name, category, includeClosed = false } = {}) => {
    const where = {};
    if (!includeClosed) {
      where.status = 'active';
    }
    if (type) {
      where.type = type;
    }
    if (name) {
      where.name = name;
    }
    if (category) {
      where.category = category;
    }
    const rows = await models.skillAsset.findAll({
      where,
      order: [
        ['type', 'ASC'],
        ['name', 'ASC']
      ]
    });
    return buildInstallManifest({ rows, target, includeClosed: !!includeClosed });
  };

  Object.assign(services, {
    skillAsset: {
      list,
      detail,
      get,
      create,
      update,
      upsert,
      close,
      reopen,
      remove,
      search,
      exportForTarget
    }
  });
});
