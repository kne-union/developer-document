const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { mapFlowListItem, collectCardActions, detailPath, listFromTableProps, FLOW_STATUS_CODES, FLOW_PRIORITY_CODES, STAGE_CODES } = require('./flowListCard');

describe('流程列表卡片映射与操作契约', () => {
  test('真实字段映射：标题、编号、已有枚举标签、负责人、截止、停留；不编造进度', () => {
    const mapped = mapFlowListItem({
      id: '123',
      title: '很长的中文流程标题用于换行',
      code: '1930123456789012345',
      status: 'active',
      stage: 'product_design',
      priority: 'high',
      ownerUser: { nickname: '张三', email: 'a@b.com' },
      dueAt: '2026-11-20T00:00:00.000Z',
      stayMinutes: 90,
      parentId: '1'
    });
    assert.equal(mapped.empty, false);
    assert.equal(mapped.title, '很长的中文流程标题用于换行');
    assert.equal(mapped.code, '1930123456789012345');
    assert.equal(mapped.status.known, true);
    assert.equal(mapped.status.messageId, 'adminFlow.status.active');
    assert.equal(mapped.statusColor, 'processing');
    assert.equal(mapped.stage.messageId, 'adminFlow.stage.productDesign');
    assert.equal(mapped.priority.messageId, 'adminFlow.priority.high');
    assert.equal(mapped.priorityColor, 'warning');
    assert.equal(mapped.owner, '张三');
    assert.equal(mapped.dueAt, '2026-11-20T00:00:00.000Z');
    assert.equal(mapped.stayMinutes, 90);
    assert.equal(mapped.parentId, '1');
    assert.equal('progress' in mapped, false);
  });

  test('未知状态/阶段/优先级走 unknown，保留原始 code，不把原文当标签', () => {
    const mapped = mapFlowListItem({ status: 'flying', stage: 'design_v2', priority: 'super' });
    assert.equal(mapped.status.known, false);
    assert.equal(mapped.status.messageId, 'adminFlow.status.unknown');
    assert.deepEqual(mapped.status.values, { code: 'flying' });
    assert.equal(mapped.stage.messageId, 'adminFlow.stage.unknown');
    assert.deepEqual(mapped.stage.values, { code: 'design_v2' });
    assert.equal(mapped.priority.messageId, 'adminFlow.priority.unknown');
    assert.equal(mapped.statusColor, 'default');
  });

  test('已知枚举集合与项目字典一致', () => {
    assert.deepEqual(FLOW_STATUS_CODES, ['draft', 'active', 'completed', 'archived']);
    assert.deepEqual(FLOW_PRIORITY_CODES, ['low', 'medium', 'high', 'urgent']);
    assert.deepEqual(STAGE_CODES, ['requirement', 'product_design', 'development', 'testing', 'pre_release']);
  });

  test('options 列按 TablePage 契约以 place:end 取操作，不改写隐藏项', () => {
    const calls = [];
    const columns = [
      { name: 'title' },
      {
        name: 'options',
        renderType: 'options',
        getValueOf: (item, ctx) => {
          calls.push({ item, ctx });
          return [
            { children: '编辑', hidden: false },
            { children: '删除', hidden: true }
          ];
        }
      }
    ];
    const row = { id: '9', title: 'x' };
    const collected = collectCardActions(columns, row);
    assert.equal(collected.present, true);
    assert.deepEqual(calls, [{ item: row, ctx: { place: 'end' } }]);
    assert.equal(collected.value[0].children, '编辑');
    assert.equal(collected.value[1].hidden, true);
    assert.equal(collectCardActions([], row).present, false);
  });

  test('详情路径与表格主列一致；表格数据源优先 displayDataSource', () => {
    assert.equal(detailPath('/admin/flow/', 'abc'), '/admin/flow/detail/abc');
    assert.equal(detailPath('/admin/flow', 1), '/admin/flow/detail/1');
    assert.deepEqual(listFromTableProps({ displayDataSource: [1], dataSource: [2] }), [1]);
    assert.deepEqual(listFromTableProps({ dataSource: [2] }), [2]);
    assert.deepEqual(listFromTableProps({}), []);
  });
});

describe('流程列表卡片样式契约：窄屏不溢出、无左侧装饰条', () => {
  const scss = fs.readFileSync(path.join(__dirname, 'style.module.scss'), 'utf8');

  test('网格最小列宽不超过 100%，shell 有 min-width:0 与 max-width:100%', () => {
    assert.match(scss, /minmax\(\s*min\(\s*100%\s*,/);
    assert.match(scss, /\.flowListShell[\s\S]*?min-width:\s*0/);
    assert.match(scss, /\.flowListShell[\s\S]*?max-width:\s*100%/);
    assert.match(scss, /\.flowListCard[\s\S]*?min-width:\s*0/);
    assert.match(scss, /\.flowListCard[\s\S]*?max-width:\s*100%/);
    assert.match(scss, /\.flowListMobile[\s\S]*?max-width:\s*100%/);
    assert.doesNotMatch(scss, /minmax\(\s*300px/);
  });

  test('不用整页 overflow:hidden，不加左侧色条，保留完整卡片边框', () => {
    assert.doesNotMatch(scss, /html\s*\{[^}]*overflow:\s*hidden/);
    assert.doesNotMatch(scss, /body\s*\{[^}]*overflow:\s*hidden/);
    assert.doesNotMatch(scss, /border-left:\s*[2-9]px|border-left:\s*\d{2,}px/);
    assert.doesNotMatch(scss, /::before[\s\S]{0,120}left:\s*0/);
    assert.match(scss, /\.flowListCard[\s\S]*?border:\s*1px solid/);
  });
});
