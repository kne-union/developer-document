const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  SENSITIVE_KEYS,
  isSensitiveKey,
  omitSensitive,
  hasDeliverableBody,
  parseExitProgress,
  parseOutputs,
  parseEvents,
  parseSnapshot,
  parseAiRunContext,
  runStatusTone,
  defaultOpenSections,
  sectionHasContent,
  stableStringify,
  RUN_STATUS_VALUES,
  STAGE_CODES,
  QUEUE_GOAL_CODES,
  resolveRunStatus,
  resolveStage,
  resolveGoal,
  resolveDeliverableStatus
} = require('./aiRunContext');

describe('parseAiRunContext 空值与保真', () => {
  test('空输入不编造内容，sections 为空', () => {
    const empty = parseAiRunContext(null);
    assert.equal(empty.empty, true);
    assert.deepEqual(empty.sections, []);
    assert.equal(empty.runId, '');
    assert.equal(empty.snapshot.hasContent, false);
    assert.equal(empty.outputs.hasContent, false);
    assert.deepEqual(empty.events, []);
    assert.equal(parseAiRunContext(undefined).empty, true);
    assert.equal(parseAiRunContext([]).empty, true);
    assert.equal(parseAiRunContext('run').empty, true);
  });

  test('原始 JSON 与输入一致，解析不修改原对象', () => {
    const input = {
      id: '111',
      status: 'succeeded',
      contextSnapshot: { stage: 'testing', goal: 'draft', extra: 1 },
      outputs: { summary: '完成回归', openQuestions: ['还要确认环境'] }
    };
    const frozen = JSON.stringify(input);
    const parsed = parseAiRunContext(input);
    assert.equal(JSON.stringify(input), frozen);
    assert.equal(parsed.rawText.contextSnapshot, stableStringify(input.contextSnapshot));
    assert.equal(parsed.rawText.outputs, stableStringify(input.outputs));
    assert.deepEqual(parsed.raw.contextSnapshot, input.contextSnapshot);
    parsed.raw.contextSnapshot.stage = 'hacked';
    assert.equal(input.contextSnapshot.stage, 'testing');
  });
});

describe('按真实内容分组', () => {
  test('startRun 形态的上下文快照分出模板、交付物、准出、检索建议', () => {
    const parsed = parseAiRunContext({
      runId: 'r1',
      status: 'running',
      stage: 'testing',
      goal: 'draft',
      model: 'grok',
      startedAt: '2026-11-13T01:00:00.000Z',
      contextSnapshot: {
        flowId: 'f1',
        stage: 'testing',
        goal: 'draft',
        templates: [
          { code: 'test_cases', name: '测试用例', contentType: 'jsonb', required: true },
          { code: 'test_report', name: '测试报告', contentType: 'file', required: true }
        ],
        deliverables: [
          { templateCode: 'test_report', name: '测试报告', contentType: 'file', status: 'pending', fileId: 'fid-1', fileName: '报告.pdf', required: true },
          { templateCode: 'test_cases', name: '测试用例', contentType: 'jsonb', status: 'ai_draft', options: [], required: true }
        ],
        exitProgress: {
          canAdvance: false,
          missing: [{ templateCode: 'test_report', name: '测试报告', status: 'pending' }],
          blockingChildren: [],
          waiting: [],
          summary: { requiredTotal: 2, acceptedCount: 0, pendingCount: 1, aiDraftCount: 1, submittedCount: 0, waivedCount: 0 },
          action: 'advance',
          fromStage: 'testing'
        },
        suggestedQueries: ['search_worklog:testing 阶段历史记录']
      },
      outputs: {},
      events: [{ at: '2026-11-13T01:00:00.000Z', tool: 'flow_start_run', action: 'start', result: 'running' }]
    });
    assert.equal(parsed.empty, false);
    assert.deepEqual(parsed.sections, ['summary', 'snapshot', 'events', 'raw']);
    assert.equal(sectionHasContent(parsed, 'outputs'), false);
    assert.equal(parsed.snapshot.templates.length, 2);
    assert.equal(parsed.snapshot.deliverables[0].fileId, 'fid-1');
    assert.equal(hasDeliverableBody(parsed.snapshot.deliverables[0]), true);
    assert.equal(hasDeliverableBody(parsed.snapshot.deliverables[1]), false);
    assert.equal(parsed.snapshot.exitProgress.hasCanAdvance, true);
    assert.equal(parsed.snapshot.exitProgress.canAdvance, false);
    assert.equal(parsed.snapshot.exitProgress.missing.length, 1);
    assert.deepEqual(parsed.snapshot.suggestedQueries, ['search_worklog:testing 阶段历史记录']);
    assert.equal(parsed.startedTime.ok, true);
    assert.match(parsed.startedTime.text, /2026/);
    assert.equal(parsed.startedTime.timeZone, 'Asia/Shanghai');
  });

  test('队列领取的瘦快照：templates 可以是 code 字符串', () => {
    const parsed = parseSnapshot({
      stage: 'development',
      goal: 'release',
      workItemKey: 'n1:development:release',
      templates: ['pr_link', 'self_test', 'changelog']
    });
    assert.equal(parsed.hasContent, true);
    assert.deepEqual(
      parsed.templates.map(item => item.code),
      ['pr_link', 'self_test', 'changelog']
    );
    assert.equal(parsed.workItemKey, 'n1:development:release');
  });

  test('产出：摘要、待确认、草稿、裂变、未知字段进入 others；空产出不分出该组', () => {
    const emptyOut = parseOutputs({});
    assert.equal(emptyOut.hasContent, false);
    const full = parseOutputs({
      summary: '## 结论\n已完成',
      openQuestions: ['环境是否冻结', '  ', null],
      draft: [{ templateCode: 'test_report', hasContent: true }],
      decomposition: { confirmationId: 'c1', nodeIds: ['n2'] },
      retryAfter: '1h',
      customNote: '额外说明'
    });
    assert.equal(full.hasContent, true);
    assert.equal(full.summary, '## 结论\n已完成');
    assert.deepEqual(full.openQuestions, ['环境是否冻结']);
    assert.equal(full.draft.length, 1);
    assert.equal(full.decomposition.confirmationId, 'c1');
    assert.equal(full.retryAfter, '1h');
    assert.equal(full.others.customNote, '额外说明');
    const parsed = parseAiRunContext({ status: 'succeeded', outputs: { summary: 'ok' } });
    assert.ok(parsed.sections.includes('outputs'));
    assert.ok(parsed.sections.includes('raw'));
  });

  test('派单理由有内容才分出 dispatch；leaseId / idempotencyKey 不进入结构化主视图', () => {
    const parsed = parseAiRunContext({
      runId: 'r2',
      status: 'running',
      leaseId: 'lease_should_not_surface',
      idempotencyKey: 'idem-1',
      priorityReasons: ['到期临近', { reason: '被阻塞后重试' }],
      contextSnapshot: { stage: 'testing', leaseId: 'lease_in_snap', token: 'abc' },
      outputs: { summary: 'x', checkToken: 'tok', secret: 's' }
    });
    assert.ok(parsed.sections.includes('dispatch'));
    assert.deepEqual(parsed.priorityReasons, ['到期临近', '被阻塞后重试']);
    assert.equal(parsed.snapshot.others.leaseId, undefined);
    assert.equal(parsed.snapshot.others.token, undefined);
    assert.equal(parsed.outputs.others.checkToken, undefined);
    assert.equal(parsed.outputs.others.secret, undefined);
    // 原始 JSON 仍保留快照里已有的字段，不篡改业务数据
    assert.equal(parsed.raw.contextSnapshot.leaseId, 'lease_in_snap');
    assert.equal(parsed.raw.outputs.checkToken, 'tok');
    // 结构化摘要不把 run 上的 leaseId 暴露成字段
    assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'leaseId'), false);
    assert.ok(SENSITIVE_KEYS.includes('leaseId'));
    assert.equal(isSensitiveKey('checkToken'), true);
    assert.deepEqual(omitSensitive({ leaseId: 'x', stage: 'testing' }), { stage: 'testing' });
  });
});

describe('事件流与时间', () => {
  test('按真实 at 升序，缺失时间不编造并排在后面', () => {
    const events = parseEvents([
      { at: '2026-11-13T03:00:00.000Z', tool: 'flow_finish_run', action: 'finish', result: 'succeeded' },
      { tool: 'untimed', action: 'note', result: 'ok' },
      { at: '2026-11-13T01:00:00.000Z', tool: 'flow_start_run', action: 'start', result: 'running', extraSaved: 2 },
      { at: 'not-a-date', tool: 'bad', action: 'x', result: 'ok' }
    ]);
    assert.equal(events[0].tool, 'flow_start_run');
    assert.equal(events[1].tool, 'flow_finish_run');
    assert.equal(events[2].tool, 'untimed');
    assert.equal(events[3].tool, 'bad');
    assert.equal(events[0].occurred.ok, true);
    assert.equal(events[2].occurred.missing, true);
    assert.equal(events[3].occurred.ok, false);
    assert.equal(events[0].extra.extraSaved, 2);
    const parsed = parseAiRunContext({
      events: [
        { at: '2026-11-13T01:00:00.000Z', tool: 'a', action: 'start', result: 'ok' },
        { at: '2026-11-13T02:00:00.000Z', tool: 'b', action: 'end', result: 'ok', target: 'f1' }
      ]
    });
    assert.ok(parsed.sections.includes('events'));
    assert.equal(parsed.events[1].target, 'f1');
  });

  test('非法或缺失的开始/结束时间不编造展示文本', () => {
    const parsed = parseAiRunContext({ status: 'failed', error: 'boom', startedAt: 'nope', finishedAt: null });
    assert.equal(parsed.startedTime.ok, false);
    assert.equal(parsed.startedTime.text, '');
    assert.equal(parsed.finishedTime.ok, false);
    assert.equal(parsed.finishedTime.missing, true);
    assert.equal(parsed.error, 'boom');
  });
});

describe('呈现辅助', () => {
  test('默认展开除原始 JSON 以外的真实分组', () => {
    assert.deepEqual(defaultOpenSections(['summary', 'outputs', 'snapshot', 'events', 'raw']), ['summary', 'outputs', 'snapshot', 'events']);
    assert.deepEqual(defaultOpenSections([]), []);
  });

  test('状态色不臆造未知状态', () => {
    assert.equal(runStatusTone('succeeded'), 'success');
    assert.equal(runStatusTone('failed'), 'error');
    assert.equal(runStatusTone('blocked'), 'error');
    assert.equal(runStatusTone('running'), 'processing');
    assert.equal(runStatusTone('awaiting_human'), 'warning');
    assert.equal(runStatusTone('mystery'), 'default');
  });

  test('exitProgress 缺字段时不把 canAdvance 当成 true', () => {
    const parsed = parseExitProgress({ missing: [{ templateCode: 'x' }] });
    assert.equal(parsed.canAdvance, false);
    assert.equal(parsed.hasCanAdvance, false);
    assert.equal(parseExitProgress(null), null);
    assert.equal(parseExitProgress([]), null);
  });

  test('runId 兼容 id 字段；stage/goal 可从快照回填', () => {
    const parsed = parseAiRunContext({
      id: 'only-id',
      contextSnapshot: { stage: 'requirement', goal: 'draft' }
    });
    assert.equal(parsed.runId, 'only-id');
    assert.equal(parsed.stage, 'requirement');
    assert.equal(parsed.goal, 'draft');
    assert.ok(parsed.sections.includes('summary'));
    assert.ok(parsed.sections.includes('snapshot'));
  });
});

describe('枚举 code 映射到已有标签，未知值不把原文当标签', () => {
  test('全部真实 run 状态都有已知 i18n key，不是把 code 当展示文案', () => {
    const expected = {
      claimed: 'adminFlow.ai.status.claimed',
      running: 'adminFlow.ai.status.running',
      awaiting_human: 'adminFlow.ai.status.awaitingHuman',
      succeeded: 'adminFlow.ai.status.succeeded',
      failed: 'adminFlow.ai.status.failed',
      abandoned: 'adminFlow.ai.status.abandoned',
      blocked: 'adminFlow.ai.status.blocked'
    };
    assert.deepEqual(RUN_STATUS_VALUES.slice().sort(), Object.keys(expected).sort());
    RUN_STATUS_VALUES.forEach(code => {
      const resolved = resolveRunStatus(code);
      assert.equal(resolved.empty, false, code);
      assert.equal(resolved.known, true, code);
      assert.equal(resolved.code, code);
      assert.equal(resolved.messageId, expected[code]);
      assert.deepEqual(resolved.values, {});
    });
    assert.equal(resolveRunStatus('succeeded').tone, 'success');
    assert.equal(resolveRunStatus('failed').tone, 'error');
    assert.equal(resolveRunStatus('running').tone, 'processing');
    assert.equal(resolveRunStatus('awaiting_human').tone, 'warning');
  });

  test('未知或空状态：明确未知，保留原始 code 供展示，不编造标签', () => {
    const unknown = resolveRunStatus('not_a_real_status');
    assert.equal(unknown.known, false);
    assert.equal(unknown.empty, false);
    assert.equal(unknown.code, 'not_a_real_status');
    assert.equal(unknown.messageId, 'adminFlow.ai.status.unknown');
    assert.deepEqual(unknown.values, { code: 'not_a_real_status' });
    assert.equal(unknown.tone, 'default');
    const empty = resolveRunStatus('');
    assert.equal(empty.empty, true);
    assert.equal(empty.messageId, '');
    assert.equal(resolveRunStatus(null).empty, true);
  });

  test('阶段与目标复用已有字典；未知给 unknown key 且带原始 code', () => {
    assert.deepEqual(STAGE_CODES, ['requirement', 'product_design', 'development', 'testing', 'pre_release']);
    assert.equal(resolveStage('product_design').messageId, 'adminFlow.stage.productDesign');
    assert.equal(resolveStage('product_design').known, true);
    const badStage = resolveStage('design_v2');
    assert.equal(badStage.known, false);
    assert.equal(badStage.messageId, 'adminFlow.ai.stage.unknown');
    assert.deepEqual(badStage.values, { code: 'design_v2' });

    assert.deepEqual(QUEUE_GOAL_CODES, ['draft', 'review_ready', 'release', 'unblock', 'decompose', 'converge']);
    assert.equal(resolveGoal('review_ready').messageId, 'adminFlow.queue.goal.reviewReady');
    assert.equal(resolveGoal('review_ready').known, true);
    const badGoal = resolveGoal('ship_it');
    assert.equal(badGoal.known, false);
    assert.equal(badGoal.messageId, 'adminFlow.ai.goal.unknown');
    assert.deepEqual(badGoal.values, { code: 'ship_it' });
  });

  test('交付物状态复用已有映射；解析结果里的原始 JSON 仍是存储 code', () => {
    assert.equal(resolveDeliverableStatus('ai_draft').messageId, 'adminFlow.deliverable.status.aiDraft');
    assert.equal(resolveDeliverableStatus('ai_draft').known, true);
    const bad = resolveDeliverableStatus('done');
    assert.equal(bad.known, false);
    assert.equal(bad.messageId, 'adminFlow.ai.status.unknown');
    const parsed = parseAiRunContext({
      status: 'succeeded',
      stage: 'testing',
      goal: 'draft',
      contextSnapshot: { stage: 'testing', goal: 'draft' },
      outputs: { summary: 'ok' }
    });
    assert.equal(parsed.statusMeta.known, true);
    assert.equal(parsed.statusMeta.messageId, 'adminFlow.ai.status.succeeded');
    assert.equal(parsed.stageMeta.messageId, 'adminFlow.stage.testing');
    assert.equal(parsed.goalMeta.messageId, 'adminFlow.queue.goal.draft');
    // 原始数据不被改成译文
    assert.equal(parsed.status, 'succeeded');
    assert.equal(parsed.raw.contextSnapshot.stage, 'testing');
    const weird = parseAiRunContext({ status: 'mystery', contextSnapshot: { stage: '??' }, outputs: {} });
    assert.equal(weird.statusMeta.known, false);
    assert.equal(weird.statusMeta.code, 'mystery');
    assert.equal(weird.raw.contextSnapshot.stage, '??');
  });
});
