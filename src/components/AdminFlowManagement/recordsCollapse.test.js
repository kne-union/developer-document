const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { recordsDefaultActiveKey, RECORDS_PANEL_KEYS } = require('./recordsCollapse');

describe('详情页底部记录折叠：自动展开与入口', () => {
  test('无待处理打回时全部收起，有意见时只自动展开操作记录', () => {
    assert.deepEqual(recordsDefaultActiveKey([]), []);
    assert.deepEqual(recordsDefaultActiveKey(null), []);
    assert.deepEqual(recordsDefaultActiveKey(undefined), []);
    assert.deepEqual(recordsDefaultActiveKey([{ feedback: '请改' }]), ['release']);
    assert.deepEqual(recordsDefaultActiveKey([{}, {}]), ['release']);
  });

  test('底部折叠入口与源码四项一致：阶段记录、拆分任务、AI 工作记录、操作记录', () => {
    assert.deepEqual(RECORDS_PANEL_KEYS, ['records', 'tree', 'ai', 'release']);
  });
});
