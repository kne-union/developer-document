/**
 * 流程模块共享工具（放 utils，避免被自动扫描目录当成插件）。
 * 包含：带业务错误码的异常、一次性确认短链哈希、事件构造、引用校验。
 * checkToken 与限流见 ./flow-security-store.js（数据库实现，无内存 fallback）。
 */
const crypto = require('crypto');

const fail = (code, message) => {
  const error = new Error(message || code);
  error.code = code;
  return error;
};

const asId = value => (value === null || value === undefined ? null : String(value));

const plain = row => (row && typeof row.get === 'function' ? row.get({ plain: true }) : row);

const uid = prefix => `${prefix}${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;

const releaseId = () => uid('rel_');
const leaseId = () => uid('lease_');

// ---- 一次性真人确认短链：短码由 @kne/fastify-shorten 签发并解析，库里只存哈希 ----
// checkToken / 限流已迁到数据库，见 createFlowSecurity（flow-security-store.js），不保留内存 Map。
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

// ---- events 追加式审计 ----
const makeEvent = ({ tool, action, target, result, actorUserId, actorType = 'mcp-ai', extra = {} }) => ({
  at: new Date().toISOString(),
  tool: tool || 'unknown',
  action,
  target: target ? asId(target) : null,
  result: result || 'ok',
  actorUserId: asId(actorUserId),
  actorType,
  ...extra
});

const appendEvents = (row, events) => {
  const existing = Array.isArray(row.events) ? row.events : [];
  return [...existing, ...events].slice(-200);
};

// ---- 引用校验：杜绝 AI 编造引用 ----
const REF_TYPES = ['experience', 'document_index', 'worklog', 'url', 'file'];
const SAFE_URL = /^https?:\/\//i;
const REF_ALIASES = { doc: 'document_index', document: 'document_index', docs: 'document_index', experience: 'experience', exp: 'experience', worklog: 'worklog', log: 'worklog', file: 'file', url: 'url', link: 'url' };

/** 把引用统一解析成 { type, ref }；裸文本（如「已核验」）不可解析，直接判为伪造引用 */
const parseRef = value => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (SAFE_URL.test(trimmed)) return { type: 'url', ref: trimmed };
    const matched = trimmed.match(/^([a-z_]+):(.+)$/i);
    if (matched) {
      const type = REF_ALIASES[matched[1].toLowerCase()];
      return type ? { type, ref: matched[2].trim() } : null;
    }
    return null;
  }
  if (value && typeof value === 'object' && typeof value.ref === 'string' && value.ref.trim()) {
    const type = REF_ALIASES[String(value.type || '').toLowerCase()];
    return type ? { type, ref: value.ref.trim() } : null;
  }
  return null;
};

const validateSourceRefs = refs => {
  if (refs === undefined || refs === null) return [];
  if (!Array.isArray(refs)) throw fail('INVALID_SOURCE_REFS', 'sourceRefs 必须是数组');
  refs.forEach((ref, index) => {
    if (!ref || !REF_TYPES.includes(ref.type)) {
      throw fail('INVALID_SOURCE_REFS', `sourceRefs[${index}].type 必须是 ${REF_TYPES.join(' / ')}`);
    }
    if (!ref.ref || typeof ref.ref !== 'string') {
      throw fail('INVALID_SOURCE_REFS', `sourceRefs[${index}].ref 必填`);
    }
    if (ref.type === 'url' && !SAFE_URL.test(ref.ref)) {
      throw fail('INVALID_SOURCE_REFS', `sourceRefs[${index}] 的 url 必须以 http(s):// 开头`);
    }
    // 任意类型都不得夹带非 http(s) 的 url 字段，避免 javascript: / file: 协议混入
    if (ref.url !== undefined && ref.url !== null && !SAFE_URL.test(String(ref.url))) {
      throw fail('INVALID_SOURCE_REFS', `sourceRefs[${index}].url 协议不合法`);
    }
  });
  return refs;
};

/** 放行证据必须是结构化、可定位的引用，不能只塞一句「已核验」 */
const normalizeEvidenceRefs = refs => {
  if (!Array.isArray(refs) || refs.length === 0) throw fail('EVIDENCE_REQUIRED', '放行凭证缺少 evidenceRefs 原始证据引用');
  return refs.map((item, index) => {
    const parsed = parseRef(item);
    if (!parsed) throw fail('INVALID_EVIDENCE_REF', `evidenceRefs[${index}] 不是可解析引用，需为 {type, ref} 或 experience:/worklog:/doc:/file:/http(s) 前缀`);
    if (parsed.type === 'url' && !SAFE_URL.test(parsed.ref)) throw fail('INVALID_EVIDENCE_REF', `evidenceRefs[${index}] 的 url 必须以 http(s):// 开头`);
    return parsed;
  });
};

const suggestQueries = (stage, templateCodes = []) => {
  const prefix = stage || 'requirement';
  return [`search_worklog:${prefix} 阶段历史记录`, `search_experience:${prefix} 交付物`, `search_document_index:${templateCodes.slice(0, 2).join(' ')} 或相关组件文档`, 'fetch_docs:读取命中的文档正文'];
};

// ---- 交付物文件引用：收集需要校验存在性的 fileId ----
const collectFileRefs = ({ contentType, payload = {} }) => {
  const ids = [];
  if (contentType === 'file' && payload.fileId) ids.push(String(payload.fileId));
  if (contentType === 'jsonb' && Array.isArray(payload.options)) {
    payload.options.forEach(item => {
      if (item && item.type === 'file' && item.fileId) ids.push(String(item.fileId));
    });
  }
  return [...new Set(ids)];
};

module.exports = {
  fail,
  asId,
  plain,
  uid,
  releaseId,
  leaseId,
  hashToken,
  makeEvent,
  appendEvents,
  validateSourceRefs,
  normalizeEvidenceRefs,
  parseRef,
  collectFileRefs,
  suggestQueries
};
