const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('页内文件预览容器：横向滚动、不撑出页面、不抢纵向滚动', () => {
  const scss = fs.readFileSync(path.join(__dirname, 'style.module.scss'), 'utf8');
  const preview = fs.readFileSync(path.join(__dirname, 'TabDetail/FileAttachmentPreview.js'), 'utf8');

  const blockOf = name => {
    const re = new RegExp('^\\.' + name + '\\s*\\{', 'm');
    const start = scss.search(re);
    assert.ok(start >= 0, name + ' missing');
    // naive brace match
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

  test('共享 FileAttachmentPreview 把核心预览放进 previewStage，缩略图走独立 shot 容器', () => {
    assert.match(preview, /styles\.inPagePreview/);
    assert.match(preview, /styles\.previewStage/);
    assert.match(preview, /<FilePreview /);
    const views = fs.readFileSync(path.join(__dirname, 'TabDetail/TestExecutionViews.js'), 'utf8');
    assert.match(views, /styles\.shotThumbPreview/);
  });

  test('previewStage：overflow-x auto、max-width 100%、min-width 0；无 max-height 内嵌纵滚', () => {
    const block = blockOf('previewStage');
    assert.match(block, /overflow-x:\s*auto/);
    assert.match(block, /max-width:\s*100%/);
    assert.match(block, /min-width:\s*0/);
    assert.doesNotMatch(block, /max-height:/);
  });

  test('previewStage 有适当内边距且 box-sizing:border-box，避免 padding 造成溢出', () => {
    const block = blockOf('previewStage');
    assert.match(block, /box-sizing:\s*border-box/);
    assert.match(block, /padding:\s*16px/);
    assert.match(block, /width:\s*100%/);
    const mobile = scss.match(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.previewStage\s*\{([\s\S]*?)\}/);
    assert.ok(mobile, 'mobile previewStage missing');
    assert.match(mobile[1], /padding:\s*10px/);
  });

  test('previewStage 衬底用已有白色 token #fff，与文件内容一致；需求说明浅底仍是 #f8f9fb', () => {
    const block = blockOf('previewStage');
    assert.match(block, /background:\s*#fff;/);
    assert.doesNotMatch(block, /#f8f9fb/);
    const descriptionBody = blockOf('descriptionBody');
    const cardBody = blockOf('cardBody');
    assert.match(descriptionBody, /background:\s*#f8f9fb/);
    assert.match(cardBody, /background:\s*#f8f9fb/);
  });

  test('祖先链 inPagePreview / cardBody / deliverableCard / markdownBody 都有 min-width:0 与宽度上限', () => {
    for (const name of ['inPagePreview', 'cardBody', 'deliverableCard', 'markdownBody', 'descriptionCard']) {
      const block = blockOf(name);
      assert.match(block, /min-width:\s*0/, name + ' min-width');
      assert.match(block, /max-width:\s*(100%|min\()/, name + ' max-width');
    }
  });

  test('不用整页 overflow:hidden 掩盖溢出', () => {
    assert.doesNotMatch(scss, /html\s*\{[^}]*overflow:\s*hidden/);
    assert.doesNotMatch(scss, /body\s*\{[^}]*overflow:\s*hidden/);
  });
});


describe('文件预览弹窗：内容留白与贴边轨道分层，不改全局 Modal、不撤页内留白', () => {
  const root = __dirname;
  const scss = fs.readFileSync(path.join(root, 'style.module.scss'), 'utf8');
  const preview = fs.readFileSync(path.join(root, 'TabDetail/FileAttachmentPreview.js'), 'utf8');
  const views = fs.readFileSync(path.join(root, 'TabDetail/TestExecutionViews.js'), 'utf8');
  const indexScss = fs.readFileSync(path.join(root, '../../index.scss'), 'utf8');

  test('宿主 FileButton 用官方 noPadding，两条入口都传入同一份 modalProps', () => {
    assert.match(preview, /export const FILE_PREVIEW_MODAL_PROPS = \{ noPadding: true \}/);
    assert.match(preview, /<FileButton[\s\S]*?modalProps=\{FILE_PREVIEW_MODAL_PROPS\}/);
    assert.match(views, /<FileButton[\s\S]*?modalProps=\{FILE_PREVIEW_MODAL_PROPS\}/);
    assert.match(views, /FILE_PREVIEW_MODAL_PROPS/);
  });

  test('弹窗入口不套 previewStage，页内预览才使用其内边距', () => {
    const modalStart = preview.indexOf('PREVIEW_PRESENTATION.MODAL && FileButton');
    const inlineStart = preview.indexOf('styles.inPagePreview');
    assert.ok(modalStart >= 0 && inlineStart > modalStart);
    const modalBranch = preview.slice(modalStart, inlineStart);
    assert.match(modalBranch, /styles\.modalPreviewEntry/);
    assert.match(modalBranch, /FILE_PREVIEW_MODAL_PROPS/);
    assert.doesNotMatch(modalBranch, /previewStage/);
    assert.match(preview.slice(inlineStart), /styles\.previewStage/);
  });

  test('页内 previewStage 留白与横向 auto 仍在，不因弹窗贴边被拿掉', () => {
    const re = new RegExp('^\\.previewStage\\s*\\{', 'm');
    const start = scss.search(re);
    assert.ok(start >= 0);
    let i = scss.indexOf('{', start);
    let depth = 0;
    let block = '';
    for (let k = i; k < scss.length; k++) {
      if (scss[k] === '{') depth++;
      else if (scss[k] === '}') {
        depth--;
        if (depth === 0) {
          block = scss.slice(start, k + 1);
          break;
        }
      }
    }
    assert.match(block, /padding:\s*16px/);
    assert.match(block, /overflow-x:\s*auto/);
    assert.match(block, /box-sizing:\s*border-box/);
    assert.doesNotMatch(block, /max-height:/);
    const mobile = scss.match(/@media \(max-width:\s*640px\)\s*\{[\s\S]*?\.previewStage\s*\{([\s\S]*?)\}/);
    assert.ok(mobile);
    assert.match(mobile[1], /padding:\s*10px/);
  });

  test('范围：不给全局 Modal / SimpleBar / ant-modal-body 加外层 padding 或额外纵滚容器', () => {
    assert.doesNotMatch(scss, /:global\(\.ant-modal-body\)[^}]*padding:/);
    assert.doesNotMatch(scss, /:global\(\.modal-body\)[^}]*padding:/);
    assert.doesNotMatch(scss, /:global\(\.simplebar[^)]*\)[^}]*padding:/);
    assert.doesNotMatch(scss, /\.ant-modal-body[^}]*padding:/);
    const modalWrap = indexScss.match(/\.ant-modal-wrap[\s\S]*?\{[\s\S]*?\}/);
    // 全局只处理 z-index，不加 padding / overflow
    assert.match(indexScss, /\.ant-modal-wrap,\s*\n\.ant-modal-mask \{\s*\n\s*z-index:\s*1000 !important;/);
    assert.doesNotMatch(indexScss, /\.ant-modal-body/);
    const propsMatch = preview.match(/export const FILE_PREVIEW_MODAL_PROPS = (\{[^}]+\})/);
    assert.ok(propsMatch);
    assert.equal(propsMatch[1].replace(/\s+/g, ''), '{noPadding:true}');
    assert.doesNotMatch(propsMatch[1], /padding|overflow|max-height|styles/);
  });
});
