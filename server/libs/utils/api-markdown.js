const TurndownService = require('turndown');
const { tables } = require('turndown-plugin-gfm');

const PREAMBLE_SECTION_NAME = '概述';

let turndownService = null;

const getTurndown = () => {
  if (turndownService) {
    return turndownService;
  }
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  });
  service.use(tables);
  // 产物只给模型阅读，不再被 markdown 解析器消费；关掉转义可省掉大量 \- \_ \* 噪音
  service.escape = value => value;
  turndownService = service;
  return service;
};

const stripHtml = html =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const htmlToMarkdown = html => {
  const raw = String(html || '').trim();
  if (!raw) {
    return '';
  }
  try {
    return getTurndown().turndown(raw).trim();
  } catch (e) {
    return stripHtml(raw);
  }
};

const topHeadingLevel = html => {
  const levels = [...String(html || '').matchAll(/<h([1-6])[\s>]/gi)].map(match => Number(match[1]));
  return levels.length ? Math.min(...levels) : 0;
};

/**
 * 按 api HTML 中最浅一级标题切成可寻址子节。
 * 组件之间标题层级不统一（有 h2 起、有 h4 起），固定切 h4 会把 h5 属性表拆散。
 */
const splitApiSections = apiHtml => {
  const raw = String(apiHtml || '').trim();
  if (!raw) {
    return [];
  }

  const level = topHeadingLevel(raw);
  if (!level) {
    return [{ name: PREAMBLE_SECTION_NAME, md: htmlToMarkdown(raw) }].filter(section => section.md);
  }

  const headingRe = new RegExp(`^<h${level}[^>]*>([\\s\\S]*?)</h${level}>`, 'i');
  const chunks = raw
    .split(new RegExp(`(?=<h${level}[\\s>])`, 'i'))
    .map(chunk => chunk.trim())
    .filter(Boolean);

  return chunks
    .map(chunk => {
      const matched = chunk.match(headingRe);
      const name = matched ? stripHtml(matched[1]) : PREAMBLE_SECTION_NAME;
      return { name: name || PREAMBLE_SECTION_NAME, md: htmlToMarkdown(chunk) };
    })
    .filter(section => section.md);
};

const apiSectionsOf = component => {
  if (!component) {
    return [];
  }
  if (Array.isArray(component.apiSections) && component.apiSections.length) {
    return component.apiSections;
  }
  return splitApiSections(component.api);
};

const apiMarkdownOf = component =>
  apiSectionsOf(component)
    .map(section => section.md)
    .filter(Boolean)
    .join('\n\n');

/**
 * 给 buildCatalogFromReadme 的产物补 apiSections（保留原始 api HTML 供管理端使用）
 */
const withApiSections = (components = {}) => {
  const next = {};
  Object.entries(components).forEach(([name, component]) => {
    if (!component) {
      return;
    }
    next[name] = { ...component, apiSections: splitApiSections(component.api) };
  });
  return next;
};

module.exports = {
  PREAMBLE_SECTION_NAME,
  stripHtml,
  htmlToMarkdown,
  splitApiSections,
  apiSectionsOf,
  apiMarkdownOf,
  withApiSections
};
