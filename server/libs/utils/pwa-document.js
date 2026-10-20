const { resolveEntry, iconUrlFor } = require('../../../src/components/AppCenter/pwaDocument');

const SHELL_ENTRIES = [
  { path: '/apps', manifest: '/manifest-apps.json', icon: '/pwa/apps-apple-touch-icon.png', title: '应用中心' },
  { path: '/', manifest: '/manifest.json', icon: '/pwa/home-apple-touch-icon.png', title: '开发者文档' }
];

const HOST_OPTIONS = {
  manifestPrefix: '/api/v1/app-manager',
  staticPrefix: '/api/v1/static/file-id',
  defaultIcon: '/pwa/apps-apple-touch-icon.png',
  shellEntries: SHELL_ENTRIES
};

const replaceAttr = (attrs, attr, value) => {
  const attrRe = new RegExp(`\\s${attr}="[^"]*"`);
  if (attrRe.test(attrs)) {
    return attrs.replace(attrRe, ` ${attr}="${value}"`);
  }
  return `${attrs} ${attr}="${value}"`;
};

const replaceTagById = (html, id, attr, value) => html.replace(new RegExp(`<([a-zA-Z0-9:-]+)([^>]*\\bid="${id}"[^>]*)>`, 'g'), (full, name, attrs) => `<${name}${replaceAttr(attrs, attr, value)}>`);

const hrefById = (html, id) => {
  const tag = html.match(new RegExp(`<[a-zA-Z0-9:-]+[^>]*\\bid="${id}"[^>]*>`));
  if (!tag) {
    return '';
  }
  const href = tag[0].match(/\shref="([^"]*)"/);
  return href ? href[1] : '';
};

const outsideScripts = html =>
  html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi)
    .filter(part => !/^<script\b/i.test(part))
    .join('');

const headTagsFor = entry => {
  const icon = entry.icon ? `<link id="pwa-apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="${entry.icon}">` : '';
  const title = entry.title ? `<meta id="pwa-apple-title" name="apple-mobile-web-app-title" content="${entry.title}">` : '';
  const manifest = entry.manifest ? `<link id="pwa-manifest" rel="manifest" href="${entry.manifest}">` : '';
  return `${icon}${title}${manifest}`;
};

const rewriteDocumentTags = (html, entry) => {
  let next = html;
  if (entry.manifest && hrefById(html, 'pwa-manifest')) {
    next = replaceTagById(next, 'pwa-manifest', 'href', entry.manifest);
  }
  if (entry.icon && hrefById(html, 'pwa-apple-touch-icon')) {
    next = replaceTagById(next, 'pwa-apple-touch-icon', 'href', entry.icon);
  }
  if (entry.title) {
    next = replaceTagById(next, 'pwa-apple-title', 'content', entry.title);
  }
  return next;
};

/**
 * 按已发布应用改写文档里的 manifest / 图标 / 标题。
 * 不改 script 正文，避免把按路径切换的脚本改坏。
 */
const applyPwaDocument = (html, entry) => {
  if (!entry || entry.path === '/') {
    return html;
  }
  const rewritten = html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi)
    .map(part => (/^<script\b/i.test(part) ? part : rewriteDocumentTags(part, entry)))
    .join('');
  if (hrefById(outsideScripts(rewritten), 'pwa-manifest')) {
    return rewritten;
  }
  const tags = headTagsFor(entry);
  if (/<meta\s+charset=/i.test(rewritten)) {
    return rewritten.replace(/(<meta\s+charset="[^"]*"\s*\/?>)/i, `$1${tags}`);
  }
  return rewritten.replace(/<head([^>]*)>/i, `<head$1>${tags}`);
};

const resolveDocumentEntry = (urlPath, apps) => resolveEntry(urlPath, apps, HOST_OPTIONS);

module.exports = {
  SHELL_ENTRIES,
  HOST_OPTIONS,
  resolveDocumentEntry,
  applyPwaDocument,
  iconUrlFor
};
