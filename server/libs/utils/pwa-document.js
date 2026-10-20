const { resolveEntry, applyPwaHtml } = require('@kne/pwa-document');

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

const applyPwaDocument = (html, entry) => {
  if (!entry || entry.path === '/') {
    return html;
  }
  return applyPwaHtml(html, entry);
};

const resolveDocumentEntry = (urlPath, apps) => resolveEntry(urlPath, apps, HOST_OPTIONS);

module.exports = {
  SHELL_ENTRIES,
  HOST_OPTIONS,
  resolveDocumentEntry,
  applyPwaDocument
};
