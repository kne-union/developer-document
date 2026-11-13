'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveFileId,
  isSafeHttpUrl,
  filenameFromUrl,
  filePreviewType,
  isInPageUrlPreviewTemplate,
  isLikelyEmbedBlockedHost,
  classifyFileAttachment,
  classifyPrototypeUrl,
  classifyDeliverablePreview,
  staysOnCurrentPage,
  IN_PAGE_URL_PREVIEW_TEMPLATE_CODES
} = require('./deliverablePreview');

describe('resolveFileId', () => {
  test('从字符串、数字、上传对象和单元素数组取出 id', () => {
    assert.equal(resolveFileId('abc-1'), 'abc-1');
    assert.equal(resolveFileId(123456), '123456');
    assert.equal(resolveFileId({ id: 'oss-1' }), 'oss-1');
    assert.equal(resolveFileId({ fileId: 'oss-2' }), 'oss-2');
    assert.equal(resolveFileId({ value: 'oss-3' }), 'oss-3');
    assert.equal(resolveFileId([{ id: 'oss-4' }]), 'oss-4');
    assert.equal(resolveFileId('  trimmed  '), 'trimmed');
  });

  test('空值、空数组、无关对象返回空字符串', () => {
    assert.equal(resolveFileId(null), '');
    assert.equal(resolveFileId(undefined), '');
    assert.equal(resolveFileId(''), '');
    assert.equal(resolveFileId('   '), '');
    assert.equal(resolveFileId([]), '');
    assert.equal(resolveFileId({ name: 'x.png' }), '');
  });
});

describe('classifyFileAttachment', () => {
  test('无 fileId 视为空，即使有文件名', () => {
    assert.deepEqual(classifyFileAttachment({ fileName: 'a.pdf' }), { kind: 'empty', id: '', filename: '', previewType: 'unknown' });
    assert.equal(classifyFileAttachment({}).kind, 'empty');
  });

  test('OSS 附件按文件名识别预览类型，未知类型仍为页内 ossPreview', () => {
    assert.deepEqual(classifyFileAttachment({ fileId: 'f1', fileName: '用例.xlsx' }), { kind: 'ossPreview', id: 'f1', filename: '用例.xlsx', previewType: 'office' });
    assert.deepEqual(classifyFileAttachment({ fileId: { id: 'f2' }, fileName: '报告.pdf' }), { kind: 'ossPreview', id: 'f2', filename: '报告.pdf', previewType: 'pdf' });
    assert.deepEqual(classifyFileAttachment({ fileId: 'f3', fileName: '截图.png' }), { kind: 'ossPreview', id: 'f3', filename: '截图.png', previewType: 'image' });
    const unknown = classifyFileAttachment({ fileId: 'f4', fileName: 'bundle.sketch' });
    assert.equal(unknown.kind, 'ossPreview');
    assert.equal(unknown.previewType, 'unknown');
    assert.equal(staysOnCurrentPage(unknown), true);
  });

  test('缺少文件名时用 id 作为 filename', () => {
    assert.deepEqual(classifyFileAttachment({ fileId: 'f5' }), { kind: 'ossPreview', id: 'f5', filename: 'f5', previewType: 'unknown' });
  });
});

describe('classifyPrototypeUrl', () => {
  test('空值为 empty', () => {
    assert.equal(classifyPrototypeUrl('').kind, 'empty');
    assert.equal(classifyPrototypeUrl('  ').kind, 'empty');
    assert.equal(classifyPrototypeUrl(null).kind, 'empty');
  });

  test('拒绝非 http(s)、带凭证和畸形地址，不把它们当成可打开预览', () => {
    assert.equal(classifyPrototypeUrl('javascript:alert(1)').kind, 'invalid');
    assert.equal(classifyPrototypeUrl('data:text/html,hi').kind, 'invalid');
    assert.equal(classifyPrototypeUrl('file:///etc/passwd').kind, 'invalid');
    assert.equal(classifyPrototypeUrl('https://user:pass@example.com/a.png').kind, 'invalid');
    assert.equal(classifyPrototypeUrl('not a url').kind, 'invalid');
    assert.equal(isSafeHttpUrl('https://example.com/a.png'), true);
    assert.equal(isSafeHttpUrl('http://example.com/a.png'), true);
    assert.equal(isSafeHttpUrl('javascript:void(0)'), false);
  });

  test('可识别的文件 URL 走 FilePreview src 页内嵌入，查询串不影响扩展名', () => {
    const image = classifyPrototypeUrl('https://cdn.example.com/path/design.png?v=2');
    assert.deepEqual(image, { kind: 'filePreview', src: 'https://cdn.example.com/path/design.png?v=2', filename: 'design.png', previewType: 'image' });
    const pdf = classifyPrototypeUrl('https://cdn.example.com/%E8%AE%BE%E8%AE%A1%E7%A8%BF.pdf');
    assert.equal(pdf.kind, 'filePreview');
    assert.equal(pdf.filename, '设计稿.pdf');
    assert.equal(pdf.previewType, 'pdf');
    const html = classifyPrototypeUrl('https://static.example.com/proto/index.html');
    assert.equal(html.kind, 'filePreview');
    assert.equal(html.previewType, 'html');
    const docx = classifyPrototypeUrl('https://static.example.com/spec.docx');
    assert.equal(docx.previewType, 'office');
    assert.equal(staysOnCurrentPage(html), true);
    assert.equal(filenameFromUrl('https://cdn.example.com/path/design.png?v=2'), 'design.png');
    assert.equal(filePreviewType('index.htm'), 'html');
  });

  test('设计工具和外站无扩展名链接为 unsupported，不自动跳转', () => {
    const figma = classifyPrototypeUrl('https://www.figma.com/file/abc/Demo');
    assert.equal(figma.kind, 'unsupported');
    assert.equal(figma.reason, 'embed-blocked');
    assert.equal(figma.embedBlocked, true);
    assert.equal(figma.url, 'https://www.figma.com/file/abc/Demo');
    assert.equal(staysOnCurrentPage(figma), true);

    const axure = classifyPrototypeUrl('https://preview.axure.cloud/share/xyz');
    assert.equal(axure.kind, 'unsupported');
    assert.equal(axure.reason, 'embed-blocked');

    const lanhu = classifyPrototypeUrl('https://lanhuapp.com/web/#/item/project/stage?pid=1');
    assert.equal(lanhu.kind, 'unsupported');

    const generic = classifyPrototypeUrl('https://docs.example.com/prototype/view');
    assert.equal(generic.kind, 'unsupported');
    assert.equal(generic.reason, 'unsupported-embed');
    assert.equal(generic.embedBlocked, false);
    assert.equal(isLikelyEmbedBlockedHost('https://www.figma.com/file/abc'), true);
    assert.equal(isLikelyEmbedBlockedHost('https://docs.example.com/view'), false);
  });
});

describe('classifyDeliverablePreview 渲染分支', () => {
  test('扩展材料 jsonb 的 file 行走 OSS 页内预览，url / text 行不套用原型预览', () => {
    const fileRow = classifyDeliverablePreview({ contentType: 'jsonb', templateCode: 'options' }, { type: 'file', fileId: 'm1', fileName: '附件.pdf' });
    assert.equal(fileRow.kind, 'ossPreview');
    assert.equal(fileRow.id, 'm1');

    const urlRow = classifyDeliverablePreview({ contentType: 'jsonb', templateCode: 'options' }, { type: 'url', url: 'https://www.figma.com/file/abc' });
    assert.deepEqual(urlRow, { kind: 'link', url: 'https://www.figma.com/file/abc' });
    assert.equal(staysOnCurrentPage(urlRow), false);

    const textRow = classifyDeliverablePreview({ contentType: 'jsonb', templateCode: 'options' }, { type: 'text', content: '说明' });
    assert.deepEqual(textRow, { kind: 'text', content: '说明' });
  });

  test('测试阶段 contentType=file（测试用例 / 测试报告）走同一套 OSS 预览', () => {
    const testCases = classifyDeliverablePreview({ contentType: 'file', templateCode: 'test_cases', fileId: 't1', fileName: 'cases.xlsx' });
    assert.deepEqual(testCases, { kind: 'ossPreview', id: 't1', filename: 'cases.xlsx', previewType: 'office' });

    const testReport = classifyDeliverablePreview({ contentType: 'file', templateCode: 'test_report', fileId: 't2', fileName: 'report.pdf' });
    assert.equal(testReport.kind, 'ossPreview');
    assert.equal(testReport.previewType, 'pdf');
    assert.equal(staysOnCurrentPage(testReport), true);
  });

  test('原型 / 设计稿 URL 走页内分类，其他 url 字段仍是外链', () => {
    const proto = classifyDeliverablePreview({ contentType: 'url', templateCode: 'prototype', url: 'https://cdn.example.com/a.png' });
    assert.equal(proto.kind, 'filePreview');
    assert.equal(staysOnCurrentPage(proto), true);

    const protoFigma = classifyDeliverablePreview({ contentType: 'url', templateCode: 'prototype', url: 'https://www.figma.com/file/abc' });
    assert.equal(protoFigma.kind, 'unsupported');
    assert.equal(staysOnCurrentPage(protoFigma), true);

    const prLink = classifyDeliverablePreview({ contentType: 'url', templateCode: 'pr_link', url: 'https://github.com/org/repo/pull/1' });
    assert.deepEqual(prLink, { kind: 'link', url: 'https://github.com/org/repo/pull/1' });
    assert.equal(staysOnCurrentPage(prLink), false);

    const staging = classifyDeliverablePreview({ contentType: 'url', templateCode: 'staging_env', url: 'https://staging.example.com' });
    assert.equal(staging.kind, 'link');

    const defect = classifyDeliverablePreview({ contentType: 'url', templateCode: 'defect_closure', url: 'https://jira.example.com/browse/D-1' });
    assert.equal(defect.kind, 'link');

    assert.deepEqual(IN_PAGE_URL_PREVIEW_TEMPLATE_CODES, ['prototype']);
    assert.equal(isInPageUrlPreviewTemplate('prototype'), true);
    assert.equal(isInPageUrlPreviewTemplate('pr_link'), false);
  });

  test('文本 / 清单等非文件类型不进入预览分类', () => {
    assert.equal(classifyDeliverablePreview({ contentType: 'text', content: 'hello' }).kind, 'passthrough');
    assert.equal(classifyDeliverablePreview({ contentType: 'checklist', checklist: [] }).kind, 'passthrough');
    assert.equal(classifyDeliverablePreview(null).kind, 'empty');
  });
});
