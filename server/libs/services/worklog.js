const fp = require('fastify-plugin');
const { Op, fn, col, where: sequelizeWhere } = require('sequelize');
const { createZipBuffer, parseZipBuffer } = require('../utils/kne-document-zip');
const { buildPathTree } = require('../utils/kne-document-path-tree');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const projectNameExpr = () => fn('jsonb_extract_path_text', col('content'), 'project', 'name');

  const upsert = async ({ relativePath, content, userId, skipIfExists = false }) => {
    const existing = await models.worklog.findOne({ where: { relativePath }, paranoid: false });
    const title = content?.title || '';
    const writtenAt = content?.writtenAt ? new Date(content.writtenAt) : new Date();

    if (existing && !existing.deletedAt && skipIfExists) {
      return { action: 'skipped', reason: 'duplicate', relativePath, id: existing.id };
    }

    if (existing) {
      const wasDeleted = !!existing.deletedAt;
      if (wasDeleted) {
        await existing.restore();
      }
      await existing.update({ content, title, writtenAt });
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

  const buildListWhere = ({ keyword, projectName, createdUserId, writtenAtStart, writtenAtEnd, pathPrefix }) => {
    const where = {};
    if (createdUserId) {
      where.createdUserId = createdUserId;
    }
    if (projectName) {
      where[Op.and] = [...(where[Op.and] || []), sequelizeWhere(projectNameExpr(), { [Op.iLike]: `%${projectName}%` })];
    }
    if (pathPrefix) {
      where.relativePath = { [Op.like]: `${pathPrefix}%` };
    }
    if (keyword) {
      where[Op.or] = [{ title: { [Op.iLike]: `%${keyword}%` } }, { relativePath: { [Op.iLike]: `%${keyword}%` } }, sequelizeWhere(projectNameExpr(), { [Op.iLike]: `%${keyword}%` })];
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

  const list = async ({ keyword, projectName, createdUserId, writtenAtStart, writtenAtEnd, pathPrefix, perPage = 20, currentPage = 1 }) => {
    const where = buildListWhere({ keyword, projectName, createdUserId, writtenAtStart, writtenAtEnd, pathPrefix });

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

  const pathTree = async () => {
    const rows = await models.worklog.findAll({
      attributes: ['relativePath'],
      raw: true
    });
    return buildPathTree(rows.map(row => row.relativePath));
  };

  const filterOptions = async () => {
    const rows = await models.worklog.findAll({
      attributes: [[fn('DISTINCT', projectNameExpr()), 'projectName']],
      where: {
        [Op.and]: [sequelizeWhere(projectNameExpr(), { [Op.ne]: null }), sequelizeWhere(projectNameExpr(), { [Op.ne]: '' })]
      },
      raw: true
    });
    return {
      projectNames: rows
        .map(row => row.projectName)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    };
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

  const resolveByPaths = async ({ relativePaths }) => {
    const paths = [...new Set((Array.isArray(relativePaths) ? relativePaths : []).map(item => String(item || '').trim()).filter(Boolean))];
    if (!paths.length) {
      return { items: [] };
    }

    const rows = await models.worklog.findAll({
      where: { relativePath: { [Op.in]: paths } },
      attributes: ['id', 'relativePath', 'title']
    });
    const byPath = Object.fromEntries(rows.map(row => [row.relativePath, row]));

    return {
      items: paths.map(relativePath => ({
        relativePath,
        id: byPath[relativePath]?.id ?? null,
        title: byPath[relativePath]?.title ?? null
      }))
    };
  };

  const buildExportWhere = filters => buildListWhere(filters);

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
      pathTree,
      filterOptions,
      resolveByPaths,
      exportZip,
      importZip
    }
  });
});
