/**
 * 「查看上下文」弹窗的数据整理：纯函数，便于单测。
 * 只整理 getRun / runDetail 已经返回的字段，不改业务语义，不编造内容，不把租约等敏感字段提到结构化主视图。
 * 原始 contextSnapshot / outputs 原样保留，供次要查看与复制。
 */

const { parseOccurredAt, formatShanghaiTime } = require('./testExecution');

/** 结构化主视图不突出展示这些字段；若它们本来就在快照/产出 JSON 里，仍留在原始 JSON 中。 */
const SENSITIVE_KEYS = Object.freeze(['leaseId', 'idempotencyKey', 'token', 'checkToken', 'password', 'secret', 'authorization', 'cookie', 'hashedToken', 'accessToken', 'refreshToken']);

const KNOWN_SNAPSHOT_KEYS = Object.freeze(['flowId', 'stage', 'goal', 'templates', 'deliverables', 'exitProgress', 'suggestedQueries', 'workItemKey']);
const KNOWN_OUTPUT_KEYS = Object.freeze(['summary', 'openQuestions', 'draft', 'decomposition', 'retryAfter']);
const KNOWN_EVENT_KEYS = Object.freeze(['at', 'tool', 'action', 'target', 'result', 'actorUserId', 'actorType']);

const RUN_STATUS_VALUES = Object.freeze(['claimed', 'running', 'awaiting_human', 'succeeded', 'failed', 'abandoned', 'blocked']);

function isPresent(value) {
  if (value == null || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.some(item => String(key).toLowerCase() === item.toLowerCase());
}

function omitSensitive(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value && typeof value === 'object' ? value : {};
  }
  const next = {};
  Object.keys(value).forEach(key => {
    if (!isSensitiveKey(key)) {
      next[key] = value[key];
    }
  });
  return next;
}

function cloneJson(value) {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function stableStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return '';
  }
}

function normalizeTemplates(templates) {
  if (!Array.isArray(templates)) {
    return [];
  }
  return templates
    .map(item => {
      if (typeof item === 'string' && item.trim()) {
        return { code: item.trim(), name: '', contentType: '', required: null, acceptCriteria: '' };
      }
      if (item && typeof item === 'object') {
        return {
          code: item.code ? String(item.code) : '',
          name: item.name ? String(item.name) : '',
          contentType: item.contentType ? String(item.contentType) : '',
          required: typeof item.required === 'boolean' ? item.required : null,
          acceptCriteria: item.acceptCriteria ? String(item.acceptCriteria) : ''
        };
      }
      return null;
    })
    .filter(item => item && (item.code || item.name));
}

function normalizeDeliverable(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const checklist = Array.isArray(item.checklist) ? item.checklist : [];
  const options = Array.isArray(item.options) ? item.options : [];
  const sourceRefs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  return {
    id: item.id != null ? String(item.id) : '',
    templateCode: item.templateCode ? String(item.templateCode) : '',
    name: item.name ? String(item.name) : item.templateCode ? String(item.templateCode) : '',
    contentType: item.contentType ? String(item.contentType) : '',
    status: item.status ? String(item.status) : '',
    required: typeof item.required === 'boolean' ? item.required : null,
    fileId: item.fileId,
    fileName: item.fileName || '',
    url: item.url || '',
    content: item.content || '',
    checklist,
    options,
    sourceRefs,
    acceptCriteria: item.acceptCriteria || '',
    reviewRemark: item.reviewRemark || '',
    producedBy: item.producedBy || '',
    confidence: item.confidence == null ? null : item.confidence
  };
}

function hasDeliverableBody(item) {
  if (!item) {
    return false;
  }
  return isPresent(item.fileId) || isPresent(item.fileName) || isPresent(item.url) || isPresent(item.content) || item.checklist.length > 0 || item.options.length > 0 || isPresent(item.reviewRemark);
}

function parseExitProgress(exitProgress) {
  if (!exitProgress || typeof exitProgress !== 'object' || Array.isArray(exitProgress)) {
    return null;
  }
  const summary = exitProgress.summary && typeof exitProgress.summary === 'object' && !Array.isArray(exitProgress.summary) ? exitProgress.summary : null;
  return {
    canAdvance: exitProgress.canAdvance === true,
    hasCanAdvance: typeof exitProgress.canAdvance === 'boolean',
    missing: Array.isArray(exitProgress.missing) ? exitProgress.missing : [],
    blockingChildren: Array.isArray(exitProgress.blockingChildren) ? exitProgress.blockingChildren : [],
    waiting: Array.isArray(exitProgress.waiting) ? exitProgress.waiting : [],
    summary,
    action: exitProgress.action || '',
    fromStage: exitProgress.fromStage || ''
  };
}

function parseOutputs(outputs) {
  const empty = { summary: '', openQuestions: [], draft: [], decomposition: null, retryAfter: null, others: {}, hasContent: false };
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    return empty;
  }
  const questions = Array.isArray(outputs.openQuestions) ? outputs.openQuestions.filter(item => item != null && String(item).trim()) : [];
  const draft = Array.isArray(outputs.draft) ? outputs.draft : [];
  const others = omitSensitive(
    Object.keys(outputs).reduce((acc, key) => {
      if (!KNOWN_OUTPUT_KEYS.includes(key)) {
        acc[key] = outputs[key];
      }
      return acc;
    }, {})
  );
  const summary = outputs.summary == null ? '' : typeof outputs.summary === 'string' ? outputs.summary : stableStringify(outputs.summary);
  const hasContent = isPresent(summary) || questions.length > 0 || draft.length > 0 || isPresent(outputs.decomposition) || isPresent(outputs.retryAfter) || isPresent(others);
  return {
    summary,
    openQuestions: questions,
    draft,
    decomposition: isPresent(outputs.decomposition) ? outputs.decomposition : null,
    retryAfter: isPresent(outputs.retryAfter) ? outputs.retryAfter : null,
    others,
    hasContent
  };
}

function parseEvents(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  const rows = events.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return { index, at: null, occurred: parseOccurredAt(null), tool: '', action: '', target: '', result: '', actorUserId: '', actorType: '', extra: {}, raw: item };
    }
    const extra = omitSensitive(
      Object.keys(item).reduce((acc, key) => {
        if (!KNOWN_EVENT_KEYS.includes(key)) {
          acc[key] = item[key];
        }
        return acc;
      }, {})
    );
    return {
      index,
      at: item.at || null,
      occurred: parseOccurredAt(item.at),
      tool: item.tool ? String(item.tool) : '',
      action: item.action ? String(item.action) : '',
      target: item.target != null && item.target !== '' ? String(item.target) : '',
      result: item.result ? String(item.result) : '',
      actorUserId: item.actorUserId != null && item.actorUserId !== '' ? String(item.actorUserId) : '',
      actorType: item.actorType ? String(item.actorType) : '',
      extra,
      raw: item
    };
  });
  // 按真实 at 升序；没有有效时间的排在后面，不用当前时间顶替，不打乱缺失项的相对顺序
  return rows.slice().sort((a, b) => {
    const aOk = a.occurred.ok && !a.occurred.missing;
    const bOk = b.occurred.ok && !b.occurred.missing;
    if (aOk && bOk) {
      if (a.occurred.ms !== b.occurred.ms) {
        return a.occurred.ms - b.occurred.ms;
      }
      return a.index - b.index;
    }
    if (aOk) {
      return -1;
    }
    if (bOk) {
      return 1;
    }
    return a.index - b.index;
  });
}

function parseSnapshot(snapshot) {
  const empty = { flowId: '', stage: '', goal: '', workItemKey: '', templates: [], deliverables: [], exitProgress: null, suggestedQueries: [], others: {}, hasContent: false };
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return empty;
  }
  const templates = normalizeTemplates(snapshot.templates);
  const deliverables = Array.isArray(snapshot.deliverables) ? snapshot.deliverables.map(normalizeDeliverable).filter(Boolean) : [];
  const suggestedQueries = Array.isArray(snapshot.suggestedQueries) ? snapshot.suggestedQueries.filter(item => typeof item === 'string' && item.trim()) : [];
  const others = omitSensitive(
    Object.keys(snapshot).reduce((acc, key) => {
      if (!KNOWN_SNAPSHOT_KEYS.includes(key)) {
        acc[key] = snapshot[key];
      }
      return acc;
    }, {})
  );
  const exitProgress = parseExitProgress(snapshot.exitProgress);
  const hasContent =
    isPresent(snapshot.flowId) ||
    isPresent(snapshot.stage) ||
    isPresent(snapshot.goal) ||
    isPresent(snapshot.workItemKey) ||
    templates.length > 0 ||
    deliverables.length > 0 ||
    !!exitProgress ||
    suggestedQueries.length > 0 ||
    isPresent(others);
  return {
    flowId: snapshot.flowId != null ? String(snapshot.flowId) : '',
    stage: snapshot.stage ? String(snapshot.stage) : '',
    goal: snapshot.goal ? String(snapshot.goal) : '',
    workItemKey: snapshot.workItemKey ? String(snapshot.workItemKey) : '',
    templates,
    deliverables,
    exitProgress,
    suggestedQueries,
    others,
    hasContent
  };
}

function parsePriorityReasons(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        const text = item.reason || item.message || item.text || item.label || '';
        return text ? String(text) : stableStringify(item);
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * 把一次 AI run 详情整理成弹窗可分组呈现的结构。
 * 不读取、不请求额外接口；敏感字段不进入 structured 主视图。
 */
function parseAiRunContext(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      empty: true,
      sections: [],
      runId: '',
      status: '',
      goal: '',
      stage: '',
      model: '',
      clientName: '',
      error: '',
      startedAt: null,
      finishedAt: null,
      startedTime: formatShanghaiTime(null),
      finishedTime: formatShanghaiTime(null),
      snapshot: parseSnapshot(null),
      outputs: parseOutputs(null),
      events: [],
      priorityReasons: [],
      raw: { contextSnapshot: undefined, outputs: undefined },
      rawText: { contextSnapshot: '', outputs: '' }
    };
  }
  const runId = data.runId != null ? String(data.runId) : data.id != null ? String(data.id) : '';
  const stage = data.stage || (data.contextSnapshot && data.contextSnapshot.stage) || '';
  const goal = data.goal || (data.contextSnapshot && data.contextSnapshot.goal) || '';
  const snapshot = parseSnapshot(data.contextSnapshot);
  const outputs = parseOutputs(data.outputs);
  const events = parseEvents(data.events);
  const priorityReasons = parsePriorityReasons(data.priorityReasons);
  const rawContext = data.contextSnapshot;
  const rawOutputs = data.outputs;
  const hasRawContext = rawContext !== undefined && rawContext !== null;
  const hasRawOutputs = rawOutputs !== undefined && rawOutputs !== null;
  const sections = [];
  const hasSummary =
    isPresent(runId) || isPresent(data.status) || isPresent(stage) || isPresent(goal) || isPresent(data.model) || isPresent(data.clientName) || isPresent(data.error) || isPresent(data.startedAt) || isPresent(data.finishedAt);
  if (hasSummary) {
    sections.push('summary');
  }
  if (outputs.hasContent) {
    sections.push('outputs');
  }
  if (snapshot.hasContent) {
    sections.push('snapshot');
  }
  if (events.length) {
    sections.push('events');
  }
  if (priorityReasons.length) {
    sections.push('dispatch');
  }
  if (hasRawContext || hasRawOutputs) {
    sections.push('raw');
  }
  const empty = !hasSummary && !outputs.hasContent && !snapshot.hasContent && events.length === 0 && priorityReasons.length === 0 && !hasRawContext && !hasRawOutputs;
  return {
    empty,
    sections,
    runId,
    status: data.status ? String(data.status) : '',
    goal: goal ? String(goal) : '',
    stage: stage ? String(stage) : '',
    model: data.model ? String(data.model) : '',
    clientName: data.clientName ? String(data.clientName) : '',
    error: data.error ? String(data.error) : '',
    startedAt: data.startedAt || null,
    finishedAt: data.finishedAt || null,
    startedTime: formatShanghaiTime(data.startedAt),
    finishedTime: formatShanghaiTime(data.finishedAt),
    statusMeta: resolveRunStatus(data.status ? String(data.status) : ''),
    stageMeta: resolveStage(stage ? String(stage) : ''),
    goalMeta: resolveGoal(goal ? String(goal) : ''),
    snapshot,
    outputs,
    events,
    priorityReasons,
    raw: { contextSnapshot: hasRawContext ? cloneJson(rawContext) : undefined, outputs: hasRawOutputs ? cloneJson(rawOutputs) : undefined },
    rawText: {
      contextSnapshot: hasRawContext ? stableStringify(rawContext) : '',
      outputs: hasRawOutputs ? stableStringify(rawOutputs) : ''
    }
  };
}

const STAGE_CODES = Object.freeze(['requirement', 'product_design', 'development', 'testing', 'pre_release']);
const QUEUE_GOAL_CODES = Object.freeze(['draft', 'review_ready', 'release', 'unblock', 'decompose', 'converge']);
const DELIVERABLE_STATUS_CODES = Object.freeze(['pending', 'ai_draft', 'submitted', 'accepted', 'rejected', 'waived']);

function toCamel(code) {
  return String(code || '').replace(/_([a-z0-9])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 把存储 code 映射到已有 i18n key，不在这里写死展示文案。
 * 未知 code 不把原文当成标签，交给 unknown messageId，values.code 留给「未知（code）」展示。
 */
function resolveCodedLabel(code, knownCodes, messageIdForKnown, unknownMessageId) {
  const value = code == null ? '' : String(code).trim();
  if (!value) {
    return { empty: true, known: false, code: '', messageId: '', values: {} };
  }
  if (knownCodes.indexOf(value) !== -1) {
    return { empty: false, known: true, code: value, messageId: messageIdForKnown(value), values: {} };
  }
  return { empty: false, known: false, code: value, messageId: unknownMessageId, values: { code: value } };
}

function resolveRunStatus(status) {
  const resolved = resolveCodedLabel(status, RUN_STATUS_VALUES, value => 'adminFlow.ai.status.' + toCamel(value), 'adminFlow.ai.status.unknown');
  resolved.tone = resolved.empty ? 'default' : runStatusTone(resolved.known ? resolved.code : '');
  return resolved;
}

function resolveStage(stage) {
  return resolveCodedLabel(stage, STAGE_CODES, value => 'adminFlow.stage.' + toCamel(value), 'adminFlow.ai.stage.unknown');
}

function resolveGoal(goal) {
  return resolveCodedLabel(goal, QUEUE_GOAL_CODES, value => 'adminFlow.queue.goal.' + toCamel(value), 'adminFlow.ai.goal.unknown');
}

function resolveDeliverableStatus(status) {
  return resolveCodedLabel(status, DELIVERABLE_STATUS_CODES, value => 'adminFlow.deliverable.status.' + toCamel(value), 'adminFlow.ai.status.unknown');
}

function runStatusTone(status) {
  if (status === 'succeeded') {
    return 'success';
  }
  if (status === 'failed' || status === 'blocked') {
    return 'error';
  }
  if (status === 'running' || status === 'claimed') {
    return 'processing';
  }
  if (status === 'awaiting_human') {
    return 'warning';
  }
  return 'default';
}

function eventTone(result) {
  if (result === 'ok' || result === 'succeeded' || result === 'running' || result === 'claimed') {
    return 'green';
  }
  if (result === 'failed' || result === 'blocked' || result === 'error') {
    return 'red';
  }
  if (result === 'abandoned' || result === 'pending' || result === 'awaiting_human') {
    return 'orange';
  }
  return 'gray';
}

function defaultOpenSections(sections) {
  const list = Array.isArray(sections) ? sections : [];
  return list.filter(item => item !== 'raw');
}

function sectionHasContent(parsed, section) {
  if (!parsed || parsed.empty) {
    return false;
  }
  return (parsed.sections || []).includes(section);
}

module.exports = {
  SENSITIVE_KEYS,
  KNOWN_SNAPSHOT_KEYS,
  KNOWN_OUTPUT_KEYS,
  RUN_STATUS_VALUES,
  STAGE_CODES,
  QUEUE_GOAL_CODES,
  DELIVERABLE_STATUS_CODES,
  toCamel,
  resolveCodedLabel,
  resolveRunStatus,
  resolveStage,
  resolveGoal,
  resolveDeliverableStatus,
  isPresent,
  isSensitiveKey,
  omitSensitive,
  stableStringify,
  normalizeTemplates,
  normalizeDeliverable,
  hasDeliverableBody,
  parseExitProgress,
  parseOutputs,
  parseEvents,
  parseSnapshot,
  parsePriorityReasons,
  parseAiRunContext,
  runStatusTone,
  eventTone,
  defaultOpenSections,
  sectionHasContent
};
