const fp = require('fastify-plugin');
const { renderSearchMarkdown, renderFetchMarkdown, DEFAULT_MAX_CHARS } = require('../utils/doc-render');
const { parseRef, formatExperienceRef, experiencePathCandidates, formatDocumentRef } = require('../utils/doc-ref');

const EXPERIENCE_LIMIT = 2;
const DOCUMENT_LIMIT = 2;
const MAX_REFS = 10;
const EXPERIENCE_KEY_CODE_LIMIT = 3;

const joinLines = parts => parts.filter(Boolean).join('\n');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const experienceHits = async ({ query, userId, source }) => {
    if (!query) {
      return [];
    }
    const rows = await services.experience.search({ query, limit: EXPERIENCE_LIMIT, userId, source, record: false });
    return rows.map(row => ({
      kind: 'experience',
      ref: formatExperienceRef(row.relativePath),
      title: row.title,
      content: joinLines([row.problem && `问题：${row.problem}`, row.solution && `做法：${row.solution}`, row.keywords?.length ? `关键词：${row.keywords.join('、')}` : ''])
    }));
  };

  const documentHits = async ({ query, userId, source }) => {
    if (!query) {
      return [];
    }
    const rows = await services.document.searchByFts({ query, limit: DOCUMENT_LIMIT, userId, source, record: false });
    return rows.map(row => ({
      kind: 'document',
      ref: formatDocumentRef(row.id),
      title: row.name,
      content: row.snippet || row.name
    }));
  };

  /**
   * 一次调用给出可直接决策的正文：经验在前（短且高价值），组件段居中（主体），后台文档兜底。
   * 装不下的进「未包含」清单，由调用方按 ref 决定是否深读。
   */
  const search = async ({ query, docId, version, limit, maxChars = DEFAULT_MAX_CHARS, mode = 'answer', userId, source = 'mcp' }) => {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery && !docId) {
      return renderSearchMarkdown({ query: normalizedQuery, hits: [], maxChars, mode });
    }

    const [experience, indexed, documents] = await Promise.all([
      experienceHits({ query: normalizedQuery, userId, source }).catch(e => {
        fastify.log.warn({ err: e }, 'doc-retrieval experience search failed');
        return [];
      }),
      services.documentIndex.searchSections({ query: normalizedQuery, docId, version, limit }).catch(e => {
        fastify.log.warn({ err: e }, 'doc-retrieval section search failed');
        return { sections: [], total: 0 };
      }),
      documentHits({ query: normalizedQuery, userId, source }).catch(e => {
        fastify.log.warn({ err: e }, 'doc-retrieval document search failed');
        return [];
      })
    ]);

    const hits = [...experience, ...indexed.sections, ...documents];
    const total = experience.length + indexed.total + documents.length;

    await services.searchRecord.recordSearch({
      searchType: 'document_index',
      query: normalizedQuery || docId || '',
      results: hits,
      userId,
      source
    });

    return renderSearchMarkdown({ query: normalizedQuery || docId, hits, maxChars, mode, total });
  };

  const experienceContent = content => {
    const data = content || {};
    const keyCode = (data.keyCode || [])
      .slice(0, EXPERIENCE_KEY_CODE_LIMIT)
      .map(item => `- ${item.path || ''} ${item.why || ''}\n\`\`\`${item.language || ''}\n${item.code || ''}\n\`\`\``)
      .join('\n');
    return joinLines([
      data.problem && `问题：${data.problem}`,
      data.solution && `做法：${data.solution}`,
      data.rootCause && `根因：${data.rootCause}`,
      data.symptoms?.length ? `表现：${data.symptoms.join('；')}` : '',
      data.donts?.length ? `禁止：${data.donts.join('；')}` : '',
      data.keywords?.length ? `关键词：${data.keywords.join('、')}` : '',
      keyCode && `关键代码：\n${keyCode}`
    ]);
  };

  const resolveRef = async ref => {
    const parsed = parseRef(ref);
    if (!parsed) {
      return { ref, error: 'ref 无法解析' };
    }

    if (parsed.type === 'doc-index') {
      const section = await services.documentIndex.getSection(parsed);
      return { ref, ...section };
    }

    if (parsed.type === 'experience') {
      const row = await models.experience.findOne({
        where: { relativePath: { [Op.in]: experiencePathCandidates(parsed.relativePath) } }
      });
      if (!row) {
        return { ref, error: '经验不存在' };
      }
      return { ref, heading: `经验 · ${row.title}`, content: experienceContent(row.content) };
    }

    const row = await models.document.findByPk(parsed.id, { attributes: ['id', 'name', 'content', 'status'] });
    if (!row) {
      return { ref, error: '文档不存在' };
    }
    return { ref, heading: `后台文档 · ${row.name}`, content: row.content || '' };
  };

  const fetchRefs = async ({ refs = [], offset = 0, limit }) => {
    const list = (Array.isArray(refs) ? refs : [refs]).filter(Boolean).slice(0, MAX_REFS);
    const items = [];
    for (const ref of list) {
      try {
        const resolved = await resolveRef(ref);
        items.push({ offset, limit, ...resolved });
      } catch (e) {
        fastify.log.warn({ err: e, ref }, 'doc-retrieval resolveRef failed');
        items.push({ ref, error: e.message });
      }
    }
    return renderFetchMarkdown({ items });
  };

  Object.assign(services, {
    docRetrieval: {
      search,
      fetchRefs,
      resolveRef
    }
  });
});
