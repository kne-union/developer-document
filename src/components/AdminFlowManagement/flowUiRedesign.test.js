const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');

const blockOf = (scss, name) => {
  const re = new RegExp('^\\.' + name + '\\s*\\{', 'm');
  const start = scss.search(re);
  assert.ok(start >= 0, name + ' missing');
  let i = scss.indexOf('{', start);
  let depth = 0;
  for (let k = i; k < scss.length; k++) {
    if (scss[k] === '{') depth++;
    else if (scss[k] === '}') {
      depth--;
      if (depth === 0) return scss.slice(start, k + 1);
    }
  }
  return scss.slice(start);
};

describe('卡片标题区：完整视觉构成，不是标签堆在标题旁', () => {
  const header = read('FlowCardHeader.js');
  const scss = read('style.module.scss');
  const panel = read('TabDetail/DeliverablesPanel.js');

  test('首行只有标题与操作，状态走 FlowCardMeta，没有 extra/summary 旧槽', () => {
    assert.match(header, /flowCardHeaderHeadline/);
    assert.match(header, /flowCardHeaderActions/);
    assert.match(header, /flowCardHeaderDescription/);
    assert.match(header, /flowCardHeaderMetaSlot/);
    assert.match(header, /export const FlowCardMeta/);
    assert.doesNotMatch(header, /\bextra\b/);
    assert.doesNotMatch(header, /\bsummary\b/);
    assert.match(header, /compact \? 'span' : 'header'/);
  });

  test('标题行沿第一基线对齐；操作组统一高度；元信息用间隔点而非 Tag', () => {
    const headline = blockOf(scss, 'flowCardHeaderHeadline');
    assert.match(headline, /align-items:\s*first baseline/);
    const actions = blockOf(scss, 'flowCardHeaderActions');
    assert.match(actions, /height:\s*28px/);
    const meta = blockOf(scss, 'flowCardMetaItem');
    assert.match(meta, /&:not\(:last-child\)::after/);
    assert.match(meta, /\[data-tone='success'\]/);
    assert.doesNotMatch(scss, /\.flowCardHeaderExtra/);
    assert.doesNotMatch(scss, /\.flowCardHeaderTitleRow/);
  });

  test('材料卡片把必填、状态、来源放进 Meta，验收说明作为次级描述，操作仍主按钮+更多', () => {
    assert.match(panel, /<FlowCardMeta/);
    assert.match(panel, /tone: DELIVERABLE_STATUS_COLOR/);
    assert.match(panel, /adminFlow\.deliverable\.acceptCriteria/);
    assert.match(panel, /type="primary"/);
    assert.match(panel, /MoreOutlined/);
    assert.doesNotMatch(panel, /extra=\{/);
    assert.doesNotMatch(panel, /<Tag/);
  });

  test('卡片与弹窗不加左侧装饰条（Markdown 引用语义左边线除外）', () => {
    for (const name of ['deliverableCard', 'descriptionCard', 'recordsSection', 'flowCardHeader', 'contextModal', 'contextLead']) {
      const block = blockOf(scss, name);
      assert.doesNotMatch(block, /border-left:\s*[2-9]px|border-left:\s*\d{2,}px/, name);
    }
    assert.match(scss, /引用左边线是 Markdown 语义/);
    assert.doesNotMatch(header, /border-left/);
  });
});

describe('查看上下文：文档式阅读路径，去掉按钮墙和主内容折叠', () => {
  const view = read('TabDetail/AiRunContextView.js');
  const scss = read('style.module.scss');

  test('主内容是分节 section，原始 JSON 用原生 details，不用 Collapse 或导航按钮墙', () => {
    assert.match(view, /className=\{styles\.contextSection\}/);
    assert.match(view, /contextSectionTitle/);
    assert.match(view, /<details className=\{styles\.contextRawDetails\}>/);
    assert.match(view, /<summary className=\{styles\.contextRawSummary\}>/);
    assert.match(view, /KneDocumentJsonView/);
    assert.match(view, /<Descriptions/);
    assert.match(view, /contextIdentity/);
    assert.doesNotMatch(view, /<Collapse/);
    assert.doesNotMatch(view, /contextNav/);
    assert.doesNotMatch(view, /<Button/);
    assert.doesNotMatch(view, /from 'antd'.*\bSpace\b|Space,/);
    assert.doesNotMatch(view, /defaultOpenSections/);
  });

  test('状态、阶段、目标仍走枚举文案，不直接展示 code', () => {
    assert.match(view, /resolveRunStatus/);
    assert.match(view, /resolveStage/);
    assert.match(view, /resolveGoal/);
    assert.match(view, /enumLabel/);
  });

  test('弹窗容器不自管纵向滚动，没有 max-height + overflow 双滚动', () => {
    const modal = blockOf(scss, 'contextModal');
    assert.doesNotMatch(modal, /max-height:/);
    assert.doesNotMatch(modal, /overflow:\s*auto/);
    assert.match(scss, /\.contextSection[\s\S]*?border-top:\s*1px solid/);
    assert.match(scss, /\.contextRawSummary[\s\S]*?font-size:\s*13px/);
  });

  test('JSONView 仍包在 contextJsonView 里，可横向滚动、不抢纵滚', () => {
    const json = blockOf(scss, 'contextJsonView');
    assert.match(json, /overflow-x:\s*auto/);
    assert.match(json, /overflow-y:\s*visible/);
    assert.match(view, /theme="light"/);
  });
});

describe('流程列表卡片标题区：状态在标题下，不用标签堆砌', () => {
  const cards = read('List/FlowListCards.js');
  const scss = read('List/style.module.scss');

  test('状态与阶段在标题和编号之下的 identity 行，优先级为字色而非 Tag', () => {
    assert.match(cards, /flowListIdentity/);
    assert.match(cards, /flowListPriority/);
    assert.doesNotMatch(cards, /<Tag/);
    assert.doesNotMatch(cards, /flowListFlags/);
    const identity = blockOf(scss, 'flowListIdentity');
    assert.match(identity, /margin:\s*8px 0 0/);
    assert.match(identity, /&:not\(:last-child\)::after/);
  });
});

describe('需求说明正文：与材料内容区同一浅底', () => {
  const scss = read('style.module.scss');
  const index = read('TabDetail/index.js');

  test('descriptionBody 使用与 cardBody 相同的 #f8f9fb，圆角与内边距协调，卡片外壳仍是白底完整边框', () => {
    const body = blockOf(scss, 'descriptionBody');
    const well = blockOf(scss, 'cardBody');
    assert.match(body, /background:\s*#f8f9fb/);
    assert.match(well, /background:\s*#f8f9fb/);
    assert.match(body, /border-radius:\s*8px/);
    assert.match(body, /padding:\s*12px 14px/);
    assert.match(body, /box-sizing:\s*border-box/);
    const shell = blockOf(scss, 'descriptionCard');
    assert.match(shell, /background:\s*#fff/);
    assert.match(shell, /border:\s*1px solid/);
    assert.doesNotMatch(body, /border-left:\s*[2-9]px/);
    assert.match(index, /styles\.descriptionBody/);
    assert.match(index, /adminFlow\.detail\.descriptionEmpty/);
  });
});
