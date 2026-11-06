const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256, renderFrontmatter, stripFrontmatter, formatSkillFile, buildMemoryBlock, buildInstallManifest, MEMORY_BLOCK_ID, TARGET_VALUES } = require('../libs/utils/skillAssetFormat');

const GENERATED_AT = '2026-11-06T22:00:00.000Z';

const rows = [
  {
    id: '1',
    type: 'rule',
    name: 'commit-message',
    title: 'Commit 信息规范',
    description: '约定式提交，统一团队 Git 提交信息格式',
    alwaysApply: true,
    globs: ['**/*', '*.js'],
    category: 'process',
    content: '# Commit 信息规范\n\n必须用 feat/fix 开头。',
    status: 'active',
    source: 'cursor-setting/rules',
    updatedAt: '2026-11-06T21:47:13+08:00'
  },
  {
    id: '2',
    type: 'rule',
    name: 'scoped-rule',
    description: '仅对 markdown 生效',
    alwaysApply: false,
    globs: ['**/*.md'],
    content: '# 局部规则\n',
    status: 'active'
  },
  {
    id: '3',
    type: 'skill',
    name: 'weekly-report',
    title: '周报生成',
    description: '生成周报',
    content: '# 周报\n\n按周汇总。',
    status: 'active'
  },
  {
    id: '4',
    type: 'rule',
    name: 'closed-rule',
    description: '已关闭',
    status: 'closed',
    content: 'x'
  }
];

test('TARGET_VALUES 只支持 cursor / workbuddy', () => {
  assert.deepEqual(TARGET_VALUES, ['cursor', 'workbuddy']);
  assert.throws(() => buildInstallManifest({ rows, target: 'unknown' }), /target 必须是/);
});

test('YAML frontmatter 应正确序列化中文、布尔与数组', () => {
  const frontmatter = renderFrontmatter({ description: '约定式提交: feat/fix "规范"', alwaysApply: true, globs: ['**/*', '*.js'] });
  assert.ok(frontmatter.startsWith('---\n'));
  assert.ok(frontmatter.endsWith('\n---'));
  assert.ok(frontmatter.includes('description: "约定式提交: feat/fix \\"规范\\""'));
  assert.ok(frontmatter.includes('alwaysApply: true'));
  assert.ok(frontmatter.includes('  - "**/*"'));
});

test('stripFrontmatter 应剥离 AI 上传正文自带的 frontmatter', () => {
  assert.equal(stripFrontmatter('---\nname: x\n---\n\n# 正文\n'), '# 正文\n');
  assert.equal(stripFrontmatter('# 正文\n'), '# 正文\n');
  assert.equal(formatSkillFile(rows[0], 'cursor').content.split('---').length, 3);
});

test('cursor rule 输出 .mdc，frontmatter 含 alwaysApply 与 globs', () => {
  const file = formatSkillFile(rows[0], 'cursor');
  assert.equal(file.path, '~/.cursor/rules/commit-message.mdc');
  assert.equal(file.frontmatter.description, '约定式提交，统一团队 Git 提交信息格式');
  assert.equal(file.frontmatter.alwaysApply, true);
  assert.deepEqual(file.frontmatter.globs, ['**/*', '*.js']);
  assert.equal(file.contentHash, sha256(file.content));
  assert.ok(file.content.includes('globs:\n  - "**/*"'));
});

test('cursor skill 输出 SKILL.md，globs 为空时不输出该字段', () => {
  const file = formatSkillFile(rows[2], 'cursor');
  assert.equal(file.path, '~/.cursor/skills/weekly-report/SKILL.md');
  assert.equal(file.frontmatter.name, 'weekly-report');
  assert.equal(file.frontmatter.description, '生成周报');
  assert.ok(!file.content.includes('alwaysApply'));
  assert.ok(!file.content.includes('globs'));
});

test('workbuddy rule 带规则前缀，且 alwaysApply/globs 不进 frontmatter', () => {
  const file = formatSkillFile(rows[0], 'workbuddy');
  assert.equal(file.path, '~/.workbuddy/skills/commit-message/SKILL.md');
  assert.ok(file.frontmatter.description.startsWith('规则（rule）：'));
  assert.ok(file.frontmatter.description.includes('属于用户固定约定'));
  assert.ok(!file.content.includes('alwaysApply:'));
  assert.ok(!file.content.includes('globs:'));
  assert.equal(file.alwaysApply, true, 'files[] 仍保留 alwaysApply 供 CLI 判定');
});

test('description 为空时依次回落 title / name', () => {
  const file = formatSkillFile({ type: 'skill', name: 'no-desc', title: '有标题', content: 'x' }, 'workbuddy');
  assert.equal(file.frontmatter.description, '有标题');
  assert.equal(formatSkillFile({ type: 'skill', name: 'no-desc', content: 'x' }, 'workbuddy').frontmatter.description, 'no-desc');
});

test('非法 name 应拒绝导出，防止路径穿越', () => {
  assert.throws(() => formatSkillFile({ type: 'skill', name: '../evil', content: 'x' }, 'workbuddy'), /不合法/);
  assert.throws(() => buildInstallManifest({ rows: [{ type: 'skill', name: 'a/b', status: 'active' }], target: 'cursor' }), /不合法/);
});

test('默认只导出 active，includeClosed=true 才包含关闭条目', () => {
  const manifest = buildInstallManifest({ rows, target: 'cursor', generatedAt: GENERATED_AT });
  assert.equal(manifest.total, 3);
  assert.ok(!manifest.files.some(file => file.name === 'closed-rule'));
  assert.deepEqual(manifest.memoryBlocks, []);
  const all = buildInstallManifest({ rows, target: 'cursor', includeClosed: true });
  assert.equal(all.total, 4);
});

test('workbuddy 下 rule 与 skill 同名应报错', () => {
  const conflict = rows.concat([{ type: 'skill', name: 'commit-message', status: 'active', content: 'x' }]);
  assert.throws(() => buildInstallManifest({ rows: conflict, target: 'workbuddy' }), /同一目录/);
  assert.doesNotThrow(() => buildInstallManifest({ rows: conflict, target: 'cursor' }));
});

test('memoryBlocks 只汇总 alwaysApply=true 的 rule，并给出全文路径', () => {
  const manifest = buildInstallManifest({ rows, target: 'workbuddy', generatedAt: GENERATED_AT });
  assert.equal(manifest.memoryBlocks.length, 1);
  const block = manifest.memoryBlocks[0];
  assert.equal(block.blockId, MEMORY_BLOCK_ID);
  assert.equal(block.strategy, 'replace-managed-block');
  assert.equal(block.scope, 'user');
  assert.equal(block.path, '~/.workbuddy/user-*-personal/MEMORY.md');
  assert.ok(block.content.includes(`<!-- BEGIN managed:${MEMORY_BLOCK_ID} -->`));
  assert.ok(block.content.includes(`<!-- END managed:${MEMORY_BLOCK_ID} -->`));
  assert.ok(block.content.includes('**commit-message**'));
  assert.ok(block.content.includes('~/.workbuddy/skills/commit-message/SKILL.md'));
  assert.ok(!block.content.includes('**scoped-rule**'), 'alwaysApply=false 的规则不应进入必加载层');
  assert.equal(block.contentHash, sha256(block.content));
  assert.equal(block.degraded, false);
});

test('托管区块超预算时应降级为纯索引并保持在预算内', () => {
  const many = Array.from({ length: 120 }, (_, index) => ({
    type: 'rule',
    name: `rule-${index}`,
    description: `第 ${index} 条常驻规则的约束说明，需要在命中场景时优先加载对应技能读取完整正文。`,
    alwaysApply: true,
    content: '# 正文\n',
    status: 'active'
  }));
  const block = buildMemoryBlock(many, 800);
  assert.equal(block.degraded, true);
  assert.ok(block.content.length <= 800);
  assert.ok(block.content.includes('skill-install-manifest.json'));
  assert.ok(block.content.startsWith(`<!-- BEGIN managed:${MEMORY_BLOCK_ID} -->`));
});

test('两种 target 的 files[] 路径与内容互不串用', () => {
  const cursor = buildInstallManifest({ rows, target: 'cursor', generatedAt: GENERATED_AT });
  const workbuddy = buildInstallManifest({ rows, target: 'workbuddy', generatedAt: GENERATED_AT });
  assert.equal(cursor.target, 'cursor');
  assert.equal(workbuddy.target, 'workbuddy');
  assert.ok(cursor.files.every(file => file.path.startsWith('~/.cursor/')));
  assert.ok(workbuddy.files.every(file => file.path.startsWith('~/.workbuddy/skills/')));
  assert.notEqual(cursor.files[0].content, workbuddy.files[0].content, '同一条规则在两个目标下 frontmatter 不同');
});
