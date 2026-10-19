const APPS_PATH = /^\/apps(\/|$)/;

const isAppsPath = urlPath => APPS_PATH.test(urlPath || '');

const withFileName = (href, fileName) => {
  const slash = href.lastIndexOf('/');
  return `${slash >= 0 ? href.slice(0, slash + 1) : ''}${fileName}`;
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

const rewriteDocumentTags = html => {
  const manifestHref = hrefById(html, 'pwa-manifest');
  const iconHref = hrefById(html, 'pwa-apple-touch-icon');
  let next = html;
  if (manifestHref) {
    next = replaceTagById(next, 'pwa-manifest', 'href', withFileName(manifestHref, 'manifest-apps.json'));
  }
  if (iconHref) {
    next = replaceTagById(next, 'pwa-apple-touch-icon', 'href', withFileName(iconHref, 'apps-apple-touch-icon.png'));
  }
  next = replaceTagById(next, 'pwa-apple-title', 'content', '应用中心');
  return next;
};

const APPS_HEAD_TAGS =
  '<link id="pwa-apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="/pwa/apps-apple-touch-icon.png">' +
  '<meta id="pwa-apple-title" name="apple-mobile-web-app-title" content="应用中心">' +
  '<link id="pwa-manifest" rel="manifest" href="/manifest-apps.json">';

const outsideScripts = html =>
  html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi)
    .filter(part => !/^<script\b/i.test(part))
    .join('');

/**
 * /apps 的文档响应在解析前就带上应用中心的 manifest 与图标。
 * 不改 script 正文，避免把按路径切换的脚本改坏。
 */
const applyAppsPwaDocument = html => {
  const rewritten = html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi)
    .map(part => (/^<script\b/i.test(part) ? part : rewriteDocumentTags(part)))
    .join('');
  if (hrefById(outsideScripts(rewritten), 'pwa-manifest')) {
    return rewritten;
  }
  if (/<meta\s+charset=/i.test(rewritten)) {
    return rewritten.replace(/(<meta\s+charset="[^"]*"\s*\/?>)/i, `$1${APPS_HEAD_TAGS}`);
  }
  return rewritten.replace(/<head([^>]*)>/i, `<head$1>${APPS_HEAD_TAGS}`);
};

module.exports = {
  isAppsPath,
  applyAppsPwaDocument
};
