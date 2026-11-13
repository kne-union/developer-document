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
