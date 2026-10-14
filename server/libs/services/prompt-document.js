const fp = require('fastify-plugin');
const path = require('node:path');
const fs = require('fs-extra');
const downloadNpmPackage = require('@kne/fetch-npm-package');
const { Op } = require('sequelize');

const SNIPPET_RADIUS = 160;
const CANDIDATE_LIMIT = 50;

const readPromptFiles = async (rootDir, currentDir = rootDir) => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readPromptFiles(rootDir, fullPath)));
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      files.push({
        fileName: path.relative(rootDir, fullPath).split(path.sep).join('/'),
        content: await fs.readFile(fullPath, 'utf8')
      });
    }
  }
  return files;
};

const resolveTitle = ({ fileName, content }) => {
  const heading = /^#\s+(.+)$/m.exec(content || '');
  return heading ? heading[1].trim() : fileName.replace(/\.md$/i, '');
};

const countOccurrences = (text, term) => {
  let count = 0;
  let index = text.indexOf(term);
  while (index !== -1 && count < 10) {
    count++;
    index = text.indexOf(term, index + term.length);
  }
  return count;
};

const buildSnippet = (content, terms) => {
  const text = content || '';
  const lower = text.toLowerCase();
  const hitIndex = terms.map(term => lower.indexOf(term)).find(index => index !== -1);
  const index = hitIndex === undefined ? 0 : hitIndex;
  const headingStart = text.lastIndexOf('\n#', index);
  const heading = headingStart === -1 ? '' : text.slice(headingStart + 1, text.indexOf('\n', headingStart + 1)).trim();
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + SNIPPET_RADIUS);
  const body = `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
  return heading && !body.includes(heading) ? `${heading}\n${body}` : body;
};

module.exports = fp(async (fastify, options) => {
  const { models } = fastify[options.name];

  const packageNameCandidates = packageName => (packageName.startsWith('@') ? [packageName] : [packageName, `@kne/${packageName}`]);

  const remove = async ({ packageName }) => {
    return models.promptDocument.destroy({ where: { packageName }, force: true });
  };

  const sync = async ({ packageName, version, force = false }) => {
    if (!force && version) {
      const current = await models.promptDocument.findOne({ where: { packageName }, attributes: ['version'] });
      if (current && current.version === version) {
        return { action: 'skipped', packageName, version };
      }
    }

    let files = [];
    let resolvedVersion = version;
    await downloadNpmPackage(packageName, version, {
      callback: async packageDir => {
        const promptsDir = path.join(packageDir, 'prompts');
        if (await fs.pathExists(promptsDir)) {
          files = await readPromptFiles(promptsDir);
        }
        try {
          resolvedVersion = (await fs.readJson(path.join(packageDir, 'package.json'))).version || resolvedVersion;
        } catch (e) {
          // ignore
        }
      }
    });

    await fastify.sequelize.instance.transaction(async transaction => {
      await models.promptDocument.destroy({ where: { packageName }, force: true, transaction });
      if (files.length > 0) {
        await models.promptDocument.bulkCreate(
          files.map(file => ({
            packageName,
            version: resolvedVersion,
            fileName: file.fileName,
            title: resolveTitle(file),
            content: file.content
          })),
          { transaction }
        );
      }
    });

    return { action: 'synced', packageName, version: resolvedVersion, fileCount: files.length };
  };

  const syncAll = async () => {
    const packages = await models.npmPackage.findAll({ where: { type: 'prompts' }, attributes: ['packageName', 'latestVersion'] });
    const packageNames = packages.map(item => item.packageName);
    await models.promptDocument.destroy({ where: { packageName: { [Op.notIn]: packageNames.length ? packageNames : [''] } }, force: true });
    const results = [];
    for (const pkg of packages) {
      try {
        results.push(await sync({ packageName: pkg.packageName, version: pkg.latestVersion }));
      } catch (e) {
        fastify.log.warn({ err: e, packageName: pkg.packageName }, 'prompt document sync failed');
        results.push({ action: 'failed', packageName: pkg.packageName, error: e.message });
      }
    }
    return results;
  };

  const search = async ({ query, limit = 3 }) => {
    const terms = String(query || '')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (terms.length === 0) {
      return [];
    }

    const rows = await models.promptDocument.findAll({
      where: {
        [Op.and]: terms.map(term => ({
          [Op.or]: ['title', 'fileName', 'packageName', 'content'].map(field => ({ [field]: { [Op.iLike]: `%${term}%` } }))
        }))
      },
      limit: CANDIDATE_LIMIT
    });

    return rows
      .map(row => {
        const head = `${row.title} ${row.fileName}`.toLowerCase();
        const content = (row.content || '').toLowerCase();
        const score = terms.reduce((total, term) => total + (head.includes(term) ? 20 : 0) + countOccurrences(content, term), 0);
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row }) => ({
        packageName: row.packageName,
        version: row.version,
        fileName: row.fileName,
        title: row.title,
        snippet: buildSnippet(row.content, terms)
      }));
  };

  const get = async ({ packageName, fileName }) => {
    if (!packageName) {
      const rows = await models.promptDocument.findAll({
        attributes: ['packageName', 'version', 'fileName', 'title'],
        order: [
          ['packageName', 'ASC'],
          ['fileName', 'ASC']
        ]
      });
      return Object.values(
        rows.reduce((result, row) => {
          if (!result[row.packageName]) {
            result[row.packageName] = { packageName: row.packageName, version: row.version, files: [] };
          }
          result[row.packageName].files.push({ fileName: row.fileName, title: row.title });
          return result;
        }, {})
      );
    }

    const packageWhere = { packageName: { [Op.in]: packageNameCandidates(packageName) } };

    if (!fileName) {
      const rows = await models.promptDocument.findAll({
        where: packageWhere,
        attributes: ['packageName', 'version', 'fileName', 'title'],
        order: [['fileName', 'ASC']]
      });
      if (rows.length === 0) {
        return null;
      }
      return { packageName: rows[0].packageName, version: rows[0].version, files: rows.map(row => ({ fileName: row.fileName, title: row.title })) };
    }

    const row = await models.promptDocument.findOne({
      where: Object.assign({}, packageWhere, { fileName: { [Op.in]: /\.md$/i.test(fileName) ? [fileName] : [fileName, `${fileName}.md`] } })
    });
    if (!row) {
      return null;
    }
    return { packageName: row.packageName, version: row.version, fileName: row.fileName, title: row.title, content: row.content };
  };

  Object.assign(fastify[options.name].services, {
    promptDocument: {
      sync,
      syncAll,
      remove,
      search,
      get
    }
  });
});
