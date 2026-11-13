const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isDecompositionTemplate, parseDecompositionDeliverable, parseDecompositionOutput, extractLabeledFields, tasksFromJson } = require('./decompositionPlan');

describe('开发任务拆分：只整理真实数据，不编造任务', () => {
  test('只识别 decomposition_plan 与 design_decomposition，不把拆分任务树当材料', () => {
    assert.equal(isDecompositionTemplate('design_decomposition'), true);
    assert.equal(isDecompositionTemplate('decomposition_plan'), true);
    assert.equal(isDecompositionTemplate('requirement_doc'), false);
    assert.equal(parseDecompositionDeliverable({ templateCode: 'options', options: [{ type: 'text', label: 'A', content: 'x' }] }).kind, 'skip');
  });

  test('空 options 是 empty，不生成假任务', () => {
    assert.equal(parseDecompositionDeliverable({ templateCode: 'design_decomposition', options: [] }).kind, 'empty');
    assert.deepEqual(parseDecompositionDeliverable({ templateCode: 'design_decomposition' }).tasks, []);
  });

  test('每条 text option 的 label 是任务名，content 里已有的范围/负责人等才进字段', () => {
    const parsed = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [
        { type: 'text', label: '登录模块', content: '范围：实现登录与注册\n优先级：high\n负责人：张三\n依赖：账号服务\n验收：可完成注册并登录' },
        { type: 'text', label: '列表页', content: '只展示已发布的文档。' }
      ]
    });
    assert.equal(parsed.kind, 'tasks');
    assert.equal(parsed.tasks.length, 2);
    assert.equal(parsed.tasks[0].title, '登录模块');
    assert.equal(parsed.tasks[0].scope, '实现登录与注册');
    assert.equal(parsed.tasks[0].priority, 'high');
    assert.equal(parsed.tasks[0].owner, '张三');
    assert.equal(parsed.tasks[0].depends, '账号服务');
    assert.equal(parsed.tasks[0].acceptance, '可完成注册并登录');
    assert.equal(parsed.tasks[1].title, '列表页');
    assert.equal(parsed.tasks[1].scope, '只展示已发布的文档。');
    assert.equal('owner' in parsed.tasks[1], false);
    assert.equal('priority' in parsed.tasks[1], false);
  });

  test('正文是带 title 的 JSON 数组时按对象字段展示，不是整段 JSON', () => {
    const parsed = parseDecompositionDeliverable({
      templateCode: 'decomposition_plan',
      options: [
        {
          type: 'text',
          label: '任务列表',
          content: JSON.stringify([
            { title: '产品方案 A', scope: '范围一', priority: 'medium', ownerUserId: 'u1' },
            { title: '产品方案 B', nodeType: 'product_design' }
          ])
        }
      ]
    });
    assert.equal(parsed.kind, 'tasks');
    assert.equal(parsed.tasks[0].title, '产品方案 A');
    assert.equal(parsed.tasks[0].owner, 'u1');
    assert.equal(parsed.tasks[1].title, '产品方案 B');
    assert.equal(parsed.tasks[1].nodeType, 'product_design');
    assert.equal('scope' in parsed.tasks[1], false);
  });

  test('同一级两个及以上 Markdown 标题才分条；单个标题或无标题的段落不拆成假任务', () => {
    const split = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [
        {
          type: 'text',
          label: '开发任务拆分',
          content: '先说明整体顺序。\n\n## 接口改造\n范围：调整上传接口\n\n## 页面适配\n范围：列表与详情'
        }
      ]
    });
    assert.equal(split.kind, 'tasks');
    assert.equal(split.lead, '先说明整体顺序。');
    assert.equal(split.tasks.length, 2);
    assert.equal(split.tasks[0].title, '接口改造');
    assert.equal(split.tasks[0].scope, '调整上传接口');
    assert.equal(split.tasks[1].title, '页面适配');

    const single = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [{ type: 'text', label: '开发任务拆分', content: '## 只有一节\n这是一整段说明，不要当成两个任务。' }]
    });
    assert.equal(single.kind, 'materials');
    assert.equal(single.tasks.length, 0);
    assert.equal(single.materials[0].content.includes('只有一节'), true);

    const prose = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [{ type: 'text', label: '内容', content: '这是一段没有标题的说明文字，不能推断出任务。' }]
    });
    assert.equal(prose.kind, 'materials');
    assert.equal(prose.tasks.length, 0);
  });

  test('file / url 选项保留为附件，不编成任务；非法 JSON 不当任务', () => {
    const parsed = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [
        { type: 'text', label: '网关改造', content: '范围：限流' },
        { type: 'file', label: '拆分附图', fileId: 'f1', fileName: 'plan.png' },
        { type: 'url', label: '说明页', url: 'https://example.com/plan' },
        { type: 'text', label: '内容', content: '{not json' }
      ]
    });
    assert.equal(parsed.kind, 'tasks');
    assert.equal(parsed.tasks.length, 1);
    assert.equal(parsed.tasks[0].title, '网关改造');
    assert.equal(parsed.materials.length, 3);
    assert.equal(parsed.materials[0].fileId, 'f1');
    assert.equal(parsed.materials[1].url, 'https://example.com/plan');
  });

  test('options 的 type 可以是表单选项对象', () => {
    const parsed = parseDecompositionDeliverable({
      templateCode: 'design_decomposition',
      options: [{ type: { value: 'text', label: '文本' }, label: '缓存层', content: '目标：降低延迟' }]
    });
    assert.equal(parsed.tasks[0].title, '缓存层');
    assert.equal(parsed.tasks[0].goal, '降低延迟');
  });
});

describe('裂变产出 outputs.decomposition：按真实形状展示', () => {
  test('落树结果是 confirmationId 与 nodeIds，不是任务列表', () => {
    const parsed = parseDecompositionOutput({ confirmationId: 'c1', nodeIds: ['n2', 'n3'] });
    assert.equal(parsed.kind, 'applied');
    assert.equal(parsed.confirmationId, 'c1');
    assert.deepEqual(parsed.nodeIds, ['n2', 'n3']);
  });

  test('若产出本身是 children 任务数组，按任务整理', () => {
    const parsed = parseDecompositionOutput({ children: [{ title: '子任务', scope: '前端' }], rationale: '并行' });
    assert.equal(parsed.kind, 'tasks');
    assert.equal(parsed.lead, '并行');
    assert.equal(parsed.tasks[0].title, '子任务');
    assert.equal(parsed.tasks[0].scope, '前端');
  });

  test('未知对象留给调用方原样展示，不编造字段', () => {
    const parsed = parseDecompositionOutput({ foo: 1 });
    assert.equal(parsed.kind, 'unknown');
    assert.deepEqual(parsed.raw, { foo: 1 });
  });
});

describe('展示组件接到拆分材料，不改任务树', () => {
  const panel = fs.readFileSync(path.join(__dirname, 'TabDetail/DeliverablesPanel.js'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, 'TabDetail/DecompositionPlanView.js'), 'utf8');
  const tree = fs.readFileSync(path.join(__dirname, 'TabDetail/Tree.js'), 'utf8');
  const scss = fs.readFileSync(path.join(__dirname, 'style.module.scss'), 'utf8');
  const context = fs.readFileSync(path.join(__dirname, 'TabDetail/AiRunContextView.js'), 'utf8');

  test('材料卡片与上下文对这两个模板走 DecompositionPlanView，Tree 组件未改业务', () => {
    assert.match(panel, /isDecompositionTemplate\(item\.templateCode\)/);
    assert.match(panel, /DecompositionPlanView/);
    assert.match(context, /DecompositionPlanView/);
    assert.match(view, /decompTitle/);
    assert.match(view, /FlowCardMeta/);
    assert.doesNotMatch(view, /<Tag/);
    assert.match(tree, /createWithRemoteLoader/);
  });

  test('拆分条目有边界与顺序号，没有左侧装饰条，附件仍用既有预览', () => {
    assert.match(scss, /\.decompTask[\s\S]*?border-top:\s*1px solid/);
    assert.doesNotMatch(scss, /\.decompTask[\s\S]{0,400}border-left:\s*[2-9]px/);
    assert.match(view, /FileAttachmentPreview/);
    assert.match(view, /resolveFilePreviewPresentation/);
  });
});
