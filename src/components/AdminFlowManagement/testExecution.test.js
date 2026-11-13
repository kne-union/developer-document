'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTestExecution,
  flattenSteps,
  lookupStep,
  parseRegressionRuns,
  buildRegressionTimeline,
  formatShanghaiTime,
  parseOccurredAt,
  collectStructuredFileIds,
  ensureExplicitIds,
  validateTestCasesOptions,
  validateRegressionOptions,
  hasTestExecutionValue,
  hasRegressionValue,
  serializeTestCasesForm,
  serializeRegressionForm,
  SHANGHAI_TIME_ZONE
} = require('./testExecution');

describe('parseTestExecution 按明确 stepId 关联，不用位置或文件名', () => {
  test('截图只按 stepId 挂到步骤，对不上或没有 stepId 的进入未关联', () => {
    const parsed = parseTestExecution({
      templateCode: 'test_cases',
      contentType: 'jsonb',
      options: [
        {
          type: 'test_case',
          caseId: 'case-login',
          label: '登录',
          steps: [
            { stepId: 'step-open', name: '打开登录页', order: 2, result: 'passed' },
            { stepId: 'step-submit', name: '提交', order: 1, result: 'failed', remark: '提示错误' }
          ]
        },
        { type: 'file', fileId: 'img-1', fileName: 'TC-login-step-02.png', stepId: 'step-open', kind: 'screenshot' },
        { type: 'file', fileId: 'img-2', fileName: 'anything.png', stepId: 'step-submit' },
        { type: 'file', fileId: 'img-3', fileName: 'TC-login-step-01.png' },
        { type: 'file', fileId: 'img-4', fileName: 'orphan.png', stepId: 'step-does-not-exist' },
        { type: 'file', fileId: 'doc-1', fileName: 'cases.xlsx', kind: 'document' }
      ]
    });

    assert.equal(parsed.cases.length, 1);
    assert.deepEqual(
      parsed.cases[0].steps.map(step => step.stepId),
      ['step-submit', 'step-open']
    );
    assert.deepEqual(
      parsed.cases[0].steps.map(step => step.screenshots.map(shot => shot.fileId)),
      [['img-2'], ['img-1']]
    );
    assert.deepEqual(
      parsed.unlinkedScreenshots.map(shot => shot.fileId),
      ['img-3', 'img-4']
    );
    assert.deepEqual(
      parsed.documents.map(doc => doc.fileId),
      ['doc-1']
    );
    assert.equal(
      parsed.unlinkedScreenshots.some(shot => shot.fileName === 'TC-login-step-01.png' && shot.stepId == null),
      true
    );
  });

  test('不会按数组下标把第 n 张图配给第 n 步', () => {
    const parsed = parseTestExecution({
      templateCode: 'test_cases',
      options: [
        {
          type: 'test_case',
          caseId: 'c1',
          label: 'A',
          steps: [
            { stepId: 's1', name: '第一步' },
            { stepId: 's2', name: '第二步' }
          ]
        },
        { type: 'file', fileId: 'a', fileName: 'a.png' },
        { type: 'file', fileId: 'b', fileName: 'b.png' }
      ]
    });
    assert.equal(parsed.cases[0].steps[0].screenshots.length, 0);
    assert.equal(parsed.cases[0].steps[1].screenshots.length, 0);
    assert.deepEqual(
      parsed.unlinkedScreenshots.map(shot => shot.fileId),
      ['a', 'b']
    );
  });

  test('旧的单文件测试用例只作为文档展示，不冒充步骤截图', () => {
    const parsed = parseTestExecution({
      templateCode: 'test_cases',
      contentType: 'file',
      fileId: 'old-file',
      fileName: 'cases.xlsx'
    });
    assert.deepEqual(parsed.cases, []);
    assert.deepEqual(parsed.unlinkedScreenshots, []);
    assert.equal(parsed.documents[0].fileId, 'old-file');
    assert.equal(parsed.documents[0].kind, 'document');
    assert.equal(hasTestExecutionValue(parsed), true);
  });

  test('不读取自测记录 checklist', () => {
    const parsed = parseTestExecution({
      templateCode: 'self_test',
      contentType: 'checklist',
      checklist: [{ label: '自测通过', checked: true }],
      options: [{ type: 'test_case', caseId: 'x', label: '不该出现', steps: [] }]
    });
    assert.deepEqual(parsed.cases, []);
    assert.equal(hasTestExecutionValue(parsed), false);
  });

  test('序列化时把上传到某一步的截图打上该步明确的 stepId，未关联列表不会带上步骤', () => {
    const options = serializeTestCasesForm(
      {
        cases: [
          {
            label: '登录',
            steps: [
              {
                name: '打开',
                screenshots: [{ fileId: { id: 'f1' }, fileName: 'open.png' }]
              }
            ]
          }
        ],
        unlinkedScreenshots: [{ fileId: 'f2', fileName: 'loose.png' }]
      },
      (() => {
        let n = 0;
        return () => `gen-${++n}`;
      })()
    );
    const caseRow = options.find(item => item.type === 'test_case');
    const linked = options.find(item => item.fileId === 'f1');
    const loose = options.find(item => item.fileId === 'f2');
    assert.equal(caseRow.caseId, 'gen-1');
    assert.equal(caseRow.steps[0].stepId, 'gen-2');
    assert.equal(linked.stepId, 'gen-2');
    assert.equal(linked.caseId, 'gen-1');
    assert.equal(loose.stepId, null);
    assert.doesNotThrow(() => validateTestCasesOptions(options));
  });
});

describe('validateTestCasesOptions', () => {
  test('允许空数组，拒绝用缺失 stepId 的步骤', () => {
    assert.equal(validateTestCasesOptions([]), true);
    assert.throws(() => validateTestCasesOptions([{ type: 'test_case', caseId: 'c', label: 'A', steps: [{ name: '打开' }] }]), /stepId/);
    assert.throws(() => validateTestCasesOptions([{ type: 'url', url: 'https://x.com', label: 'x' }]), /type/);
  });
});

describe('parseRegressionRuns 与时间线', () => {
  test('按真实 occurredAt 升序，缺失时间不编造并排在后面', () => {
    const { runs } = parseRegressionRuns({
      templateCode: 'regression_note',
      contentType: 'jsonb',
      updatedAt: '2026-01-01T00:00:00.000Z',
      submittedAt: '2026-01-02T00:00:00.000Z',
      options: [
        { type: 'regression_run', runId: 'r-new', occurredAt: '2026-11-12T08:00:00.000Z', status: 'passed', content: '第二次', operatorName: '张三' },
        { type: 'regression_run', runId: 'r-old', occurredAt: '2026-11-10T08:00:00.000Z', status: 'failed', content: '第一次' },
        { type: 'regression_run', runId: 'r-none', content: '没写时间', screenshots: [{ fileId: 's1', fileName: 'a.png' }], stepIds: ['step-open'] }
      ]
    });
    const timeline = buildRegressionTimeline(runs);
    assert.deepEqual(
      timeline.items.map(run => run.runId),
      ['r-old', 'r-new', 'r-none']
    );
    assert.equal(timeline.untimed[0].runId, 'r-none');
    assert.equal(timeline.untimed[0].occurredAt, null);
    assert.equal(timeline.timed[1].operatorName, '张三');
    assert.notEqual(timeline.untimed[0].occurredAt, '2026-01-01T00:00:00.000Z');
    assert.notEqual(timeline.untimed[0].occurredAt, '2026-01-02T00:00:00.000Z');
  });

  test('旧的纯文本回归说明保留正文，但不给它编造时间', () => {
    const { runs } = parseRegressionRuns({
      templateCode: 'regression_note',
      contentType: 'text',
      content: '回归范围：登录与支付',
      updatedAt: '2026-11-01T12:00:00.000Z',
      submittedAt: '2026-11-01T13:00:00.000Z'
    });
    assert.equal(runs.length, 1);
    assert.equal(runs[0].content, '回归范围：登录与支付');
    assert.equal(runs[0].occurredAt, null);
    assert.equal(runs[0].plainText, true);
    assert.equal(hasRegressionValue({ runs }), true);
    const timeline = buildRegressionTimeline(runs);
    assert.equal(timeline.untimed.length, 1);
    assert.equal(timeline.timed.length, 0);
  });

  test('不会把自测记录 checklist 当成回归时间线', () => {
    const { runs } = parseRegressionRuns({
      templateCode: 'self_test',
      contentType: 'checklist',
      checklist: [{ label: '已自测', checked: true, remark: '2026-11-01' }],
      content: '不该出现',
      options: [{ type: 'regression_run', runId: 'x', content: '不该出现', occurredAt: '2026-11-01T00:00:00.000Z' }]
    });
    assert.deepEqual(runs, []);
  });

  test('非法时间在解析时视为无有效时间，校验时拒绝写入', () => {
    const { runs } = parseRegressionRuns({
      templateCode: 'regression_note',
      options: [{ type: 'regression_run', runId: 'bad', occurredAt: 'not-a-date', content: 'x' }]
    });
    assert.equal(runs[0].occurredAt, null);
    assert.equal(runs[0].occurredInvalid, true);
    assert.throws(() => validateRegressionOptions([{ type: 'regression_run', runId: 'bad', occurredAt: 'not-a-date', content: 'x' }]), /occurredAt/);
  });

  test('时间按 Asia/Shanghai 格式化，缺失则无文本', () => {
    const formatted = formatShanghaiTime('2026-11-13T01:00:00.000Z');
    assert.equal(formatted.ok, true);
    assert.equal(formatted.timeZone, SHANGHAI_TIME_ZONE);
    assert.equal(formatted.text.includes('2026'), true);
    assert.equal(formatted.text.includes('09:00') || formatted.text.includes('9:00'), true);
    const missing = formatShanghaiTime(null);
    assert.equal(missing.ok, false);
    assert.equal(missing.missing, true);
    assert.equal(missing.text, '');
    assert.equal(parseOccurredAt('').missing, true);
  });

  test('序列化回归表单：空时间保持 null，关联步骤只用明确 id', () => {
    let n = 0;
    const options = serializeRegressionForm(
      {
        runs: [
          {
            occurredAt: '2026-11-13T01:00:00.000Z',
            status: { value: 'passed' },
            operatorName: '李四',
            content: '通过',
            stepIds: [{ value: 'step-open' }, 'step-submit', ''],
            screenshots: [{ fileId: { id: 'img' }, fileName: 'r.png' }]
          },
          { content: '没填时间', stepIds: [] }
        ]
      },
      () => `run-gen-${++n}`
    );
    assert.equal(options[0].runId, 'run-gen-1');
    assert.equal(options[1].runId, 'run-gen-2');
    assert.equal(options[0].occurredAt, '2026-11-13T01:00:00.000Z');
    assert.deepEqual(options[0].stepIds, ['step-open', 'step-submit']);
    assert.equal(options[1].occurredAt, null);
    assert.doesNotThrow(() => validateRegressionOptions(ensureExplicitIds(options, () => `x-${++n}`)));
  });
});

describe('collectStructuredFileIds', () => {
  test('收集步骤截图与回归截图中的 fileId', () => {
    const ids = collectStructuredFileIds({
      options: [
        { type: 'test_case', caseId: 'c', label: 'A', steps: [{ stepId: 's', name: 'n', screenshots: [{ fileId: 'nested' }] }] },
        { type: 'file', fileId: 'flat', fileName: 'a.png', stepId: 's' },
        { type: 'regression_run', runId: 'r', screenshots: [{ fileId: 'reg' }, { fileId: 'flat' }] }
      ]
    });
    assert.deepEqual(ids.sort(), ['flat', 'nested', 'reg']);
  });
});

describe('lookupStep', () => {
  test('只按明确 stepId 查找，找不到返回 null', () => {
    const steps = flattenSteps(
      parseTestExecution({
        options: [{ type: 'test_case', caseId: 'c', label: 'A', steps: [{ stepId: 's1', name: '打开' }] }]
      })
    );
    assert.equal(lookupStep(steps, 's1').name, '打开');
    assert.equal(lookupStep(steps, 's2'), null);
    assert.equal(lookupStep(steps, ''), null);
  });
});
