const AdmZip = require('adm-zip');

const MANIFEST_NAME = 'manifest.json';
const SCHEMA_VERSION = 1;

const normalizeZipPath = input => {
  const normalized = String(input || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error(`非法 zip 路径: ${input}`);
  }
  return normalized;
};

const buildManifest = ({ type, files, exportedAt, filters }) => ({
  schemaVersion: SCHEMA_VERSION,
  type,
  exportedAt: exportedAt || new Date().toISOString(),
  count: files.length,
  filters: filters || {},
  files: files.map(item => ({
    relativePath: item.relativePath,
    status: item.status,
    title: item.title
  }))
});

const createZipBuffer = ({ type, rows, filters }) => {
  const files = rows.map(row => ({
    relativePath: normalizeZipPath(row.relativePath),
    content: row.content,
    status: row.status,
    title: row.title
  }));

  const manifest = buildManifest({ type, files, filters });
  const zip = new AdmZip();
  zip.addFile(MANIFEST_NAME, Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  files.forEach(item => {
    zip.addFile(item.relativePath, Buffer.from(JSON.stringify(item.content, null, 2), 'utf8'));
  });
  return zip.toBuffer();
};

const parseZipBuffer = ({ buffer, expectedType }) => {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter(entry => !entry.isDirectory);
  let manifest = null;

  const manifestEntry = entries.find(entry => entry.entryName === MANIFEST_NAME);
  if (manifestEntry) {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    if (manifest.type && expectedType && manifest.type !== expectedType) {
      throw new Error(`ZIP 类型不匹配：期望 ${expectedType}，实际 ${manifest.type}`);
    }
  }

  const statusMap = new Map((manifest?.files || []).map(item => [item.relativePath, item.status]));
  const items = [];

  entries.forEach(entry => {
    if (entry.entryName === MANIFEST_NAME) {
      return;
    }
    if (!entry.entryName.endsWith('.json')) {
      return;
    }
    const relativePath = normalizeZipPath(entry.entryName);
    const prefix = `${expectedType}/`;
    if (!relativePath.startsWith(prefix)) {
      throw new Error(`非法条目路径（需以 ${prefix} 开头）: ${relativePath}`);
    }
    const content = JSON.parse(entry.getData().toString('utf8'));
    items.push({
      relativePath,
      content,
      status: statusMap.get(relativePath)
    });
  });

  if (items.length === 0) {
    throw new Error('ZIP 中未找到可导入的 JSON 文件');
  }

  return { manifest, items };
};

module.exports = {
  MANIFEST_NAME,
  SCHEMA_VERSION,
  normalizeZipPath,
  createZipBuffer,
  parseZipBuffer
};
