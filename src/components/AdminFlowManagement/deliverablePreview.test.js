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
  IN_PAGE_URL_PREVIEW_TEMPLATE_CODES,
  PREVIEW_PRESENTATION,
  CORE_FILE_TEMPLATE_CODES,
  SUPPLEMENTARY_TEMPLATE_CODES,
  resolveFilePreviewPresentation,
  classifyPreviewSource,
  parseFlowRef,
  parseFileHref,
  appFileIdFromHref,
  classifyEvidencePreview,
  collectMarkdownFileAttachments
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

describe('流程详情核心 / 非核心预览策略', () => {
  test('项目未声明既有核心标记，策略只按模板角色和入口种类分级，不用后缀判断重要性', () => {
    assert.deepEqual(CORE_FILE_TEMPLATE_CODES, ['prototype', 'test_report', 'test_cases']);
    assert.deepEqual(SUPPLEMENTARY_TEMPLATE_CODES, ['options', 'background_ref', 'requirement_review', 'design_review', 'decomposition_plan', 'design_decomposition', 'regression_note']);
    // 同一份 PDF：测试报告主文件是核心页内预览，扩展材料里则是弹窗，说明不是按后缀猜的
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_report', entryKind: 'deliverable_main' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'options', entryKind: 'option_file' }), PREVIEW_PRESENTATION.MODAL);
    const report = classifyPreviewSource({ fileId: 'report-1', fileName: '报告.pdf' });
    const extra = classifyPreviewSource({ fileId: 'extra-1', fileName: '报告.pdf' });
    assert.equal(report.kind, 'ossPreview');
    assert.equal(extra.kind, 'ossPreview');
    assert.equal(report.previewType, extra.previewType);
  });

  test('用户指定必须直接可见的入口：原型、测试报告、用例主文档、步骤截图', () => {
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'prototype', entryKind: 'deliverable_main' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_report', entryKind: 'deliverable_main' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_case_document' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_step_screenshot' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'test_unlinked_screenshot' }), PREVIEW_PRESENTATION.INLINE);
    // 未传 entryKind 时，核心模板的主文件仍是页内
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'prototype' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_report' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_cases' }), PREVIEW_PRESENTATION.INLINE);
  });

  test('扩展材料、评审、背景、拆解、回归截图、正文附件、台账文件一律弹窗', () => {
    const modalTemplates = ['options', 'background_ref', 'requirement_review', 'design_review', 'decomposition_plan', 'design_decomposition', 'regression_note'];
    modalTemplates.forEach(templateCode => {
      assert.equal(resolveFilePreviewPresentation({ templateCode, entryKind: 'option_file' }), PREVIEW_PRESENTATION.MODAL, templateCode);
    });
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'regression_note', entryKind: 'regression_screenshot' }), PREVIEW_PRESENTATION.MODAL);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'requirement_doc', entryKind: 'markdown_file' }), PREVIEW_PRESENTATION.MODAL);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'tech_design', entryKind: 'markdown_file' }), PREVIEW_PRESENTATION.MODAL);
    assert.equal(resolveFilePreviewPresentation({ entryKind: 'ledger_file' }), PREVIEW_PRESENTATION.MODAL);
    // 未知模板上的文件默认非核心，避免把补充附件做成页内大预览
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'unknown_future', entryKind: 'option_file' }), PREVIEW_PRESENTATION.MODAL);
    assert.equal(resolveFilePreviewPresentation({}), PREVIEW_PRESENTATION.MODAL);
  });

  test('普通非文件业务链接不强改预览', () => {
    ['pr_link', 'staging_env', 'defect_closure', 'monitor_snapshot'].forEach(templateCode => {
      assert.equal(resolveFilePreviewPresentation({ templateCode, entryKind: 'business_url' }), PREVIEW_PRESENTATION.LINK);
      const classified = classifyDeliverablePreview({ contentType: 'url', templateCode, url: 'https://example.com/path' });
      assert.equal(classified.kind, 'link');
      assert.equal(staysOnCurrentPage(classified), false);
    });
  });

  test('核心模板 jsonb 里的附件仍算主交付材料（测试用例），补充模板则否', () => {
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'test_cases', entryKind: 'option_file' }), PREVIEW_PRESENTATION.INLINE);
    assert.equal(resolveFilePreviewPresentation({ templateCode: 'options', entryKind: 'option_file' }), PREVIEW_PRESENTATION.MODAL);
  });

  test('fileId 与 src 两种来源都能分类，无扩展名 OSS 仍可预览，外链无扩展名不当作文件', () => {
    const oss = classifyPreviewSource({ fileId: '123456', fileName: '设计稿' });
    assert.equal(oss.kind, 'ossPreview');
    assert.equal(oss.id, '123456');
    const srcFile = classifyPreviewSource({ src: 'https://cdn.example.com/spec.pdf', fileName: '规格.pdf' });
    assert.equal(srcFile.kind, 'filePreview');
    assert.equal(srcFile.src, 'https://cdn.example.com/spec.pdf');
    const empty = classifyPreviewSource({});
    assert.equal(empty.kind, 'empty');
    const noExt = parseFileHref('https://www.figma.com/file/abc', '设计稿');
    assert.equal(noExt, null);
    const blocked = classifyPreviewSource({ src: 'https://www.figma.com/file/abc' });
    assert.equal(blocked.kind, 'unsupported');
  });

  test('非法协议、带凭证 URL、操作系统 file:// 都判无效且不生成预览', () => {
    assert.equal(parseFileHref('javascript:alert(1)', 'x').kind, 'invalid');
    assert.equal(parseFileHref('data:text/html,hi', 'x').kind, 'invalid');
    assert.equal(parseFileHref('vbscript:msg', 'x').kind, 'invalid');
    assert.equal(parseFileHref('file:///etc/passwd', 'x').kind, 'invalid');
    assert.equal(classifyPreviewSource({ src: 'javascript:alert(1)' }).kind, 'invalid');
    assert.equal(classifyPreviewSource({ src: 'https://user:pass@cdn.example.com/a.pdf' }).kind, 'invalid');
    // 业务 file:{id} 前缀是合法附件
    const business = parseFileHref('file:abc123?filename=说明.pdf', '说明');
    assert.equal(business.kind, 'ossPreview');
    assert.equal(business.id, 'abc123');
    assert.equal(business.filename, '说明.pdf');
  });

  test('解析应用文件地址：相对路径与同源 file-url，不把任意站点的同名路径当成本站文件', () => {
    assert.equal(appFileIdFromHref('/api/v1/static/file-url/fid9?filename=a.pdf'), 'fid9');
    assert.equal(appFileIdFromHref('https://docs.example.com/api/v1/static/file-url/fid9'), 'fid9');
    assert.equal(appFileIdFromHref('https://evil.example/static/file-url/fid9'), '');
    assert.equal(appFileIdFromHref('/other/file-url/fid9'), '');
    const parsed = parseFileHref('/api/v1/static/file-url/fid9?filename=用例.xlsx', '用例');
    assert.equal(parsed.kind, 'ossPreview');
    assert.equal(parsed.id, 'fid9');
    assert.equal(parsed.filename, '用例.xlsx');
  });

  test('正文 markdown 只收集真实附件，业务链接和外链图片不进入预览列表', () => {
    const text = [
      '需求见 [说明](https://wiki.example.com/req) 和 [附件](file:doc99?filename=需求说明书.docx)。',
      '截图：![界面](https://cdn.example.com/ui.png)',
      '仓库文件：[报告](/api/v1/static/file-url/rep1?filename=测试报告.pdf)',
      '外链文件：[表](https://cdn.example.com/data.xlsx)',
      '坏链：[x](javascript:alert(1))',
      '本地：[x](file:///tmp/a.pdf)',
      '重复：[再看](file:doc99?filename=需求说明书.docx)'
    ].join('\n');
    const files = collectMarkdownFileAttachments(text);
    const kinds = files.map(item => ({ kind: item.kind, id: item.id || '', src: item.src || '', filename: item.filename, reason: item.reason || '' }));
    // 外链 png 已由 markdown 展示，不重复；wiki 链接不是文件；同一 fileId 去重
    const ids = files
      .filter(item => item.kind === 'ossPreview')
      .map(item => item.id)
      .sort();
    assert.deepEqual(ids, ['doc99', 'rep1']);
    const srcs = files.filter(item => item.kind === 'filePreview').map(item => item.src);
    assert.deepEqual(srcs, ['https://cdn.example.com/data.xlsx']);
    const invalids = files.filter(item => item.kind === 'invalid');
    assert.equal(invalids.length, 2);
    assert.ok(!files.some(item => item.src === 'https://cdn.example.com/ui.png'));
    assert.ok(!files.some(item => (item.src || '') === 'https://wiki.example.com/req'));
    void kinds;
  });

  test('台账证据：file 与可预览文件 URL 走弹窗，业务引用保持非预览', () => {
    const fileRef = classifyEvidencePreview('file:ev1?filename=凭证.pdf');
    assert.equal(fileRef.kind, 'ossPreview');
    assert.equal(fileRef.presentation, PREVIEW_PRESENTATION.MODAL);
    assert.equal(fileRef.id, 'ev1');
    const objFile = classifyEvidencePreview({ type: 'file', ref: 'ev2' });
    assert.equal(objFile.kind, 'ossPreview');
    assert.equal(objFile.id, 'ev2');
    const pdfUrl = classifyEvidencePreview('https://cdn.example.com/proof.pdf');
    assert.equal(pdfUrl.kind, 'filePreview');
    assert.equal(pdfUrl.presentation, PREVIEW_PRESENTATION.MODAL);
    const page = classifyEvidencePreview('https://jira.example.com/browse/D-1');
    assert.equal(page.kind, 'link');
    assert.equal(page.presentation, PREVIEW_PRESENTATION.LINK);
    const experience = classifyEvidencePreview('experience:exp-1');
    assert.equal(experience.kind, 'ref');
    assert.equal(experience.presentation, PREVIEW_PRESENTATION.LINK);
    const bad = classifyEvidencePreview({ type: 'url', ref: 'javascript:alert(1)' });
    assert.equal(bad.kind, 'invalid');
    assert.equal(parseFlowRef('https://example.com/a').type, 'url');
  });
});
