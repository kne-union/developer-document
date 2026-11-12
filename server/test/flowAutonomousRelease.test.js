const test = require('node:test');
const assert = require('node:assert/strict');
const flowService = require('../libs/services/flow');
const { getTemplatesByStage } = require('../libs/utils/flow-deliverable-templates');

/**
 * 用轻量内存模型加载真实的 services.flow，覆盖「AI 自主驱动 + 人工撤回 / 打回」主链路。
 * 不连数据库：所有 Sequelize 调用都由下面的 stub 承接，事务只透传一个标记对象。
 */

const makeRow = initial => {
  const state = { ...initial };
  const target = {
    get: () => ({ ...state }),
    update: async patch => {
      Object.assign(state, patch);
      return target;
    }
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'get' || prop === 'update' || prop === '__state') return prop === '__state' ? state : t[prop];
      return state[prop];
    },
    set(t, prop, value) {
      state[prop] = value;
      return true;
    }
  });
};

const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => (value && typeof value === 'object' ? true : row[key] === value));

const makeEnv = async () => {
  const flowRow = makeRow({
    id: 'F1',
    code: 'FLOW-1',
    stage: 'testing',
    status: 'active',
    nodeType: 'testing',
    version: 3,
    ownerUserId: 'u_ai',
    createdUserId: 'u_ai',
    claimedByUserId: 'u_ai',
    participantIds: [],
    pausedAt: null,
    pausedStage: null,
    isAggregate: false,
    upstreamNodeIds: [],
    rootId: null,
    path: '/F1',
    depth: 0,
    priority: 'medium'
  });
  const deliverableRows = [
    makeRow({
      id: 'D1',
      flowId: 'F1',
      stage: 'testing',
      templateCode: 'test_report',
      name: '测试报告',
      required: true,
      status: 'submitted',
      verificationRequired: false,
      reviewedBy: null,
      reviewedByType: 'human',
      reviewedAt: null,
      reviewRemark: null,
      releaseId: null,
      version: 1,
      revisions: []
    }),
    makeRow({
      id: 'D2',
      flowId: 'F1',
      stage: 'testing',
      templateCode: 'defect_closure',
      name: '缺陷闭环',
      required: true,
      status: 'submitted',
      verificationRequired: false,
      reviewedBy: null,
      reviewedByType: 'human',
      reviewedAt: null,
      reviewRemark: null,
      releaseId: null,
      version: 1,
      revisions: []
    })
  ];
  const runRow = makeRow({ id: 'R1', flowId: 'F1', actorUserId: 'u_ai', claimedByUserId: 'u_ai', stage: 'testing', events: [], outputs: {}, status: 'running', active: true });
  const releaseRows = [];

  const deliverables = {
    rows: deliverableRows,
    findAll: async ({ where = {} } = {}) => deliverableRows.filter(row => matches(row, where)),
    findByPk: async id => deliverableRows.find(row => row.id === id) || null,
    findOne: async ({ where = {} } = {}) => deliverableRows.find(row => matches(row, where)) || null,
    update: async (patch, { where = {} } = {}) => {
      const rows = deliverableRows.filter(row => matches(row, where));
      await Promise.all(rows.map(row => row.update(patch)));
      return [rows.length];
    },
    findOrCreate: async () => [deliverableRows[0], false],
    create: async data => {
      const row = makeRow({ id: `D${deliverableRows.length + 1}`, ...data });
      deliverableRows.push(row);
      return row;
    }
  };

  const releases = {
    rows: releaseRows,
    create: async data => {
      const row = makeRow({ id: `L${releaseRows.length + 1}`, createdAt: new Date(), feedbackStatus: 'none', ...data });
      releaseRows.push(row);
      return row;
    },
    findOne: async ({ where = {} } = {}) => releaseRows.find(row => matches(row, where)) || null,
    findAll: async ({ where = {} } = {}) => releaseRows.filter(row => matches(row, where)),
    findAndCountAll: async ({ where = {} } = {}) => {
      const rows = releaseRows.filter(row => matches(row, where));
      return { count: rows.length, rows };
    },
    update: async () => [1]
  };

  const models = {
    flow: {
      findByPk: async id => (id === 'F1' || id === flowRow.id ? flowRow : null),
      findAll: async () => [],
      findOne: async () => null,
      count: async () => 0,
      update: async () => [1]
    },
    flowDeliverable: deliverables,
    flowStageRecord: {
      findAll: async () => [],
      findOne: async () => null,
      create: async () => makeRow({ id: 'S1' }),
      update: async () => [1],
      findAndCountAll: async () => ({ count: 0, rows: [] })
    },
    flowAiRun: {
      findByPk: async id => (id === 'R1' ? runRow : null),
      findOne: async () => runRow,
      findAll: async () => [runRow],
      count: async () => 0,
      create: async data => makeRow({ id: 'R1', ...data })
    },
    flowConfirmation: {
      findByPk: async () => null,
      findOne: async () => null,
      create: async data => makeRow({ id: 'C1', ...data }),
      update: async () => [1]
    },
    flowRelease: releases
  };

  const services = {
    flowQueue: { pausedPrefixes: async () => [], exclusionOf: () => null },
    flowTree: {
      blockingChildren: async () => [],
      convergeReadiness: async () => 1,
      ensureAggregateNode: async () => {},
      descendants: async () => []
    },
    flowConfirmation: {
      consume: async () => {
        throw new Error('consume 不应在自主放行里被调用');
      },
      recordAdminDecision: async () => ({})
    }
  };

  const fastify = {
    ns: { models, services },
    sequelize: { instance: { transaction: async fn => fn({ tx: true }) } },
    log: { info() {}, warn() {}, error() {} }
  };
  await flowService(fastify, { name: 'ns' });

  return {
    flow: services.flow,
    models,
    flowRow,
    deliverableRows,
    releaseRows,
    ctx: { userInfo: { id: 'u_ai' }, actorType: 'mcp-ai' },
    admin: { userInfo: { id: 'u_admin' }, isAdmin: true }
  };
};

const checkFor = async (env, action = 'review') => env.flow.releaseCheck({ flowId: 'F1', action, runId: 'R1' }, env.ctx);

const autonomousReview = async env => {
  const checked = await checkFor(env, 'review');
  const base = { runId: 'R1', checkToken: checked.checkToken, items: [{ id: 'D1', result: 'accept' }], evidenceRefs: [{ type: 'worklog', ref: 'w-1' }] };
  const preview = await env.flow.releaseReview({ ...base, dryRun: true }, env.ctx);
  return { base, preview, result: await env.flow.releaseReview({ ...base, dryRun: false }, env.ctx) };
};

// ---------- AI 自主放行 ----------

test('不带 confirmationId 也能正式放行：台账记 ai_autonomous 并返回 releaseId', async () => {
  const env = await makeEnv();
  const { result } = await autonomousReview(env);
  assert.equal(result.dryRun, false);
  assert.equal(result.mode, 'ai_autonomous');
  assert.equal(result.autonomous, true);
  assert.match(result.releaseId, /^rel_/);
  assert.equal(env.deliverableRows[0].status, 'accepted');
  assert.equal(env.releaseRows.length, 1);
  assert.equal(env.releaseRows[0].mode, 'ai_autonomous');
  assert.equal(env.releaseRows[0].before.deliverables[0].status, 'submitted');
  assert.equal(env.releaseRows[0].confirmationId, null);
  assert.ok(result.instructions.some(line => line.includes('releaseId')));
});

test('dryRun 只预览不落库；正式放行必须先跑过 dryRun', async () => {
  const env = await makeEnv();
  const checked = await checkFor(env, 'review');
  const base = { runId: 'R1', checkToken: checked.checkToken, items: [{ id: 'D1', result: 'accept' }], evidenceRefs: [{ type: 'doc', ref: 'd-1' }] };
  const preview = await env.flow.releaseReview({ ...base, dryRun: true }, env.ctx);
  assert.equal(preview.dryRun, true);
  assert.equal(env.deliverableRows[0].status, 'submitted');
  assert.equal(env.releaseRows.length, 0);

  const freshEnv = await makeEnv();
  const freshCheck = await checkFor(freshEnv, 'review');
  await assert.rejects(freshEnv.flow.releaseReview({ ...base, checkToken: freshCheck.checkToken, dryRun: false }, freshEnv.ctx), error => error.code === 'DRYRUN_REQUIRED');
  assert.equal(freshEnv.deliverableRows[0].status, 'submitted');
});

test('checkToken 绑定动作、一次性消费：跨动作复用与重放都被拒', async () => {
  const env2 = await makeEnv();
  const checked2 = await checkFor(env2, 'review');
  await assert.rejects(
    env2.flow.releaseWaive({ runId: 'R1', checkToken: checked2.checkToken, templateCodes: ['test_report'], reason: 'x', evidenceRefs: [{ type: 'worklog', ref: 'w-1' }], dryRun: false }, env2.ctx),
    error => error.code === 'CHECK_TOKEN_MISMATCH'
  );

  const env3 = await makeEnv();
  const { base, result } = await autonomousReview(env3);
  assert.match(result.releaseId, /^rel_/);
  await assert.rejects(env3.flow.releaseReview({ ...base, dryRun: true }, env3.ctx), error => error.code === 'CHECK_TOKEN_INVALID');
});

test('无真人凭证时裸文本证据被拒，结构化引用才放行', async () => {
  const env = await makeEnv();
  const checked = await checkFor(env, 'review');
  const base = { runId: 'R1', checkToken: checked.checkToken, items: [{ id: 'D1', result: 'accept' }] };
  await env.flow.releaseReview({ ...base, evidenceRefs: [{ type: 'worklog', ref: 'w-1' }], dryRun: true }, env.ctx);
  await assert.rejects(env.flow.releaseReview({ ...base, evidenceRefs: ['已核验'], dryRun: false }, env.ctx), error => error.code === 'INVALID_EVIDENCE_REF');
  assert.equal(env.deliverableRows[0].status, 'submitted');
  assert.equal(env.releaseRows.length, 0);
});

// ---------- 人工撤回 / 打回 ----------

test('撤回按 before 快照逐项复原，不是统一改成 submitted', async () => {
  const env = await makeEnv();
  env.deliverableRows[1].status = 'waived';
  env.deliverableRows[1].reviewRemark = '旧豁免意见';
  const { result } = await autonomousReview(env);
  const undone = await env.flow.releaseUndo({ releaseId: result.releaseId, reason: '人工撤回' }, env.admin);
  assert.equal(undone.undone, true);
  assert.equal(undone.feedbackOpen, false);
  assert.equal(env.deliverableRows[0].status, 'submitted');
  assert.equal(env.deliverableRows[0].releaseId, null);
  assert.equal(env.deliverableRows[1].status, 'waived');
  assert.equal(env.deliverableRows[1].reviewRemark, '旧豁免意见');
  await assert.rejects(env.flow.releaseUndo({ releaseId: result.releaseId, reason: '重复' }, env.admin), error => error.code === 'RELEASE_ALREADY_UNDONE');
});

test('打回写 feedback 并阻断下一次正式放行，ack 后解除', async () => {
  const env = await makeEnv();
  const { result } = await autonomousReview(env);
  const rejected = await env.flow.releaseReject({ releaseId: result.releaseId, reason: '测试报告缺少灰度数据，请补' }, env.admin);
  assert.equal(rejected.feedbackOpen, true);
  assert.equal(env.releaseRows[0].feedbackStatus, 'open');

  const feedback = await env.flow.humanFeedback({ flowId: 'F1' });
  assert.equal(feedback.length, 1);
  assert.match(feedback[0].feedback, /灰度数据/);

  const checked = await checkFor(env, 'review');
  assert.equal(checked.canRelease, false);
  assert.equal(checked.humanFeedback.length, 1);
  assert.ok(checked.blockers.some(item => item.reason === 'HUMAN_FEEDBACK_PENDING'));

  const next = { runId: 'R1', checkToken: checked.checkToken, items: [{ id: 'D1', result: 'accept' }], evidenceRefs: [{ type: 'worklog', ref: 'w-2' }], dryRun: false };
  await assert.rejects(env.flow.releaseReview(next, env.ctx), error => error.code === 'HUMAN_FEEDBACK_PENDING');
  await assert.rejects(env.flow.ackHumanFeedback({ releaseId: result.releaseId, note: '' }, env.ctx), error => error.code === 'ACK_NOTE_REQUIRED');

  const ack = await env.flow.ackHumanFeedback({ releaseId: result.releaseId, note: '已补灰度数据并重新提交测试报告' }, env.ctx);
  assert.equal(ack.feedbackStatus, 'acknowledged');
  assert.deepEqual(await env.flow.humanFeedback({ flowId: 'F1' }), []);
  const checkedAfter = await checkFor(env, 'review');
  assert.equal(checkedAfter.humanFeedback.length, 0);
});

// ---------- 裂变模板：不裂变的单节点不强制交裂变方案 ----------

test('裂变方案模板默认非必交', () => {
  const requirementCodes = getTemplatesByStage('requirement')
    .filter(item => item.required)
    .map(item => item.code);
  assert.ok(!requirementCodes.includes('decomposition_plan'));
  const designCodes = getTemplatesByStage('product_design')
    .filter(item => item.required)
    .map(item => item.code);
  assert.ok(!designCodes.includes('design_decomposition'));
});

// ---------- 详情页数据与终态一致性 ----------

test('详情返回未处理的打回意见，供详情页顶部提示；缺 stageEnteredAt 时 stayMinutes 为 0', async () => {
  const env = await makeEnv();
  const empty = await env.flow.detail({ id: 'F1' });
  assert.deepEqual(empty.openFeedback, []);
  assert.equal(empty.stayMinutes, 0);
  assert.equal(empty.paused, false);

  const { result } = await autonomousReview(env);
  await env.flow.releaseReject({ releaseId: result.releaseId, reason: '测试报告缺少灰度数据，请补' }, env.admin);
  const data = await env.flow.detail({ id: 'F1' });
  assert.equal(data.openFeedback.length, 1);
  assert.match(data.openFeedback[0].feedback, /灰度数据/);
  assert.equal(data.openFeedback[0].releaseId, result.releaseId);
});

test('已归档或已完成的流程不可再改基础字段，进行中仍可编辑', async () => {
  const env = await makeEnv();
  env.flowRow.status = 'archived';
  await assert.rejects(env.flow.update({ id: 'F1', version: 3, title: '改标题' }, env.admin), error => error.code === 'FLOW_FINISHED');
  env.flowRow.status = 'completed';
  await assert.rejects(env.flow.update({ id: 'F1', version: 3, title: '改标题' }, env.admin), error => error.code === 'FLOW_FINISHED');
  env.flowRow.status = 'active';
  const updated = await env.flow.update({ id: 'F1', version: 3, title: '新标题' }, env.admin);
  assert.deepEqual(updated.updated, ['title']);
  assert.equal(env.flowRow.title, '新标题');
  assert.equal(updated.version, 4);
});
