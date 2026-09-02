const fp = require('fastify-plugin');
const loadNpmInfo = require('@kne/load-npm-info');
const { buildCatalogFromReadme, getRemoteModuleDocument, getRemoteComponentReadmeFromTarball } = require('@kne/npm-tools');
const { buildSearchTextFromIndex, ftsWhere, ftsOrder, hasCJK, bigrams, likeWhere } = require('../utils/fts');
const { withApiSections, apiSectionsOf, apiMarkdownOf, htmlToMarkdown, PREAMBLE_SECTION_NAME } = require('../utils/api-markdown');
const { rankSections, orderedComponentSections, parseTokenQuery } = require('../utils/doc-sections');
const { formatDocIndexRef } = require('../utils/doc-ref');
const { withRetry } = require('../utils/retry');

// 必须有非空组件目录，避免空壳 builtAt 永久阻塞重建
const hasValidIndex = row => Boolean(row && row.meta && row.meta.builtAt && Array.isArray(row.indexData) && row.indexData.length > 0);

const normalizeVersions = versions => {
  if (Array.isArray(versions)) {
    return versions;
  }
  if (versions && typeof versions === 'object') {
    return Object.keys(versions);
  }
  return [];
};

const displayNameFromPackage = packageName => {
  if (!packageName) {
    return '';
  }
  return packageName.includes('/') ? packageName.split('/').slice(1).join('/') : packageName.replace(/^@/, '');
};

const parseTokenDocId = query => parseTokenQuery(query)?.docId || null;

const isKneNpmPackage = name => /^@kne\/[A-Za-z0-9._-]+$/.test(name || '');
const isKneComponentsPackage = name => /^@kne-components\/[A-Za-z0-9._-]+$/.test(name || '');

// 候选行只用轻字段筛，避免把 searchText（可达 500KB）和 componentsData（可达 1MB+）整行拉回来
const LIGHT_ATTRIBUTES = ['id', 'docId', 'version', 'source', 'meta'];
const FULL_ATTRIBUTES = ['id', 'docId', 'version', 'source', 'meta', 'indexData', 'componentsData'];
const CANDIDATE_ROW_LIMIT = 5;
const DEFAULT_SECTION_LIMIT = 12;
// 超出 limit 后仍然列出的 ref 条数，让调用方知道还能取什么
const OVERFLOW_SECTION_LIMIT = 15;

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;
  const searchTextColumn = models.documentIndex.rawAttributes.searchText.field;

  const resolveCatalogDocIds = async query => {
    const q = String(query || '').trim();
    if (!q || q.length < 2) {
      return [];
    }

    // 精确 / 后缀优先；避免宽模糊把大量无关包拖进 ensure
    const [exactPackages, suffixPackages, exactRemotes] = await Promise.all([
      models.npmPackage.findAll({
        where: { [Op.or]: [{ packageName: q }, { packageName: { [Op.iLike]: `%/${q}` } }] },
        attributes: ['packageName'],
        limit: 5,
        order: [['updatedAt', 'DESC']]
      }),
      models.npmPackage.findAll({
        where: {
          [Op.and]: [{ packageName: { [Op.iLike]: `%/${q}` } }, { packageName: { [Op.ne]: q } }]
        },
        attributes: ['packageName'],
        limit: 3,
        order: [['updatedAt', 'DESC']]
      }),
      models.remoteComponent.findAll({
        where: { [Op.or]: [{ remote: q }, { packageName: q }, { packageName: { [Op.iLike]: `%/${q}` } }] },
        attributes: ['remote'],
        limit: 5,
        order: [['updatedAt', 'DESC']]
      })
    ]);

    const ids = [];
    const seen = new Set();
    const push = id => {
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    };
    exactPackages.forEach(pkg => push(pkg.packageName));
    exactRemotes.forEach(remote => push(remote.remote));
    suffixPackages.forEach(pkg => push(pkg.packageName));
    return ids.slice(0, 5);
  };

  const npmPackageExists = async packageName => {
    try {
      // 404 不重试，避免裸搜不存在包名拖到分钟级
      await loadNpmInfo(packageName);
      return true;
    } catch (e) {
      return false;
    }
  };

  const resolveKnePackageCandidates = async ({ query, docId }) => {
    const candidates = [];
    const push = value => {
      if (value && !candidates.includes(value)) {
        candidates.push(value);
      }
    };

    push(docId);
    push(parseTokenDocId(query));

    const q = String(query || '').trim();
    if (!q) {
      return candidates;
    }

    if (isKneNpmPackage(q) || isKneComponentsPackage(q)) {
      push(q);
      return candidates;
    }

    // 裸名：
    // - 仅 @kne/ 存在 → npm 包
    // - 仅 @kne-components/ 存在 → 远程组件
    // - 两者都存在（如 react-fetch 双发布）→ 只走 @kne/，禁止自动建远程（远程须显式 scope 或已有记录）
    if (/^[A-Za-z0-9._-]+$/.test(q)) {
      const kneName = `@kne/${q}`;
      const componentsName = `@kne-components/${q}`;
      const kneExists = await npmPackageExists(kneName);
      if (kneExists) {
        push(kneName);
      } else if (await npmPackageExists(componentsName)) {
        push(componentsName);
      }
    }

    return candidates;
  };

  const ensureKneCatalogRecord = async packageName => {
    if (isKneNpmPackage(packageName)) {
      let pkg = await models.npmPackage.findOne({ where: { packageName } });
      if (pkg) {
        return { docId: packageName, kind: 'npm', record: pkg };
      }
      if (!(await npmPackageExists(packageName))) {
        return null;
      }
      pkg = await services.npmPackage.create({
        packageName,
        registry: 'https://registry.npmjs.org',
        name: displayNameFromPackage(packageName),
        type: 'other',
        isPublic: true
      });
      return { docId: packageName, kind: 'npm', record: pkg, created: true };
    }

    if (isKneComponentsPackage(packageName)) {
      const remote = displayNameFromPackage(packageName);
      let component = (await models.remoteComponent.findOne({ where: { remote } })) || (await models.remoteComponent.findOne({ where: { packageName } }));
      if (component) {
        return { docId: component.remote, kind: 'remote', record: component };
      }
      if (!(await npmPackageExists(packageName))) {
        return null;
      }
      component = await services.remoteComponent.create({
        remote,
        packageName,
        registry: 'https://registry.npmjs.org',
        name: remote,
        group: 'general',
        isPublic: true
      });
      return { docId: component.remote, kind: 'remote', record: component, created: true };
    }

    return null;
  };

  const buildFromReadme = async ({ docId, version, readme, source, readmeUrl, packageName }) => {
    const { index, components: rawComponents } = buildCatalogFromReadme(readme, docId);
    // api 原文是 HTML（表格占 token 极多），建索引时一并产出可寻址的 markdown 子节
    const components = withApiSections(rawComponents);
    const meta = {
      id: docId,
      version,
      source,
      readmeUrl: readmeUrl || null,
      packageName: packageName || docId,
      builtAt: Date.now(),
      componentCount: index.length
    };
    const searchText = buildSearchTextFromIndex({ index, components });
    const payload = { source, indexData: index, componentsData: components, meta, searchText };

    const existing = await models.documentIndex.findOne({
      where: { docId, version },
      paranoid: false
    });

    let row;
    if (existing) {
      if (existing.deletedAt) {
        await existing.restore();
      }
      await existing.update(payload);
      row = existing;
    } else {
      row = await models.documentIndex.create({
        docId,
        version,
        ...payload
      });
    }

    if (fastify.config.DOCUMENT_INDEX_DIR) {
      try {
        const { buildDocumentIndex } = require('@kne/npm-tools');
        await buildDocumentIndex({
          id: docId,
          version,
          readme,
          source,
          readmeUrl,
          packageName: packageName || docId,
          outputDir: fastify.config.DOCUMENT_INDEX_DIR
        });
      } catch (e) {
        fastify.log.warn({ err: e }, 'buildDocumentIndex file write skipped');
      }
    }

    return row;
  };

  const buildFromNpmPackage = async ({ packageName, version, registry }) => {
    const { getNpmPackageDocument } = require('@kne/npm-tools');
    const resolvedName = version ? `${packageName}@${version}` : packageName;
    const doc = await withRetry(
      () =>
        getNpmPackageDocument(resolvedName, {
          loadNpmInfo: name => loadNpmInfo(name, registry ? { registry } : undefined)
        }),
      { retries: 3, delays: [2000, 5000, 10000] }
    );
    return buildFromReadme({
      docId: packageName,
      version: version || doc.version,
      readme: doc.readme,
      source: 'npm',
      readmeUrl: doc.readmeUrl,
      packageName
    });
  };

  const buildFromRemoteComponent = async (component, { version: versionOverride } = {}) => {
    const version = versionOverride || component.defaultVersion;
    if (!component?.remote) {
      throw new Error('远程组件缺少 remote');
    }

    // 有 CDN url：只读 CDN README；无 url：只从 tarball 读 build/README.md（禁止 registry readme）
    if (component.url) {
      const doc = await getRemoteModuleDocument({
        url: component.url,
        remote: component.remote,
        tpl: component.tpl,
        defaultVersion: component.defaultVersion,
        version
      });
      return buildFromReadme({
        docId: component.remote,
        version: doc.version || version || 'latest',
        readme: doc.readme,
        source: 'remote',
        readmeUrl: doc.readmeUrl,
        packageName: component.packageName
      });
    }

    if (!component.packageName) {
      throw new Error(`远程组件[${component.remote}]无 CDN url 且缺少 packageName，无法从 tarball 取文`);
    }

    const doc = await getRemoteComponentReadmeFromTarball(component.packageName, version);
    return buildFromReadme({
      docId: component.remote,
      version: version || doc.version,
      readme: doc.readme,
      source: 'remote',
      readmeUrl: doc.readmeUrl,
      packageName: component.packageName
    });
  };

  const ensureIndex = async ({ docId, version }) => {
    if (!docId) {
      return null;
    }

    const where = { docId };
    if (version) {
      where.version = version;
    }

    const existing = await models.documentIndex.findOne({
      where,
      order: version ? undefined : [['updatedAt', 'DESC']]
    });
    if (hasValidIndex(existing)) {
      return existing;
    }

    const pkg = await models.npmPackage.findOne({ where: { packageName: docId } });
    if (pkg) {
      try {
        return await buildFromNpmPackage({
          packageName: docId,
          version: version || pkg.latestVersion,
          registry: pkg.registry
        });
      } catch (e) {
        fastify.log.warn({ err: e, docId }, 'ensureIndex npm package build failed');
      }
    }

    const component = (await models.remoteComponent.findOne({ where: { remote: docId } })) || (await models.remoteComponent.findOne({ where: { packageName: docId } }));
    if (component) {
      try {
        return await buildFromRemoteComponent(component, { version });
      } catch (e) {
        fastify.log.warn({ err: e, docId }, 'ensureIndex remote component build failed');
      }
    }

    // @kne / @kne-components：无后台记录时先创建再建索引
    if (isKneNpmPackage(docId) || isKneComponentsPackage(docId)) {
      try {
        const catalog = await ensureKneCatalogRecord(docId);
        if (catalog?.docId) {
          if (catalog.kind === 'npm') {
            return await buildFromNpmPackage({
              packageName: catalog.docId,
              version,
              registry: catalog.record?.registry
            });
          }
          return await buildFromRemoteComponent(catalog.record, { version });
        }
      } catch (e) {
        fastify.log.warn({ err: e, docId }, 'ensureIndex kne auto-create failed');
      }
    }

    try {
      return await buildFromNpmPackage({ packageName: docId, version });
    } catch (e) {
      fastify.log.warn({ err: e, docId }, 'ensureIndex direct npm fetch failed');
    }

    return existing || null;
  };

  const resolveEnsureDocIds = async ({ query, docId, version }) => {
    const resolvedDocId = docId || parseTokenDocId(query);
    const catalogDocIds = resolvedDocId ? [] : await resolveCatalogDocIds(query);
    const kneCandidates = await resolveKnePackageCandidates({ query, docId: resolvedDocId });

    const ensureDocIds = [];
    const seen = new Set();
    const pushEnsure = id => {
      if (id && !seen.has(id)) {
        seen.add(id);
        ensureDocIds.push(id);
      }
    };

    catalogDocIds.forEach(pushEnsure);

    for (const candidate of kneCandidates) {
      try {
        if (isKneNpmPackage(candidate) || isKneComponentsPackage(candidate)) {
          const catalog = await ensureKneCatalogRecord(candidate);
          if (catalog?.docId) {
            pushEnsure(catalog.docId);
            continue;
          }
        }
        pushEnsure(candidate);
      } catch (e) {
        fastify.log.warn({ err: e, candidate }, 'search ensureKneCatalogRecord failed');
        pushEnsure(candidate);
      }
    }

    for (const id of ensureDocIds) {
      try {
        await ensureIndex({ docId: id, version });
      } catch (e) {
        fastify.log.warn({ err: e, docId: id }, 'search ensureIndex failed');
      }
    }

    return ensureDocIds;
  };

  const findCandidateRows = async ({ query, docId, version, ensureDocIds }) => {
    const baseWhere = {};
    const scopedDocId = docId || parseTokenDocId(query);
    if (scopedDocId) {
      baseWhere.docId = scopedDocId;
    }
    if (version) {
      baseWhere.version = version;
    }

    const light = { attributes: LIGHT_ATTRIBUTES, limit: CANDIDATE_ROW_LIMIT };

    if (!query) {
      return models.documentIndex.findAll({ ...light, where: baseWhere, order: [['updatedAt', 'DESC']] });
    }

    const byLike = async terms => {
      const clause = likeWhere(searchTextColumn, terms);
      if (!clause) {
        return [];
      }
      return models.documentIndex.findAll({
        ...light,
        where: { ...baseWhere, ...clause.where },
        order: [['updatedAt', 'DESC']],
        bind: clause.bind
      });
    };

    let rows = [];
    if (!hasCJK(query)) {
      rows = await models.documentIndex.findAll({
        ...light,
        where: { ...baseWhere, ...ftsWhere(searchTextColumn) },
        order: ftsOrder(searchTextColumn),
        bind: { query }
      });
    }
    if (!rows.length) {
      rows = await byLike([query]);
    }
    if (!rows.length && hasCJK(query)) {
      rows = await byLike(bigrams(query));
    }
    if (!rows.length && ensureDocIds?.length) {
      rows = await models.documentIndex.findAll({
        ...light,
        where: { docId: { [Op.in]: ensureDocIds }, ...(version ? { version } : {}) },
        order: [['updatedAt', 'DESC']]
      });
    }
    return rows;
  };

  const loadFullRows = async rows => {
    if (!rows.length) {
      return [];
    }
    const ids = rows.map(row => row.id);
    const full = await models.documentIndex.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: FULL_ATTRIBUTES
    });
    const byId = new Map(full.map(row => [row.id, row]));
    return ids.map(id => byId.get(id)).filter(Boolean);
  };

  /**
   * 返回排好序的「段」，段是可寻址的最小可读单位（组件概述 / API 子节 / 单条示例）。
   * 超过 limit 的部分带 overflow 标记继续返回，交给渲染层进「未包含」清单，
   * 避免调用方以为结果里就是全部。
   */
  const searchSections = async ({ query, docId, version, limit = DEFAULT_SECTION_LIMIT }) => {
    const empty = { sections: [], total: 0 };
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery && !docId) {
      return empty;
    }

    const ensureDocIds = await resolveEnsureDocIds({ query: normalizedQuery, docId, version });
    const candidates = await findCandidateRows({ query: normalizedQuery, docId, version, ensureDocIds });
    const rows = await loadFullRows(candidates);
    if (!rows.length) {
      return empty;
    }

    const token = parseTokenQuery(normalizedQuery);
    const ordered = token?.componentName ? orderedComponentSections({ rows, componentName: token.componentName }) : null;
    const all = ordered || rankSections({ rows, query: normalizedQuery });

    const sections = all.slice(0, limit + OVERFLOW_SECTION_LIMIT).map((section, i) => (i < limit ? section : { ...section, overflow: true }));
    return { sections, total: all.length };
  };

  const resolveRow = async ({ docId, version }) => {
    const where = { docId };
    if (version && version !== 'latest') {
      where.version = version;
    }
    return models.documentIndex.findOne({
      where,
      attributes: FULL_ATTRIBUTES,
      order: [['updatedAt', 'DESC']]
    });
  };

  const findComponent = (row, name) => {
    const components = row?.componentsData || {};
    if (components[name]) {
      return components[name];
    }
    const target = String(name || '').toLowerCase();
    return Object.values(components).find(component => String(component?.name || '').toLowerCase() === target) || null;
  };

  const componentOutline = (component, { docId, version }) => {
    const lines = [];
    const summary = htmlToMarkdown(component.summary);
    if (summary) {
      lines.push(summary, '');
    }
    const apiSections = apiSectionsOf(component);
    if (apiSections.length) {
      lines.push('可取的 API 子节：');
      const single = apiSections.length === 1;
      apiSections.forEach(section => {
        const ref = formatDocIndexRef({ docId, version, name: component.name, kind: 'api', sub: single ? null : section.name });
        lines.push(`- ${section.name === PREAMBLE_SECTION_NAME ? 'api' : section.name} (${section.md.length} chars) → ${ref}`);
      });
      lines.push('');
    }
    const examples = component.examples || [];
    if (examples.length) {
      lines.push('可取的示例：');
      examples.forEach(example => {
        const ref = formatDocIndexRef({ docId, version, name: component.name, kind: 'examples', sub: example.id });
        lines.push(`- "${example.title}" (${String(example.code || '').length} chars) → ${ref}`);
      });
    }
    return lines.join('\n').trim();
  };

  /**
   * 按 ref 深读某一段；kind 为空时给该组件的目录（可取子节与示例及其体积）
   */
  const getSection = async ({ docId, version, name, kind, sub }) => {
    const row = await resolveRow({ docId, version });
    if (!row) {
      return { error: `未找到文档索引 ${docId}@${version || 'latest'}` };
    }
    const resolvedVersion = row.version;
    if (!name) {
      const names = (row.indexData || []).map(item => item.name);
      return {
        heading: `${docId}@${resolvedVersion}`,
        content: names.length ? `组件列表：\n${names.map(item => `- ${item} → ${formatDocIndexRef({ docId, version: resolvedVersion, name: item })}`).join('\n')}` : '该文档索引为空'
      };
    }

    const component = findComponent(row, name);
    if (!component) {
      return { error: `${docId}@${resolvedVersion} 中没有组件 ${name}` };
    }

    if (!kind) {
      return {
        heading: `${component.name} · 目录`,
        content: componentOutline(component, { docId, version: resolvedVersion })
      };
    }

    if (kind === 'api') {
      if (!sub) {
        return { heading: `${component.name} · api`, content: apiMarkdownOf(component) };
      }
      const sections = apiSectionsOf(component);
      const target = sections.find(section => section.name.toLowerCase() === String(sub).toLowerCase()) || (/^\d+$/.test(sub) ? sections[Number(sub)] : null);
      if (!target) {
        return { error: `${component.name} 没有 api 子节 ${sub}` };
      }
      return { heading: `${component.name} · api / ${target.name}`, content: target.md };
    }

    if (kind === 'examples') {
      const examples = component.examples || [];
      if (!sub) {
        const content = examples.map(example => `### ${example.title}\n${example.description || ''}\n\n\`\`\`jsx\n${example.code}\n\`\`\``).join('\n\n');
        return { heading: `${component.name} · examples`, content };
      }
      const target = examples.find(example => String(example.id) === String(sub)) || examples.find(example => example.title === sub);
      if (!target) {
        return { error: `${component.name} 没有示例 ${sub}` };
      }
      return {
        heading: `${component.name} · example "${target.title}"`,
        content: [target.description || '', `\`\`\`jsx\n${target.code}\n\`\`\``].filter(Boolean).join('\n\n')
      };
    }

    return { error: `不支持的 ref 段类型 ${kind}` };
  };

  // 保持 REST / 管理端既有的 JSON 形态，内部改用段级排序
  const search = async ({ query, docId, version, limit = 3, userId, source = 'rest' }) => {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery && !docId) {
      return [];
    }

    const { sections } = await searchSections({
      query: normalizedQuery,
      docId,
      version,
      limit: Math.min(limit * 6, 30)
    });

    const results = [];
    const seen = new Set();
    sections.forEach(section => {
      if (results.length >= limit || seen.has(section.token)) {
        return;
      }
      seen.add(section.token);
      results.push({
        id: section.id,
        docId: section.docId,
        version: section.version,
        source: section.source,
        token: section.token,
        name: section.name,
        summary: String(section.content || '').slice(0, 400),
        ref: section.ref
      });
    });

    await services.searchRecord.recordSearch({
      searchType: 'document_index',
      query: normalizedQuery || docId || '',
      results,
      userId,
      source
    });

    return results;
  };

  Object.assign(services, {
    documentIndex: {
      buildFromReadme,
      buildFromNpmPackage,
      buildFromRemoteComponent,
      ensureIndex,
      ensureKneCatalogRecord,
      search,
      searchSections,
      getSection
    }
  });
});
