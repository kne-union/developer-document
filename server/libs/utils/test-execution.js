/**
 * 测试步骤 / 截图关联、回归记录时间线：纯函数，供服务端与前端共用。
 *
 * 实现必须留在 server/libs 内。生产镜像只把 server 复制到 /node-app，
 * 不能再 require 仓库根目录的 src/。前端通过
 * src/components/AdminFlowManagement/testExecution.js 再导出本模块。
 *
 * 关联规则：
 * - 只认明确的 stepId / caseId / runId，不用数组位置、不用文件名猜测。
 * - 截图 stepId 对不上任何步骤，或没有 stepId，一律进入「未关联步骤」。
 * - 回归 occurredAt 必须是真实时间；缺失不编造（不用 updatedAt / submittedAt / 保存时刻顶替）。
 * - 自测记录（checklist / self_test）与回归记录互不读取。
 */

const TEST_CASES_TEMPLATE = 'test_cases';
const REGRESSION_TEMPLATE = 'regression_note';
const SELF_TEST_TEMPLATE = 'self_test';

const STEP_RESULTS = Object.freeze(['passed', 'failed', 'blocked', 'skipped', '']);
const REGRESSION_STATUSES = Object.freeze(['passed', 'failed', 'partial', 'blocked', '']);
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

const resolveFileId = value => {
  if (value == null || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.length ? resolveFileId(value[0]) : '';
  if (typeof value === 'object') {
    return resolveFileId(value.id != null ? value.id : value.fileId != null ? value.fileId : value.value != null ? value.value : '');
  }
  return '';
};

const isNonEmptyString = value => typeof value === 'string' && value.trim() !== '';

const parseOccurredAt = value => {
  if (value == null || value === '') return { ok: true, missing: true, ms: null, iso: null };
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) return { ok: false, missing: false, ms: null, iso: null };
    return { ok: true, missing: false, ms, iso: new Date(ms).toISOString() };
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return { ok: false, missing: false, ms: null, iso: null };
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return { ok: false, missing: false, ms: null, iso: null };
  return { ok: true, missing: false, ms, iso: new Date(ms).toISOString() };
};

const formatShanghaiTime = value => {
  const parsed = parseOccurredAt(value);
  if (!parsed.ok || parsed.missing) {
    return { ok: false, missing: !!parsed.missing, text: '', timeZone: SHANGHAI_TIME_ZONE };
  }
  const text = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(parsed.ms));
  return { ok: true, missing: false, text, timeZone: SHANGHAI_TIME_ZONE };
};

const createExplicitId = generateId => {
  if (typeof generateId === 'function') {
    const created = generateId();
    if (isNonEmptyString(String(created || ''))) return String(created);
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const collectStructuredFileIds = (payload = {}) => {
  const ids = [];
  const push = value => {
    const id = resolveFileId(value);
    if (id) ids.push(id);
  };
  push(payload.fileId);
  const walkShots = list => {
    if (!Array.isArray(list)) return;
    list.forEach(item => item && push(item.fileId || item));
  };
  const walkOptions = options => {
    if (!Array.isArray(options)) return;
    options.forEach(item => {
      if (!item) return;
      push(item.fileId);
      walkShots(item.screenshots);
      if (Array.isArray(item.steps)) {
        item.steps.forEach(step => {
          if (step) walkShots(step.screenshots);
        });
      }
    });
  };
  walkOptions(payload.options);
  return [...new Set(ids)];
};

const compareDisplayOrder = (left, right) => {
  const leftOrder = left && left.order !== undefined && left.order !== null && left.order !== '' && Number.isFinite(Number(left.order)) ? Number(left.order) : null;
  const rightOrder = right && right.order !== undefined && right.order !== null && right.order !== '' && Number.isFinite(Number(right.order)) ? Number(right.order) : null;
  if (leftOrder != null && rightOrder != null && leftOrder !== rightOrder) return leftOrder - rightOrder;
  if (leftOrder != null && rightOrder == null) return -1;
  if (leftOrder == null && rightOrder != null) return 1;
  return 0;
};

const parseTestExecution = (item = {}) => {
  const cases = [];
  const files = [];

  if (item.templateCode === SELF_TEST_TEMPLATE) {
    return { cases: [], unlinkedScreenshots: [], documents: [] };
  }

  if (item.contentType === 'file') {
    const id = resolveFileId(item.fileId);
    if (id) {
      files.push({ type: 'file', fileId: id, fileName: item.fileName || id, stepId: null, caseId: null, kind: 'document', label: item.fileName || id });
    }
  }

  const options = Array.isArray(item.options) ? item.options : [];
  options.forEach(option => {
    if (!option) return;
    if (option.type === 'test_case') {
      cases.push({
        caseId: isNonEmptyString(option.caseId) ? String(option.caseId).trim() : '',
        label: option.label ? String(option.label) : '',
        steps: Array.isArray(option.steps)
          ? option.steps.map(step => ({
              stepId: step && isNonEmptyString(step.stepId) ? String(step.stepId).trim() : '',
              name: step && step.name ? String(step.name) : '',
              order: step && step.order !== undefined && step.order !== null && step.order !== '' && Number.isFinite(Number(step.order)) ? Number(step.order) : null,
              result: step && STEP_RESULTS.includes(step.result) ? step.result : '',
              remark: step && step.remark ? String(step.remark) : '',
              screenshots: []
            }))
          : []
      });
      return;
    }
    if (option.type === 'file' || option.fileId) {
      const fileId = resolveFileId(option.fileId);
      if (!fileId) return;
      files.push({
        type: 'file',
        fileId,
        fileName: option.fileName || fileId,
        label: option.label || option.fileName || fileId,
        stepId: isNonEmptyString(option.stepId) ? String(option.stepId).trim() : null,
        caseId: isNonEmptyString(option.caseId) ? String(option.caseId).trim() : null,
        kind: option.kind === 'document' ? 'document' : option.kind === 'screenshot' ? 'screenshot' : ''
      });
    }
  });

  const stepMap = new Map();
  cases.forEach(testCase => {
    testCase.steps = testCase.steps.slice().sort(compareDisplayOrder);
    testCase.steps.forEach(step => {
      if (step.stepId) stepMap.set(step.stepId, step);
    });
  });

  const unlinkedScreenshots = [];
  const documents = [];
  files.forEach(file => {
    if (file.kind === 'document' && !file.stepId) {
      documents.push(file);
      return;
    }
    if (file.stepId && stepMap.has(file.stepId)) {
      stepMap.get(file.stepId).screenshots.push(file);
      return;
    }
    unlinkedScreenshots.push(file);
  });

  return { cases, unlinkedScreenshots, documents };
};

const flattenSteps = parsed => {
  const steps = [];
  (parsed && parsed.cases ? parsed.cases : []).forEach(testCase => {
    (testCase.steps || []).forEach(step => {
      steps.push({
        stepId: step.stepId,
        name: step.name,
        result: step.result,
        order: step.order,
        caseId: testCase.caseId,
        caseLabel: testCase.label,
        screenshots: step.screenshots || []
      });
    });
  });
  return steps;
};

const lookupStep = (steps, stepId) => {
  if (!isNonEmptyString(stepId)) return null;
  const id = String(stepId).trim();
  return (steps || []).find(step => step.stepId === id) || null;
};

const parseRegressionRuns = (item = {}) => {
  if (item.templateCode === SELF_TEST_TEMPLATE || item.contentType === 'checklist') {
    return { runs: [] };
  }
  const runs = [];
  const options = Array.isArray(item.options) ? item.options : [];
  options.forEach(option => {
    if (!option || option.type !== 'regression_run') return;
    const occurred = parseOccurredAt(option.occurredAt);
    runs.push({
      runId: isNonEmptyString(option.runId) ? String(option.runId).trim() : '',
      occurredAt: occurred.ok && !occurred.missing ? occurred.iso : null,
      occurredInvalid: !occurred.ok,
      status: option.status && REGRESSION_STATUSES.includes(option.status) ? option.status : '',
      operatorName: option.operatorName ? String(option.operatorName) : '',
      operatorUserId: option.operatorUserId ? String(option.operatorUserId) : '',
      content: option.content ? String(option.content) : '',
      stepIds: Array.isArray(option.stepIds) ? option.stepIds.filter(id => isNonEmptyString(id)).map(id => String(id).trim()) : [],
      screenshots: Array.isArray(option.screenshots)
        ? option.screenshots
            .map(shot => {
              const fileId = resolveFileId(shot && shot.fileId);
              if (!fileId) return null;
              return { fileId, fileName: (shot && shot.fileName) || fileId };
            })
            .filter(Boolean)
        : [],
      plainText: false
    });
  });

  if (!runs.length && isNonEmptyString(item.content) && (item.templateCode === REGRESSION_TEMPLATE || item.contentType === 'text')) {
    runs.push({
      runId: '',
      occurredAt: null,
      occurredInvalid: false,
      status: '',
      operatorName: '',
      operatorUserId: '',
      content: String(item.content),
      stepIds: [],
      screenshots: [],
      plainText: true
    });
  }

  return { runs };
};

const buildRegressionTimeline = (runs = []) => {
  const timed = [];
  const untimed = [];
  runs.forEach(run => {
    const parsed = parseOccurredAt(run && run.occurredAt);
    if (parsed.ok && !parsed.missing) {
      timed.push({ run, ms: parsed.ms });
    } else {
      untimed.push({ run });
    }
  });
  timed.sort((left, right) => {
    if (left.ms !== right.ms) return left.ms - right.ms;
    return String((left.run && left.run.runId) || '').localeCompare(String((right.run && right.run.runId) || ''));
  });
  untimed.sort((left, right) => String((left.run && left.run.runId) || '').localeCompare(String((right.run && right.run.runId) || '')));
  const timedRuns = timed.map(item => item.run);
  const untimedRuns = untimed.map(item => item.run);
  return { timed: timedRuns, untimed: untimedRuns, items: timedRuns.concat(untimedRuns) };
};

const ensureExplicitIds = (options, generateId) => {
  if (!Array.isArray(options)) return [];
  return options.map(item => {
    if (!item) return item;
    if (item.type === 'test_case') {
      const caseId = isNonEmptyString(item.caseId) ? String(item.caseId).trim() : createExplicitId(generateId);
      const steps = Array.isArray(item.steps)
        ? item.steps.map(step => {
            if (!step) return step;
            return Object.assign({}, step, {
              stepId: isNonEmptyString(step.stepId) ? String(step.stepId).trim() : createExplicitId(generateId)
            });
          })
        : [];
      return Object.assign({}, item, { caseId, steps });
    }
    if (item.type === 'regression_run') {
      return Object.assign({}, item, {
        runId: isNonEmptyString(item.runId) ? String(item.runId).trim() : createExplicitId(generateId)
      });
    }
    return item;
  });
};

const validateTestCasesOptions = options => {
  if (!Array.isArray(options)) {
    throw new Error('test_cases.options 必须是数组');
  }
  if (options.length > 200) {
    throw new Error('test_cases.options 最多 200 项');
  }
  const caseIds = new Set();
  const stepIds = new Set();
  options.forEach((item, index) => {
    if (!item || !['test_case', 'file'].includes(item.type)) {
      throw new Error(`test_cases.options[${index}].type 必须是 test_case 或 file`);
    }
    if (item.type === 'test_case') {
      if (!isNonEmptyString(item.caseId)) {
        throw new Error(`test_cases.options[${index}].caseId 必须是明确的用例标识，不能用数组位置代替`);
      }
      const caseId = String(item.caseId).trim();
      if (caseIds.has(caseId)) {
        throw new Error(`重复的 caseId：${caseId}`);
      }
      caseIds.add(caseId);
      if (!isNonEmptyString(item.label) || String(item.label).length > 200) {
        throw new Error(`test_cases.options[${index}].label 必填且不超过 200 字`);
      }
      if (item.steps && !Array.isArray(item.steps)) {
        throw new Error(`test_cases.options[${index}].steps 必须是数组`);
      }
      (item.steps || []).forEach((step, stepIndex) => {
        if (!step || !isNonEmptyString(step.stepId)) {
          throw new Error(`test_cases.options[${index}].steps[${stepIndex}] 必须有明确的 stepId，不能用数组位置或文件名代替关联`);
        }
        const stepId = String(step.stepId).trim();
        if (stepIds.has(stepId)) {
          throw new Error(`重复的 stepId：${stepId}`);
        }
        stepIds.add(stepId);
        if (!isNonEmptyString(step.name) || String(step.name).length > 200) {
          throw new Error(`步骤 ${stepId} 的名称必填且不超过 200 字`);
        }
        if (step.result && !STEP_RESULTS.includes(step.result)) {
          throw new Error(`步骤 ${stepId} 的 result 不合法`);
        }
      });
      return;
    }
    if (!resolveFileId(item.fileId) || !isNonEmptyString(item.fileName)) {
      throw new Error(`test_cases.options[${index}] 为 file 时必须有 fileId 与 fileName`);
    }
    if (item.stepId != null && item.stepId !== '' && typeof item.stepId !== 'string') {
      throw new Error(`test_cases.options[${index}].stepId 必须是字符串形式的明确标识`);
    }
  });
  return true;
};

const validateRegressionOptions = options => {
  if (!Array.isArray(options)) {
    throw new Error('regression_note.options 必须是数组');
  }
  if (options.length > 200) {
    throw new Error('regression_note.options 最多 200 项');
  }
  const runIds = new Set();
  options.forEach((item, index) => {
    if (!item || item.type !== 'regression_run') {
      throw new Error(`regression_note.options[${index}].type 必须是 regression_run`);
    }
    if (!isNonEmptyString(item.runId)) {
      throw new Error(`regression_note.options[${index}].runId 必须是明确标识`);
    }
    const runId = String(item.runId).trim();
    if (runIds.has(runId)) {
      throw new Error(`重复的 runId：${runId}`);
    }
    runIds.add(runId);
    const occurred = parseOccurredAt(item.occurredAt);
    if (!occurred.ok) {
      throw new Error(`regression_note.options[${index}].occurredAt 不是有效时间，禁止写入非法值或编造`);
    }
    if (item.status && !REGRESSION_STATUSES.includes(item.status)) {
      throw new Error(`regression_note.options[${index}].status 不合法`);
    }
    if (item.content && String(item.content).length > 5000) {
      throw new Error(`regression_note.options[${index}].content 最长 5000 字`);
    }
    if (item.stepIds && !Array.isArray(item.stepIds)) {
      throw new Error(`regression_note.options[${index}].stepIds 必须是数组`);
    }
    (item.stepIds || []).forEach((stepId, stepIndex) => {
      if (!isNonEmptyString(stepId)) {
        throw new Error(`regression_note.options[${index}].stepIds[${stepIndex}] 必须是明确的步骤标识，不得用空值或序号占位`);
      }
    });
    if (item.screenshots && !Array.isArray(item.screenshots)) {
      throw new Error(`regression_note.options[${index}].screenshots 必须是数组`);
    }
    (item.screenshots || []).forEach((shot, shotIndex) => {
      if (!shot || !resolveFileId(shot.fileId) || !isNonEmptyString(shot.fileName)) {
        throw new Error(`regression_note.options[${index}].screenshots[${shotIndex}] 必须有 fileId 与 fileName`);
      }
    });
    if (item.operatorName && String(item.operatorName).length > 200) {
      throw new Error(`regression_note.options[${index}].operatorName 不超过 200 字`);
    }
  });
  return true;
};

const hasTestExecutionValue = parsed => {
  if (!parsed) return false;
  if ((parsed.documents || []).length || (parsed.unlinkedScreenshots || []).length) return true;
  return (parsed.cases || []).some(testCase => isNonEmptyString(testCase.label) || (testCase.steps || []).some(step => isNonEmptyString(step.name) || (step.screenshots || []).length));
};

const hasRegressionValue = parsed => {
  if (!parsed) return false;
  return (parsed.runs || []).some(run => isNonEmptyString(run.content) || run.occurredAt || (run.screenshots || []).length || (run.stepIds || []).length || isNonEmptyString(run.status) || isNonEmptyString(run.operatorName));
};

const serializeTestCasesForm = (formData = {}, generateId) => {
  const options = [];
  (formData.cases || []).forEach(testCase => {
    const caseId = isNonEmptyString(testCase.caseId) ? String(testCase.caseId).trim() : createExplicitId(generateId);
    const steps = (testCase.steps || []).map(step => {
      const stepId = isNonEmptyString(step.stepId) ? String(step.stepId).trim() : createExplicitId(generateId);
      (step.screenshots || []).forEach(shot => {
        const fileId = resolveFileId(shot && shot.fileId);
        if (!fileId) return;
        const fileName = (shot && (shot.fileName || shot.filename || shot.name)) || fileId;
        options.push({ type: 'file', label: fileName, fileId, fileName, stepId, caseId, kind: 'screenshot' });
      });
      const orderValue = step && step.order !== undefined && step.order !== null && step.order !== '' && Number.isFinite(Number(step.order)) ? Number(step.order) : null;
      return {
        stepId,
        name: step && step.name ? String(step.name).trim() : '',
        order: orderValue,
        result: step && isNonEmptyString(step.result) ? String(step.result).trim() : step && step.result && step.result.value ? String(step.result.value) : '',
        remark: step && step.remark ? String(step.remark) : ''
      };
    });
    options.push({ type: 'test_case', caseId, label: testCase.label ? String(testCase.label).trim() : '', steps });
  });
  const pushLooseFiles = (list, kind) => {
    (list || []).forEach(shot => {
      const fileId = resolveFileId(shot && shot.fileId);
      if (!fileId) return;
      const fileName = (shot && (shot.fileName || shot.filename || shot.name)) || fileId;
      options.push({ type: 'file', label: fileName, fileId, fileName, stepId: null, kind });
    });
  };
  pushLooseFiles(formData.unlinkedScreenshots, 'screenshot');
  pushLooseFiles(formData.documents, 'document');
  return options;
};

const serializeRegressionForm = (formData = {}, generateId) => {
  return (formData.runs || []).map(run => {
    const occurred = parseOccurredAt(run && run.occurredAt);
    const stepIds = Array.isArray(run.stepIds)
      ? run.stepIds
          .map(value => {
            if (isNonEmptyString(value)) return String(value).trim();
            if (value && isNonEmptyString(value.value)) return String(value.value).trim();
            return '';
          })
          .filter(Boolean)
      : [];
    const screenshots = (run.screenshots || [])
      .map(shot => {
        const fileId = resolveFileId(shot && shot.fileId);
        if (!fileId) return null;
        return { fileId, fileName: (shot && (shot.fileName || shot.filename || shot.name)) || fileId };
      })
      .filter(Boolean);
    return {
      type: 'regression_run',
      runId: isNonEmptyString(run.runId) ? String(run.runId).trim() : createExplicitId(generateId),
      occurredAt: occurred.ok && !occurred.missing ? occurred.iso : null,
      status: run && isNonEmptyString(run.status) ? String(run.status).trim() : run && run.status && run.status.value ? String(run.status.value) : '',
      operatorName: run && run.operatorName ? String(run.operatorName).trim() : '',
      operatorUserId: run && run.operatorUserId ? String(run.operatorUserId).trim() : '',
      content: run && run.content ? String(run.content) : '',
      stepIds,
      screenshots,
      plainText: !!run.plainText
    };
  });
};

const toTestCasesFormData = item => {
  const parsed = parseTestExecution(item);
  return {
    cases: parsed.cases.map(testCase => ({
      caseId: testCase.caseId,
      label: testCase.label,
      steps: testCase.steps.map(step => ({
        stepId: step.stepId,
        name: step.name,
        order: step.order,
        result: step.result,
        remark: step.remark,
        screenshots: (step.screenshots || []).map(shot => ({ fileId: shot.fileId, fileName: shot.fileName }))
      }))
    })),
    unlinkedScreenshots: parsed.unlinkedScreenshots.map(shot => ({ fileId: shot.fileId, fileName: shot.fileName })),
    documents: parsed.documents.map(shot => ({ fileId: shot.fileId, fileName: shot.fileName }))
  };
};

const toRegressionFormData = item => {
  const parsed = parseRegressionRuns(item);
  return {
    runs: parsed.runs.map(run => ({
      runId: run.runId,
      occurredAt: run.occurredAt,
      status: run.status,
      operatorName: run.operatorName,
      operatorUserId: run.operatorUserId,
      content: run.content,
      stepIds: run.stepIds,
      screenshots: run.screenshots,
      plainText: run.plainText
    }))
  };
};

module.exports = {
  TEST_CASES_TEMPLATE,
  REGRESSION_TEMPLATE,
  SELF_TEST_TEMPLATE,
  STEP_RESULTS,
  REGRESSION_STATUSES,
  SHANGHAI_TIME_ZONE,
  resolveFileId,
  parseOccurredAt,
  formatShanghaiTime,
  createExplicitId,
  collectStructuredFileIds,
  parseTestExecution,
  flattenSteps,
  lookupStep,
  parseRegressionRuns,
  buildRegressionTimeline,
  ensureExplicitIds,
  validateTestCasesOptions,
  validateRegressionOptions,
  hasTestExecutionValue,
  hasRegressionValue,
  serializeTestCasesForm,
  serializeRegressionForm,
  toTestCasesFormData,
  toRegressionFormData
};
