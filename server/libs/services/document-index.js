const fp = require('fastify-plugin');
const loadNpmInfo = require('@kne/load-npm-info');
const { buildCatalogFromReadme, getRemoteModuleDocument, getRemoteComponentReadmeFromTarball } = require('@kne/npm-tools');
const { buildSearchTextFromIndex, ftsWhere, ftsOrder } = require('../utils/fts');
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

const parseTokenQuery = query => {
  if (!query) {
    return null;
  }
  const match = String(query)
    .trim()
    .match(/^([^:\s]+):([A-Za-z][\w.]*)$/);
  return match ? { docId: match[1], componentName: match[2] } : null;
};

const parseTokenDocId = query => parseTokenQuery(query)?.docId || null;

const isKneNpmPackage = name => /^@kne\/[A-Za-z0-9._-]+$/.test(name || '');
const isKneComponentsPackage = name => /^@kne-components\/[A-Za-z0-9._-]+$/.test(name || '');

const pickComponentHit = (row, query) => {
  const index = row.indexData || [];
  const components = row.componentsData || {};
  if (!index.length) {
    return { item: null, component: null };
  }
  if (!query) {
    const item = index[0];
    return { item, component: item?.name ? components[item.name] : null };
  }

  const token = parseTokenQuery(query);
  const needles = [];
  if (token?.componentName) {
    needles.push(token.componentName.toLowerCase());
  }
  needles.push(String(query).toLowerCase());

  for (const q of needles) {
    const item =
      index.find(entry => entry.name?.toLowerCase() === q) ||
      index.find(entry => entry.token?.toLowerCase() === q) ||
      index.find(entry => entry.name?.toLowerCase().includes(q)) ||
      index.find(entry => entry.token?.toLowerCase().includes(q)) ||
      index.find(entry => entry.summary?.toLowerCase().includes(q)) ||
      index.find(entry => {
        const component = components[entry.name];
        return component?.api && String(component.api).toLowerCase().includes(q);
      });
    if (item) {
      return { item, component: item?.name ? components[item.name] : null };
    }
  }

  return { item: null, component: null };
};

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
    const { index, components } = buildCatalogFromReadme(readme, docId);
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

  const search = async ({ query, docId, version, limit = 3, userId, source = 'rest' }) => {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery && !docId) {
      return [];
    }

    const tokenDocId = parseTokenDocId(normalizedQuery);
    const resolvedDocId = docId || tokenDocId;
    const catalogDocIds = resolvedDocId ? [] : await resolveCatalogDocIds(normalizedQuery);
    const kneCandidates = await resolveKnePackageCandidates({ query: normalizedQuery, docId: resolvedDocId });

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

    const where = {};
    if (docId) {
      where.docId = docId;
    } else if (tokenDocId) {
      where.docId = tokenDocId;
    }
    if (version) {
      where.version = version;
    }
    if (normalizedQuery) {
      Object.assign(where, ftsWhere(searchTextColumn));
    }

    let rows = await models.documentIndex.findAll({
      where,
      limit,
      order: normalizedQuery ? ftsOrder(searchTextColumn) : [['updatedAt', 'DESC']],
      bind: normalizedQuery ? { query: normalizedQuery } : undefined
    });

    // FTS 未命中时，回退到本次 ensure 的文档
    if ((!rows || rows.length === 0) && ensureDocIds.length > 0) {
      rows = await models.documentIndex.findAll({
        where: {
          docId: { [Op.in]: ensureDocIds },
          ...(version ? { version } : {})
        },
        limit,
        order: [['updatedAt', 'DESC']]
      });
    }

    const results = rows
      .map(row => {
        const { item, component } = pickComponentHit(row, normalizedQuery);
        if (normalizedQuery && !item) {
          return {
            id: row.id,
            docId: row.docId,
            version: row.version,
            source: row.source,
            token: null,
            name: null,
            summary: row.meta?.packageName || row.docId,
            api: undefined
          };
        }
        return {
          id: row.id,
          docId: row.docId,
          version: row.version,
          source: row.source,
          token: item?.token,
          name: item?.name,
          summary: item?.summary,
          api: component?.api ? String(component.api).slice(0, 2000) : undefined
        };
      })
      .filter(Boolean);

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
      search
    }
  });
});
