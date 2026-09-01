const fp = require('fastify-plugin');
const loadNpmInfo = require('@kne/load-npm-info');
const { buildCatalogFromReadme } = require('@kne/npm-tools');
const { buildSearchTextFromIndex, ftsWhere, ftsOrder } = require('../utils/fts');

const hasValidIndex = row => row && Array.isArray(row.indexData) && row.indexData.length > 0;

const parseTokenDocId = query => {
  if (!query) {
    return null;
  }
  const match = String(query)
    .trim()
    .match(/^([^:\s]+):([A-Za-z][\w.]*)$/);
  return match ? match[1] : null;
};

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
  const q = String(query).toLowerCase();
  const item =
    index.find(entry => entry.name?.toLowerCase().includes(q)) ||
    index.find(entry => entry.token?.toLowerCase().includes(q)) ||
    index.find(entry => entry.summary?.toLowerCase().includes(q)) ||
    index.find(entry => {
      const component = components[entry.name];
      return component?.api && String(component.api).toLowerCase().includes(q);
    }) ||
    index[0];
  return { item, component: item?.name ? components[item.name] : null };
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const searchTextColumn = models.documentIndex.rawAttributes.searchText.field;

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
    const doc = await getNpmPackageDocument(resolvedName, {
      loadNpmInfo: name => loadNpmInfo(name, registry ? { registry } : undefined)
    });
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
    const { getRemoteModuleDocument } = require('@kne/npm-tools');
    const doc = await getRemoteModuleDocument({
      url: component.url,
      remote: component.remote,
      tpl: component.tpl,
      defaultVersion: component.defaultVersion,
      version: versionOverride || component.defaultVersion
    });
    return buildFromReadme({
      docId: component.remote,
      version: doc.version || versionOverride || component.defaultVersion || 'latest',
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

    const component = await models.remoteComponent.findOne({ where: { remote: docId } });
    if (component) {
      try {
        return await buildFromRemoteComponent(component, { version });
      } catch (e) {
        fastify.log.warn({ err: e, docId }, 'ensureIndex remote component build failed');
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
    const resolvedDocId = docId || parseTokenDocId(query);
    if (resolvedDocId) {
      await ensureIndex({ docId: resolvedDocId, version });
    }
    const where = {};
    if (docId) {
      where.docId = docId;
    } else if (resolvedDocId) {
      where.docId = resolvedDocId;
    }
    if (version) {
      where.version = version;
    }
    if (query) {
      Object.assign(where, ftsWhere(searchTextColumn));
    }

    const rows = await models.documentIndex.findAll({
      where,
      limit,
      order: query ? ftsOrder(searchTextColumn) : [['updatedAt', 'DESC']],
      bind: query ? { query } : undefined
    });

    const results = rows.map(row => {
      const { item, component } = pickComponentHit(row, query);
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
    });

    await services.searchRecord.recordSearch({
      searchType: 'document_index',
      query: query || '',
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
      search
    }
  });
});
