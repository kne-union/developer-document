const crypto = require('crypto');

const SCHEMA_VERSION = 1;
const GENERATOR = 'developer-document';
const TARGET_VALUES = ['cursor', 'workbuddy'];
const MEMORY_BLOCK_ID = 'developer-document:skills';
const MEMORY_BLOCK_PATH = '~/.workbuddy/user-*-personal/MEMORY.md';
const MEMORY_BLOCK_BUDGET = 2000;
const RULE_DESCRIPTION_SUFFIX = '该规则源自 Cursor 规则库，属于用户固定约定，匹配到相关场景时必须遵循。';
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const sha256 = value => `sha256:${crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')}`;

const toPlain = row => (row && typeof row.get === 'function' ? row.get({ plain: true }) : Object.assign({}, row));

const toArray = value => (Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean) : []);

const flatten = value =>
  String(value == null ? '' : value)
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const oneLine = (value, max = 96) => {
  const text = flatten(value)
    .replace(/`/g, '')
    .replace(/^#+\s*/, '');
  if (!text) {
    return '';
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const firstContentLine = content =>
  String(content || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !/^#{1,6}\s/.test(line) && !/^---+$/.test(line)) || '';

const pickSummary = row => oneLine([row.description, row.title, firstContentLine(row.content), row.name].find(Boolean)) || row.name;

const assertTarget = target => {
  if (!TARGET_VALUES.includes(target)) {
    throw new Error(`target 必须是 ${TARGET_VALUES.join(' 或 ')}`);
  }
};

const assertSafeName = name => {
  if (!SAFE_NAME.test(String(name || ''))) {
    throw new Error(`技能/规则标识「${name}」不合法（只允许字母、数字、点、下划线、连字符，且不能以符号开头）`);
  }
};

// YAML 双引号标量：JSON 字符串语法是 YAML 1.2 的合法子集，中文/冒号/引号都安全
const yamlScalar = value => JSON.stringify(flatten(value));

const renderFrontmatter = fields => {
  const lines = ['---'];
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }
      lines.push(`${key}:`);
      value.forEach(item => lines.push(`  - ${yamlScalar(item)}`));
      return;
    }
    if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
      return;
    }
    if (value && typeof value === 'object' && Array.isArray(value.blockLines)) {
      lines.push(`${key}: >-`);
      value.blockLines.forEach(line => lines.push(`  ${flatten(line)}`));
      return;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  });
  lines.push('---');
  return lines.join('\n');
};

const toFrontmatterObject = fields => {
  const result = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      if (value.length) {
        result[key] = value;
      }
      return;
    }
    if (value && typeof value === 'object' && Array.isArray(value.blockLines)) {
      result[key] = value.blockLines.map(flatten).join('\n');
      return;
    }
    result[key] = value;
  });
  return result;
};

// AI 上传的正文可能自带 frontmatter；导出时统一由 formatter 生成，避免双重 ---
const stripFrontmatter = content => {
  const text = String(content == null ? '' : content).replace(/^\uFEFF/, '');
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(text);
  return match ? text.slice(match[0].length) : text;
};

const resolveFilePath = ({ target, kind, name }) => {
  if (target === 'cursor') {
    return kind === 'rule' ? `~/.cursor/rules/${name}.mdc` : `~/.cursor/skills/${name}/SKILL.md`;
  }
  return `~/.workbuddy/skills/${name}/SKILL.md`;
};

const buildFrontmatterFields = ({ target, kind, row }) => {
  const description = flatten(row.description || row.title || row.name);
  if (target === 'cursor' && kind === 'rule') {
    const globs = toArray(row.globs);
    return Object.assign({ description, alwaysApply: !!row.alwaysApply }, globs.length ? { globs } : {});
  }
  if (target === 'workbuddy' && kind === 'rule') {
    return { name: row.name, description: { blockLines: [`规则（rule）：${description}`, RULE_DESCRIPTION_SUFFIX] } };
  }
  return { name: row.name, description };
};

/**
 * 把一条受管记录转换成「最终文件全文」。CLI 只负责写盘，不做任何格式判断。
 */
const formatSkillFile = (input, target) => {
  assertTarget(target);
  const row = toPlain(input);
  assertSafeName(row.name);
  const kind = row.type === 'rule' ? 'rule' : 'skill';
  const fields = buildFrontmatterFields({ target, kind, row });
  const body = stripFrontmatter(row.content).trim();
  const content = `${renderFrontmatter(fields)}\n\n${body}${body ? '\n' : ''}`;
  const filePath = resolveFilePath({ target, kind, name: row.name });

  return Object.assign(
    {
      id: row.id == null ? '' : String(row.id),
      kind,
      name: row.name,
      path: filePath,
      frontmatter: toFrontmatterObject(fields),
      contentHash: sha256(content),
      source: row.source || null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      content
    },
    kind === 'rule' ? { alwaysApply: !!row.alwaysApply, globs: toArray(row.globs) } : {}
  );
};

const wrapBlock = (header, lines) => [...header, ...lines, `<!-- END managed:${MEMORY_BLOCK_ID} -->`].join('\n');

/**
 * 生成写入用户级 MEMORY.md 的托管区块：只放摘要 + 触发条件 + 全文路径，不放规则正文。
 * 超预算时降级为纯索引，再超则裁剪并指向 manifest，保证注入上下文的体积可控。
 */
const buildMemoryBlock = (rows, budget = MEMORY_BLOCK_BUDGET) => {
  const list = rows.filter(row => row.type === 'rule' && row.alwaysApply);
  const header = [`<!-- BEGIN managed:${MEMORY_BLOCK_ID} -->`, '## 常驻规则（由 developer-document 技能管理同步，请勿手改）', '', '以下规则每次会话均须遵守；命中对应场景时须先加载对应技能读取全文。', ''];
  const skillPath = name => `~/.workbuddy/skills/${name}/SKILL.md`;
  const full = list.map(row => `- **${row.name}**：${pickSummary(row)}。全文：\`${skillPath(row.name)}\``);
  const index = list.map(row => `- **${row.name}**：\`${skillPath(row.name)}\``);

  let degraded = false;
  let content = wrapBlock(header, full);
  if (content.length > budget) {
    degraded = true;
    content = wrapBlock(header, index);
  }
  if (content.length > budget) {
    const kept = [];
    index.forEach(line => {
      if (wrapBlock(header, [...kept, line]).length <= budget) {
        kept.push(line);
      }
    });
    const omitted = index.length - kept.length;
    if (omitted > 0) {
      kept.push(`- …另有 ${omitted} 条常驻规则，完整清单见 ~/.kne_document/skill-install-manifest.json`);
    }
    content = wrapBlock(header, kept);
    if (content.length > budget) {
      content = wrapBlock(header, [`- 共 ${index.length} 条常驻规则，完整清单见 ~/.kne_document/skill-install-manifest.json`]);
    }
  }

  return {
    scope: 'user',
    path: MEMORY_BLOCK_PATH,
    blockId: MEMORY_BLOCK_ID,
    strategy: 'replace-managed-block',
    budget,
    degraded,
    contentHash: sha256(content),
    content
  };
};

const buildInstallManifest = ({ rows = [], target, generatedAt, includeClosed = false }) => {
  assertTarget(target);
  const list = rows
    .map(toPlain)
    .filter(row => includeClosed || (row.status || 'active') === 'active')
    .sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)));

  // WorkBuddy 下 rule 与 skill 同名会落进同一个 skills/<name> 目录
  if (target === 'workbuddy') {
    const seen = new Set();
    list.forEach(row => {
      if (seen.has(row.name)) {
        throw new Error(`WorkBuddy 目标下「${row.name}」同时存在 rule 与 skill，会写入同一目录，请在后台改名后再导出`);
      }
      seen.add(row.name);
    });
  }

  const files = list.map(row => formatSkillFile(row, target));
  const memoryBlocks = target === 'workbuddy' ? [buildMemoryBlock(list)] : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    target,
    generator: GENERATOR,
    generatedAt: generatedAt || new Date().toISOString(),
    total: files.length,
    files,
    memoryBlocks
  };
};

module.exports = {
  SCHEMA_VERSION,
  TARGET_VALUES,
  MEMORY_BLOCK_ID,
  MEMORY_BLOCK_PATH,
  MEMORY_BLOCK_BUDGET,
  sha256,
  renderFrontmatter,
  stripFrontmatter,
  formatSkillFile,
  buildMemoryBlock,
  buildInstallManifest
};
