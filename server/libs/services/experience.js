const fp = require('fastify-plugin');
const { Op, literal } = require('sequelize');
const { createZipBuffer, parseZipBuffer } = require('../utils/kne-document-zip');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const pickContentFields = content => {
    const data = content || {};
    return {
      category: data.category || 'library',
      title: data.title || '',
      keywords: data.keywords || []
    };
  };

  const upsert = async ({ relativePath, content, userId, skipIfExists = false }) => {
    const existing = await models.experience.findOne({ where: { relativePath }, paranoid: false });
    if (existing && !existing.deletedAt && skipIfExists) {
      return { action: 'skipped', reason: 'duplicate', relativePath, id: existing.id };
    }
    if (existing && !existing.deletedAt && existing.status === 'closed') {
      throw new Error('经验已关闭，请先在管理端重新启用');
    }
    const fields = pickContentFields(content);
    if (existing) {
      const wasDeleted = !!existing.deletedAt;
      if (wasDeleted) {
        await existing.restore();
      }
      await existing.update({
        content,
        ...fields,
        status: 'active'
      });
      return { action: wasDeleted ? 'created' : 'updated', relativePath, id: existing.id, row: existing };
    }
    const row = await models.experience.create({
      relativePath,
      content,
      ...fields,
      status: 'active',
      createdUserId: userId
    });
    return { action: 'created', relativePath, id: row.id, row };
  };

  const exists = async ({ relativePath }) => {
    const row = await models.experience.findOne({
      where: { relativePath },
      attributes: ['id', 'status']
    });
    return { exists: !!row, id: row?.id, status: row?.status };
  };

  const search = async ({ query, category, limit = 3, userId, source = 'rest' }) => {
    const where = { status: 'active' };
    if (category) {
      where.category = category;
    }
    if (query) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${query}%` } }, { relativePath: { [Op.iLike]: `%${query}%` } }, literal(`"content"::text ILIKE ${fastify.sequelize.escape(`%${query}%`)}`)];
    }

    const rows = await models.experience.findAll({
      where,
      limit,
      order: [['updatedAt', 'DESC']]
    });

    const results = rows.map(row => ({
      id: row.id,
      relativePath: row.relativePath,
      category: row.category,
      title: row.title,
      problem: row.content?.problem,
      solution: row.content?.solution,
      keywords: row.keywords
    }));

    await services.searchRecord.recordSearch({
      searchType: 'experience',
      query: query || '',
      results,
      userId,
      source
    });

    return results;
  };

  const list = async ({ keyword, category, status, perPage = 20, currentPage = 1 }) => {
    const where = {};
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { relativePath: { [Op.iLike]: `%${keyword}%` } }];
    }
    const offset = (currentPage - 1) * perPage;
    const { count, rows } = await models.experience.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone', 'nickname']
        }
      ]
    });
    return { totalCount: count, pageData: rows };
  };

  const detail = async ({ id }) => {
    return models.experience.findByPk(id, {
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone', 'nickname']
        }
      ]
    });
  };

  const close = async ({ id }) => {
    const row = await models.experience.findByPk(id);
    if (!row) {
      throw new Error('经验不存在');
    }
    return row.update({ status: 'closed' });
  };

  const reopen = async ({ id }) => {
    const row = await models.experience.findByPk(id);
    if (!row) {
      throw new Error('经验不存在');
    }
    return row.update({ status: 'active' });
  };

  const remove = async ({ id }) => {
    const row = await models.experience.findByPk(id);
    if (!row) {
      throw new Error('经验不存在');
    }
    await row.destroy();
    return { success: true };
  };

  const buildExportWhere = ({ keyword, category, status }) => {
    const where = {};
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { relativePath: { [Op.iLike]: `%${keyword}%` } }];
    }
    return where;
  };

  const exportZip = async filters => {
    const rows = await models.experience.findAll({
      where: buildExportWhere(filters),
      order: [['updatedAt', 'DESC']],
      attributes: ['relativePath', 'content', 'status', 'title']
    });
    const buffer = createZipBuffer({ type: 'experience', rows, filters });
    return { buffer, count: rows.length };
  };

  const importZip = async ({ buffer, userId, skipIfExists = false, overwrite = true }) => {
    const { manifest, items } = parseZipBuffer({ buffer, expectedType: 'experience' });
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    for (const item of items) {
      try {
        const existing = await models.experience.findOne({ where: { relativePath: item.relativePath } });
        if (existing && (skipIfExists || !overwrite)) {
          summary.skipped += 1;
          continue;
        }
        if (existing && existing.status === 'closed' && overwrite) {
          await existing.update({ status: 'active' });
        }

        const result = await upsert({
          relativePath: item.relativePath,
          content: item.content,
          userId,
          skipIfExists: false
        });

        if (item.status === 'closed' && result.id) {
          await models.experience.update({ status: 'closed' }, { where: { id: result.id } });
        }

        if (result.action === 'created') {
          summary.created += 1;
        } else if (result.action === 'updated') {
          summary.updated += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (err) {
        summary.failed += 1;
        summary.errors.push({ relativePath: item.relativePath, message: err.message });
      }
    }

    return { manifest, summary, total: items.length };
  };

  Object.assign(services, {
    experience: {
      upsert,
      search,
      list,
      detail,
      close,
      reopen,
      remove,
      exists,
      exportZip,
      importZip
    }
  });
});
