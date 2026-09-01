const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { createZipBuffer, parseZipBuffer } = require('../utils/kne-document-zip');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const upsert = async ({ relativePath, content, userId, skipIfExists = false }) => {
    const existing = await models.worklog.findOne({ where: { relativePath }, paranoid: false });
    const title = content?.title || '';
    const projectName = content?.project?.name || '';
    const writtenAt = content?.writtenAt ? new Date(content.writtenAt) : new Date();

    if (existing && !existing.deletedAt && skipIfExists) {
      return { action: 'skipped', reason: 'duplicate', relativePath, id: existing.id };
    }

    if (existing) {
      const wasDeleted = !!existing.deletedAt;
      if (wasDeleted) {
        await existing.restore();
      }
      await existing.update({ content, title, projectName, writtenAt });
      return {
        action: wasDeleted ? 'created' : 'updated',
        relativePath,
        id: existing.id,
        row: existing
      };
    }
    const row = await models.worklog.create({
      relativePath,
      content,
      title,
      projectName,
      writtenAt,
      createdUserId: userId
    });
    return { action: 'created', relativePath, id: row.id, row };
  };

  const exists = async ({ relativePath }) => {
    const row = await models.worklog.findOne({
      where: { relativePath },
      attributes: ['id']
    });
    return { exists: !!row, id: row?.id };
  };

  const list = async ({ keyword, projectName, createdUserId, writtenAtStart, writtenAtEnd, perPage = 20, currentPage = 1 }) => {
    const where = {};
    if (createdUserId) {
      where.createdUserId = createdUserId;
    }
    if (projectName) {
      where.projectName = { [Op.iLike]: `%${projectName}%` };
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { relativePath: { [Op.iLike]: `%${keyword}%` } }, { projectName: { [Op.iLike]: `%${keyword}%` } }];
    }
    if (writtenAtStart || writtenAtEnd) {
      where.writtenAt = {};
      if (writtenAtStart) {
        where.writtenAt[Op.gte] = writtenAtStart;
      }
      if (writtenAtEnd) {
        where.writtenAt[Op.lte] = writtenAtEnd;
      }
    }

    const offset = (currentPage - 1) * perPage;
    const { count, rows } = await models.worklog.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [
        ['writtenAt', 'DESC'],
        ['updatedAt', 'DESC']
      ],
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
    return models.worklog.findByPk(id, {
      include: [
        {
          model: fastify.account.models.user,
          as: 'createdUser',
          attributes: ['id', 'email', 'phone', 'nickname']
        }
      ]
    });
  };

  const buildExportWhere = ({ keyword, projectName, createdUserId, writtenAtStart, writtenAtEnd }) => {
    const where = {};
    if (createdUserId) {
      where.createdUserId = createdUserId;
    }
    if (projectName) {
      where.projectName = { [Op.iLike]: `%${projectName}%` };
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { relativePath: { [Op.iLike]: `%${keyword}%` } }, { projectName: { [Op.iLike]: `%${keyword}%` } }];
    }
    if (writtenAtStart || writtenAtEnd) {
      where.writtenAt = {};
      if (writtenAtStart) {
        where.writtenAt[Op.gte] = writtenAtStart;
      }
      if (writtenAtEnd) {
        where.writtenAt[Op.lte] = writtenAtEnd;
      }
    }
    return where;
  };

  const exportZip = async filters => {
    const rows = await models.worklog.findAll({
      where: buildExportWhere(filters),
      order: [
        ['writtenAt', 'DESC'],
        ['updatedAt', 'DESC']
      ],
      attributes: ['relativePath', 'content', 'title']
    });
    const buffer = createZipBuffer({ type: 'worklog', rows, filters });
    return { buffer, count: rows.length };
  };

  const importZip = async ({ buffer, userId, skipIfExists = false, overwrite = true }) => {
    const { manifest, items } = parseZipBuffer({ buffer, expectedType: 'worklog' });
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    for (const item of items) {
      try {
        const existing = await models.worklog.findOne({ where: { relativePath: item.relativePath } });
        if (existing && (skipIfExists || !overwrite)) {
          summary.skipped += 1;
          continue;
        }

        const result = await upsert({
          relativePath: item.relativePath,
          content: item.content,
          userId,
          skipIfExists: false
        });

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
    worklog: {
      upsert,
      list,
      detail,
      exists,
      exportZip,
      importZip
    }
  });
});
