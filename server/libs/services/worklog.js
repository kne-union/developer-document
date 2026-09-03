const fp = require('fastify-plugin');
const { Op, fn, col, where: sequelizeWhere } = require('sequelize');
const { createZipBuffer, parseZipBuffer } = require('../utils/kne-document-zip');
const { buildPathTree } = require('../utils/kne-document-path-tree');
const { resolveWrittenAtRange, shanghaiYmd } = require('../utils/worklog-range');

const formatDay = value => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : shanghaiYmd(date);
};

const creatorLabel = user => {
  if (!user) {
    return '';
  }
  return user.nickname || user.email || user.phone || String(user.id || '');
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const userModel = fastify.account.models.user;

  const projectNameExpr = () => fn('jsonb_extract_path_text', col('content'), 'project', 'name');

  /**
   * 解析创建人：优先 createdUserId；其次 creator（id / 昵称 / 邮箱）；mine=true 用当前 MCP 用户
   * 昵称/邮箱模糊匹配到多人时返回 candidates，由调用方提示
   */
  const resolveCreator = async ({ createdUserId, creator, mine, currentUserId }) => {
    if (mine) {
      if (!currentUserId) {
        return { error: '无法解析当前用户' };
      }
      const me = await userModel.findByPk(currentUserId, { attributes: ['id', 'nickname', 'email', 'phone'] });
      return { createdUserId: currentUserId, user: me };
    }

    if (createdUserId) {
      const user = await userModel.findByPk(createdUserId, { attributes: ['id', 'nickname', 'email', 'phone'] });
      if (!user) {
        return { error: `找不到创建人 id=${createdUserId}` };
      }
      return { createdUserId, user };
    }

    const q = String(creator || '').trim();
    if (!q) {
      return { createdUserId: undefined, user: null };
    }

    if (/^\d{15,}$/.test(q)) {
      const user = await userModel.findByPk(q, { attributes: ['id', 'nickname', 'email', 'phone'] });
      if (!user) {
        return { error: `找不到创建人 id=${q}` };
      }
      return { createdUserId: user.id, user };
    }

    const rows = await userModel.findAll({
      where: {
        [Op.or]: [{ nickname: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }]
      },
      attributes: ['id', 'nickname', 'email', 'phone'],
      limit: 8
    });

    if (!rows.length) {
      return { error: `找不到创建人：${q}` };
    }
    if (rows.length > 1) {
      const exact = rows.find(row => row.nickname === q || row.email === q);
      if (!exact) {
        return {
          error: `创建人「${q}」匹配到多人，请改用 createdUserId 或更精确的昵称/邮箱`,
          candidates: rows.map(row => ({ id: row.id, nickname: row.nickname, email: row.email }))
        };
      }
      return { createdUserId: exact.id, user: exact };
    }
    return { createdUserId: rows[0].id, user: rows[0] };
  };

  const summarizeRow = row => {
    const content = row.content || {};
    return {
      id: row.id,
      relativePath: row.relativePath,
      title: row.title || content.title || '',
      writtenAt: row.writtenAt,
      project: content.project?.name || null,
      prUrl: content.pr?.url || null,
      prNumber: content.pr?.number || null,
      versionBump: content.finalSolution?.versionBump || null,
      summary: content.requirement?.summary || content.finalSolution?.summary || content.description || '',
      creator: creatorLabel(row.createdUser),
      createdUserId: row.createdUserId
    };
  };

  const renderReportMarkdown = ({ items, rangeLabel, filters }) => {
    const lines = [];
    lines.push(`# 工作日志周报素材`);
    lines.push('');
    lines.push(`时间：${rangeLabel}`);
    const filterBits = [];
    if (filters.creatorLabel) {
      filterBits.push(`创建人 ${filters.creatorLabel}`);
    }
    if (filters.projectName) {
      filterBits.push(`项目 ${filters.projectName}`);
    }
    if (filters.keyword) {
      filterBits.push(`关键词 ${filters.keyword}`);
    }
    if (filterBits.length) {
      lines.push(`筛选：${filterBits.join(' · ')}`);
    }
    lines.push(`共 ${items.length} 条`);
    lines.push('');

    if (!items.length) {
      lines.push('（无命中，可放宽时间或去掉创建人/项目筛选）');
      return lines.join('\n');
    }

    const byProject = new Map();
    items.forEach(item => {
      const key = item.project || '（未标注项目）';
      if (!byProject.has(key)) {
        byProject.set(key, []);
      }
      byProject.get(key).push(item);
    });

    [...byProject.entries()].forEach(([project, rows]) => {
      lines.push(`## ${project}`);
      rows.forEach(item => {
        const meta = [formatDay(item.writtenAt), item.creator].filter(Boolean).join(' · ');
        lines.push(`- **${item.title || '(无标题)'}**${meta ? `（${meta}）` : ''}`);
        if (item.summary) {
          lines.push(`  ${item.summary}`);
        }
        const extras = [];
        if (item.prUrl) {
          extras.push(`PR: ${item.prUrl}`);
        } else if (item.prNumber) {
          extras.push(`PR #${item.prNumber}`);
        }
        if (item.versionBump) {
          extras.push(`版本: ${item.versionBump}`);
        }
        if (extras.length) {
          lines.push(`  ${extras.join(' · ')}`);
        }
        lines.push(`  path: ${item.relativePath}`);
      });
      lines.push('');
    });

    return lines.join('\n').trim() + '\n';
  };

  /**
   * MCP / 周报查询：按时间 + 创建人 + 项目筛选，默认输出 markdown 周报素材
   */
  const search = async ({ query, projectName, createdUserId, creator, mine, startAt, endAt, week, days, limit = 50, mode = 'report', currentUserId } = {}) => {
    const range = resolveWrittenAtRange({ startAt, endAt, week, days });
    const resolved = await resolveCreator({ createdUserId, creator, mine, currentUserId });
    if (resolved.error) {
      const extra = resolved.candidates?.length ? `\n候选：\n${resolved.candidates.map(c => `- ${c.id} ${c.nickname || ''} ${c.email || ''}`).join('\n')}` : '';
      return { error: resolved.error + extra, text: `错误：${resolved.error}${extra}` };
    }

    const perPage = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const { totalCount, pageData } = await list({
      keyword: query,
      projectName,
      createdUserId: resolved.createdUserId,
      writtenAtStart: range.writtenAtStart,
      writtenAtEnd: range.writtenAtEnd,
      perPage,
      currentPage: 1
    });

    const items = pageData.map(summarizeRow);
    const filters = {
      keyword: query || '',
      projectName: projectName || '',
      creatorLabel: resolved.user ? creatorLabel(resolved.user) : ''
    };

    if (mode === 'list') {
      const text = items.length
        ? items
            .map(item => {
              const bits = [formatDay(item.writtenAt), item.project, item.creator].filter(Boolean).join(' · ');
              return `- ${item.title}${bits ? `（${bits}）` : ''}\n  ${item.summary || ''}\n  ${item.relativePath}`.trim();
            })
            .join('\n')
        : `无命中（${range.label}）`;
      return { totalCount, items, range, text: `# 工作日志列表\n时间：${range.label}\n共 ${totalCount} 条（返回 ${items.length}）\n\n${text}\n` };
    }

    const text = renderReportMarkdown({ items, rangeLabel: range.label, filters });
    const truncatedNote = totalCount > items.length ? `\n> 另有 ${totalCount - items.length} 条未列出，可增大 limit 或收窄筛选。\n` : '';
    return { totalCount, items, range, text: text + truncatedNote };
  };

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

    const creatorRows = await models.worklog.findAll({
      attributes: ['createdUserId'],
      group: ['createdUserId'],
      raw: true
    });
    const creatorIds = creatorRows.map(row => row.createdUserId).filter(Boolean);
    const creators = creatorIds.length
      ? (
          await userModel.findAll({
            where: { id: { [Op.in]: creatorIds } },
            attributes: ['id', 'nickname', 'email', 'phone']
          })
        ).map(user => ({
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          label: creatorLabel(user)
        }))
      : [];

    return {
      projectNames: rows
        .map(row => row.projectName)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
      creators: creators.sort((a, b) => String(a.label).localeCompare(String(b.label)))
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
      search,
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
