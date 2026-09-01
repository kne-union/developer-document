const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const KNE_ROOT = path.join(os.homedir(), '.kne_document');
const CONFIG_PATH = path.join(KNE_ROOT, 'config.json');
const REGISTRY_PATH = path.join(KNE_ROOT, 'sync-registry.json');

const loadJson = async filePath => {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveJson = async (filePath, data) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const loadConfig = async () => (await loadJson(CONFIG_PATH)) || {};
const saveConfig = async config => saveJson(CONFIG_PATH, config);

const emptyRegistry = () => ({ schemaVersion: 1, entries: {} });

const loadRegistry = async () => {
  const registry = (await loadJson(REGISTRY_PATH)) || emptyRegistry();
  if (!registry.entries || typeof registry.entries !== 'object') {
    registry.entries = {};
  }
  registry.schemaVersion = 1;
  return registry;
};

const saveRegistry = async registry => saveJson(REGISTRY_PATH, registry);

const hashContent = content => crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');

const resolveRemote = async cli => {
  const config = await loadConfig();
  const apiUrl = cli.apiUrl || config.remote?.apiUrl;
  const token = cli.token || config.remote?.token;
  return { config, apiUrl, token };
};

const walkJsonFiles = async () => {
  const roots = ['worklog', 'experience'];
  const files = [];

  for (const subdir of roots) {
    const baseDir = path.join(KNE_ROOT, subdir);
    if (!fs.existsSync(baseDir)) {
      continue;
    }

    const walk = async currentDir => {
      const entries = await fsp.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const abs = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(abs);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const relativePath = path.relative(KNE_ROOT, abs).split(path.sep).join('/');
          const type = relativePath.startsWith('worklog/') ? 'worklog' : 'experience';
          files.push({ abs, relativePath, type });
        }
      }
    };

    await walk(baseDir);
  }

  return files;
};

const needsSync = ({ entry, apiUrl, contentHash, fileMtimeMs }) => {
  if (!entry) {
    return { needed: true, reason: 'never_synced' };
  }
  if (entry.apiUrl !== apiUrl) {
    return { needed: true, reason: 'api_url_changed' };
  }
  if (entry.contentHash && entry.contentHash !== contentHash) {
    return { needed: true, reason: 'content_changed' };
  }
  if (fileMtimeMs && entry.syncedAt && fileMtimeMs > Date.parse(entry.syncedAt)) {
    return { needed: true, reason: 'local_newer' };
  }
  return { needed: false, reason: 'up_to_date' };
};

const apiRequest = async ({ apiUrl, token, method, pathname, body }) => {
  const url = new URL(pathname, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-token': token
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error || response.statusText;
    throw new Error(`${method} ${url.pathname} failed (${response.status}): ${message}`);
  }
  return data?.data !== undefined ? data.data : data;
};

const uploadItem = async ({ apiUrl, token, type, relativePath, content }) => {
  const uploadPath = type === 'worklog' ? '/worklog/upload' : '/experience/upload';
  return apiRequest({
    apiUrl,
    token,
    method: 'POST',
    pathname: uploadPath,
    body: { relativePath, content }
  });
};

const syncOneFile = async ({ relativePath, apiUrl, token, dryRun = false, registry }) => {
  const abs = path.join(KNE_ROOT, relativePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`本地文件不存在: ${relativePath}`);
  }

  const stat = await fsp.stat(abs);
  const raw = await fsp.readFile(abs, 'utf8');
  const content = JSON.parse(raw);
  const type = relativePath.startsWith('worklog/') ? 'worklog' : 'experience';
  const contentHash = hashContent(content);
  const reg = registry || (await loadRegistry());
  const entry = reg.entries[relativePath];
  const pending = needsSync({
    entry,
    apiUrl,
    contentHash,
    fileMtimeMs: stat.mtimeMs
  });

  if (!pending.needed) {
    return { relativePath, action: 'skipped', reason: pending.reason };
  }

  if (dryRun) {
    return { relativePath, action: 'dry-run', reason: pending.reason };
  }

  const result = await uploadItem({ apiUrl, token, type, relativePath, content });
  reg.entries[relativePath] = {
    apiUrl,
    syncedAt: new Date().toISOString(),
    action: result.action || 'updated',
    contentHash
  };
  await saveRegistry(reg);

  return {
    relativePath,
    action: result.action || 'updated',
    reason: pending.reason,
    apiUrl
  };
};

const syncAll = async ({ apiUrl, token, dryRun = false, force = false }) => {
  const registry = await loadRegistry();
  const files = await walkJsonFiles();
  const summary = { synced: 0, skipped: 0, failed: 0, errors: [] };

  for (const item of files) {
    try {
      if (force) {
        delete registry.entries[item.relativePath];
      }
      const result = await syncOneFile({
        relativePath: item.relativePath,
        apiUrl,
        token,
        dryRun,
        registry
      });
      if (result.action === 'skipped') {
        summary.skipped += 1;
      } else {
        summary.synced += 1;
      }
      console.log(`[${result.action}] ${item.relativePath}${result.reason ? ` (${result.reason})` : ''}`);
    } catch (err) {
      summary.failed += 1;
      summary.errors.push({ relativePath: item.relativePath, message: err.message });
      console.error(`[failed] ${item.relativePath}: ${err.message}`);
    }
  }

  if (!dryRun) {
    const config = await loadConfig();
    await saveConfig(
      Object.assign({}, config, {
        remote: Object.assign({}, config.remote, { apiUrl, token }),
        lastSyncApiUrl: apiUrl,
        lastSyncAt: new Date().toISOString()
      })
    );
  }

  return summary;
};

module.exports = {
  KNE_ROOT,
  CONFIG_PATH,
  REGISTRY_PATH,
  loadConfig,
  saveConfig,
  loadRegistry,
  saveRegistry,
  walkJsonFiles,
  needsSync,
  syncOneFile,
  syncAll,
  resolveRemote
};
