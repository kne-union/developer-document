const DEFAULT_MAX_CHARS = 12000;
const MIN_BLOCK_CHARS = 200;

// 每类单块上限：示例是写代码时最有用的，给最多；概述与后台文档只需要一眼
const KIND_CAPS = {
  experience: 900,
  summary: 1200,
  api: 3000,
  example: 3500,
  document: 700
};

const KIND_LABELS = {
  experience: '经验',
  summary: '概述',
  api: 'api',
  example: 'example',
  document: '后台文档'
};

const GROUP_LABELS = {
  experience: '经验',
  document: '后台文档'
};

const groupOf = hit => {
  if (hit.kind === 'experience' || hit.kind === 'document') {
    return GROUP_LABELS[hit.kind];
  }
  return `${hit.docId}@${hit.version}`;
};

const headingOf = hit => {
  if (hit.kind === 'experience') {
    return `经验 · ${hit.title}`;
  }
  if (hit.kind === 'document') {
    return `后台文档 · ${hit.title}`;
  }
  if (hit.kind === 'api') {
    return hit.title ? `${hit.name} · api / ${hit.title}` : `${hit.name} · api`;
  }
  if (hit.kind === 'example') {
    return `${hit.name} · example "${hit.title}"`;
  }
  return `${hit.name} · 概述`;
};

const formatChars = value => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

const omittedLine = hit => {
  const label = KIND_LABELS[hit.kind] || hit.kind;
  const title = hit.title || hit.name || '';
  const total = (hit.content || '').length;
  return `- ${hit.ref} — ${label}${title ? ` "${title}"` : ''} (${total} chars)`;
};

/**
 * 预算内渲染：命中按序铺，装不下的进「未包含」清单并注明字节数，
 * 让调用方能判断要不要按 ref 再取，而不是猜。
 */
const renderSearchMarkdown = ({ query, hits = [], maxChars = DEFAULT_MAX_CHARS, mode = 'answer', total = 0 }) => {
  if (!hits.length) {
    return `# search: ${query || ''}\n\n无命中。可换更短的关键词（组件名 / 包名），或用 \`docId\` 限定文档后重试。`;
  }

  if (mode === 'locate') {
    const lines = hits.map(hit => `- ${hit.ref} — ${KIND_LABELS[hit.kind] || hit.kind}${hit.title ? ` "${hit.title}"` : ''} (${(hit.content || '').length} chars)`);
    return [`# locate: ${query || ''}   (${hits.length} hits，用 fetch_docs 按 ref 取正文)`, '', ...lines].join('\n');
  }

  const lines = [];
  const omitted = [];
  let used = 0;
  let currentGroup = null;

  // 「未包含」清单也要占预算，否则实际输出会明显超出调用方给的上限
  const footerReserve = Math.min(Math.round(maxChars * 0.2), 2400);
  const contentBudget = Math.max(maxChars - footerReserve, MIN_BLOCK_CHARS);

  hits.forEach(hit => {
    const content = String(hit.content || '').trim();
    if (!content) {
      return;
    }
    const heading = headingOf(hit);
    const overhead = heading.length + hit.ref.length + 40;
    const remaining = contentBudget - used;

    if (hit.overflow || remaining < MIN_BLOCK_CHARS + overhead) {
      omitted.push(hit);
      return;
    }

    const cap = Math.min(KIND_CAPS[hit.kind] || 2000, remaining - overhead);
    const truncated = content.length > cap;
    const body = truncated ? content.slice(0, cap) : content;

    const group = groupOf(hit);
    if (group !== currentGroup) {
      lines.push(`## ${group}`);
      currentGroup = group;
    }

    lines.push(`### ${heading}${truncated ? ` (truncated ${body.length}/${content.length} chars)` : ''}`);
    lines.push(`ref: ${hit.ref}`);
    lines.push(body);
    lines.push('');
    used += body.length + overhead;
  });

  const rest = Math.max(total - hits.length, 0);
  if (omitted.length || rest) {
    lines.push('## 未包含（需要时用 fetch_docs 按 ref 取）');
    omitted.forEach(hit => lines.push(omittedLine(hit)));
    if (rest) {
      lines.push(`- 另有 ${rest} 段未列出，可缩小关键词或用 docId 限定后重搜`);
    }
    lines.push('');
  }

  const body = lines.join('\n').trim();
  const shown = hits.length - omitted.length;
  const header = `# search: ${query || ''}   (${formatChars(body.length)} chars, 预算 ${formatChars(maxChars)}, ${shown} shown, ${omitted.length + rest} omitted)`;
  return `${header}\n\n${body}`;
};

/**
 * 按 ref 深读：内容按字符窗口翻页，超出部分给出 nextOffset
 */
const renderFetchMarkdown = ({ items = [] }) => {
  if (!items.length) {
    return '无有效 ref。ref 形如 `doc-index:{docId}@{version}#/{Name}/api/{子节}`。';
  }

  const lines = [];
  items.forEach(item => {
    if (item.error) {
      lines.push(`## ${item.ref}`);
      lines.push(`未找到：${item.error}`);
      lines.push('');
      return;
    }

    const content = String(item.content || '');
    const offset = item.offset || 0;
    const limit = item.limit;
    const body = typeof limit === 'number' ? content.slice(offset, offset + limit) : content.slice(offset);
    const end = offset + body.length;
    const more = end < content.length;

    lines.push(`## ${item.heading || item.ref}`);
    lines.push(`ref: ${item.ref}`);
    if (offset || more) {
      lines.push(`范围 ${offset}-${end} / ${content.length} chars${more ? `，继续取请传 offset=${end}` : ''}`);
    }
    lines.push('');
    lines.push(body);
    lines.push('');
  });

  return lines.join('\n').trim();
};

module.exports = {
  DEFAULT_MAX_CHARS,
  KIND_CAPS,
  renderSearchMarkdown,
  renderFetchMarkdown
};
