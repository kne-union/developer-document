const { htmlToMarkdown, apiSectionsOf, PREAMBLE_SECTION_NAME } = require('./api-markdown');
const { formatDocIndexRef } = require('./doc-ref');

const KIND_BONUS = { example: 50, api: 30, summary: 10 };

const parseTokenQuery = query => {
  if (!query) {
    return null;
  }
  const match = String(query)
    .trim()
    .match(/^([^:\s]+):([A-Za-z][\w.]*)$/);
  return match ? { docId: match[1], componentName: match[2] } : null;
};

const buildTerms = query => {
  const raw = String(query || '').trim();
  if (!raw) {
    return [];
  }
  const terms = new Set();
  const token = parseTokenQuery(raw);
  if (token?.componentName) {
    terms.add(token.componentName.toLowerCase());
  }
  terms.add(raw.toLowerCase());
  raw
    .toLowerCase()
    .split(/[\s,，、/]+/)
    .forEach(part => {
      if (part.length >= 2) {
        terms.add(part);
      }
    });
  return [...terms];
};

const includesAny = (text, terms) => {
  if (!text || !terms.length) {
    return false;
  }
  const lower = String(text).toLowerCase();
  return terms.some(term => lower.includes(term));
};

// 文档里组件名常写成 table-page，而查询多半写 TablePage，比较前统一去掉连字符等分隔
const normalizeName = value =>
  String(value || '')
    .toLowerCase()
    .replace(/[-_.\s]/g, '');

const equalsAny = (text, terms) => {
  const normalized = normalizeName(text);
  return Boolean(normalized) && terms.some(term => normalizeName(term) === normalized);
};

const exampleContent = example => {
  const parts = [];
  if (example.description) {
    parts.push(String(example.description).trim());
  }
  if (example.code) {
    parts.push(['```jsx', String(example.code).trim(), '```'].join('\n'));
  }
  return parts.join('\n\n');
};

/**
 * 把一个组件摊平成可寻址、可独立取用的段
 */
const componentSections = ({ component, id, docId, version, source }) => {
  const sections = [];
  const base = { id, docId, version, source, name: component.name, token: component.token };

  const summary = htmlToMarkdown(component.summary);
  if (summary) {
    sections.push({
      ...base,
      kind: 'summary',
      title: '',
      content: summary,
      ref: formatDocIndexRef({ docId, version, name: component.name })
    });
  }

  const apiSections = apiSectionsOf(component);
  const single = apiSections.length === 1;
  apiSections.forEach(section => {
    sections.push({
      ...base,
      kind: 'api',
      title: section.name === PREAMBLE_SECTION_NAME ? '' : section.name,
      content: section.md,
      ref: formatDocIndexRef({
        docId,
        version,
        name: component.name,
        kind: 'api',
        sub: single ? null : section.name
      })
    });
  });

  (component.examples || []).forEach(example => {
    const content = exampleContent(example);
    if (!content) {
      return;
    }
    sections.push({
      ...base,
      kind: 'example',
      title: example.title || `示例${example.id}`,
      description: example.description || '',
      content,
      ref: formatDocIndexRef({ docId, version, name: component.name, kind: 'examples', sub: example.id })
    });
  });

  return sections;
};

const scoreComponent = (component, terms) => {
  if (!terms.length) {
    return 0;
  }
  const name = String(component.name || '').toLowerCase();
  const token = String(component.token || '').toLowerCase();
  let best = 0;
  if (equalsAny(token, terms)) {
    best = 1000;
  }
  if (equalsAny(name, terms)) {
    best = Math.max(best, 900);
  } else if (name && terms.some(term => name.includes(term) || normalizeName(name).includes(normalizeName(term)))) {
    best = Math.max(best, 700);
  }
  return best;
};

const scoreSection = (section, terms) => {
  if (!terms.length) {
    return 0;
  }
  if (section.kind === 'example') {
    return (equalsAny(section.title, terms) ? 650 : includesAny(section.title, terms) ? 600 : 0) + (includesAny(section.description, terms) ? 500 : 0) + (includesAny(section.content, terms) ? 200 : 0);
  }
  if (section.kind === 'api') {
    return (equalsAny(section.title, terms) ? 600 : includesAny(section.title, terms) ? 350 : 0) + (includesAny(section.content, terms) ? 300 : 0);
  }
  return includesAny(section.content, terms) ? 400 : 0;
};

const rowSections = row => {
  const components = row.componentsData || {};
  const sections = [];
  Object.values(components).forEach(component => {
    if (!component?.name) {
      return;
    }
    sections.push(
      ...componentSections({
        component,
        id: row.id,
        docId: row.docId,
        version: row.version,
        source: row.source
      })
    );
  });
  return sections;
};

/**
 * 跨行按段打分排序。命中的判定是「组件命中」或「段自身命中」，
 * 组件分负责把同一组件的段聚到一起，段分负责决定先给示例还是先给 API。
 */
const rankSections = ({ rows, query }) => {
  const terms = buildTerms(query);
  const scored = [];

  rows.forEach(row => {
    const components = row.componentsData || {};
    Object.values(components).forEach(component => {
      if (!component?.name) {
        return;
      }
      const componentScore = scoreComponent(component, terms);
      componentSections({
        component,
        id: row.id,
        docId: row.docId,
        version: row.version,
        source: row.source
      }).forEach(section => {
        const sectionScore = scoreSection(section, terms);
        if (terms.length && !componentScore && !sectionScore) {
          return;
        }
        scored.push({ ...section, score: componentScore + sectionScore + (KIND_BONUS[section.kind] || 0) });
      });
    });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
};

/**
 * token 精确命中时不做打分，按 概述 → API 子节 → 示例 的自然顺序给目录式结果
 */
const orderedComponentSections = ({ rows, componentName }) => {
  const target = String(componentName || '').toLowerCase();
  for (const row of rows) {
    const components = row.componentsData || {};
    const matched = Object.values(components).find(component => String(component?.name || '').toLowerCase() === target);
    if (matched) {
      return componentSections({
        component: matched,
        id: row.id,
        docId: row.docId,
        version: row.version,
        source: row.source
      }).map((section, i) => ({ ...section, score: 10000 - i }));
    }
  }
  return null;
};

module.exports = {
  parseTokenQuery,
  buildTerms,
  componentSections,
  rowSections,
  rankSections,
  orderedComponentSections
};
