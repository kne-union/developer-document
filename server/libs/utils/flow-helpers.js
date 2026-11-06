/**
 * 流程模块共享工具（放 utils，避免被自动扫描目录当成插件）。
 * 包含：带业务错误码的异常、短时 checkToken、一次性确认短链签名、简单限流、事件构造。
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

// ---- flow_release_check 的短时 checkToken（同一进程内有效，5 分钟） ----
const checkTokenStore = new Map();
const CHECK_TOKEN_TTL = 5 * 60 * 1000;

const issueCheckToken = payload => {
  const token = uid('relchk_');
  checkTokenStore.set(token, { ...payload, expiresAt: Date.now() + CHECK_TOKEN_TTL });
  return { checkToken: token, expiresIn: CHECK_TOKEN_TTL / 1000 };
};

const takeCheckToken = (token, expectedFlowId) => {
  const entry = checkTokenStore.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    checkTokenStore.delete(token);
    throw fail('CHECK_TOKEN_INVALID', 'checkToken 无效或已过期，请重新调用 flow_release_check');
  }
  if (expectedFlowId && asId(entry.flowId) !== asId(expectedFlowId)) {
    throw fail('CHECK_TOKEN_MISMATCH', 'checkToken 与当前流程不匹配');
  }
  return entry;
};

// ---- 一次性真人确认短链：短码由 @kne/fastify-shorten 签发并解析，库里只存哈希 ----
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

// ---- 简单限流：flowId + userId + 分钟，防 Agent 死循环刷写 ----
const rateStore = new Map();
const RATE_LIMIT_PER_MINUTE = 60;

const assertRateLimit = (flowId, userId) => {
  const key = `${flowId || '-'}:${userId || '-'}:${Math.floor(Date.now() / 60000)}`;
  const count = (rateStore.get(key) || 0) + 1;
  rateStore.set(key, count);
  if (rateStore.size > 5000) {
    for (const k of rateStore.keys()) {
      if (rateStore.size <= 2500) break;
      rateStore.delete(k);
    }
  }
  if (count > RATE_LIMIT_PER_MINUTE) {
    throw fail('RATE_LIMITED', '写入过于频繁，请稍后重试');
  }
  return true;
};

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
    if (ref.type === 'url' && !/^https?:\/\//i.test(ref.ref)) {
      throw fail('INVALID_SOURCE_REFS', `sourceRefs[${index}] 的 url 必须以 http(s):// 开头`);
    }
  });
  return refs;
};

const suggestQueries = (stage, templateCodes = []) => {
  const prefix = stage || 'requirement';
  return [`search_worklog:${prefix} 阶段历史记录`, `search_experience:${prefix} 交付物`, `search_document_index:${templateCodes.slice(0, 2).join(' ')} 或相关组件文档`, 'fetch_docs:读取命中的文档正文'];
};

module.exports = {
  fail,
  asId,
  plain,
  uid,
  releaseId,
  leaseId,
  issueCheckToken,
  takeCheckToken,
  hashToken,
  assertRateLimit,
  makeEvent,
  appendEvents,
  validateSourceRefs,
  suggestQueries
};
