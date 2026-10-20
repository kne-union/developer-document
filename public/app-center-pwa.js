/**
 * 按已发布应用切换 PWA 的 manifest、图标与标题。
 * 以普通 script 在页面解析阶段引入时，读取 window.__APP_CENTER_PWA__ 自动安装（Safari 只在解析 HTML 时读取 manifest）。
 * 以 CommonJS 引入时只导出方法，不会自动安装，Node 端用同一份规则改写 HTML、生成 manifest。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.AppCenterPwa = api;
    api.installPwaDocument(root.__APP_CENTER_PWA__);
  }
})(typeof window !== 'undefined' ? window : this, function () {
  var state = {
    host: null,
    apps: null,
    hooked: false
  };

  var normalizePath = function (value) {
    var path = String(value || '/')
      .split('?')[0]
      .split('#')[0];
    if (path.length > 1 && path.charAt(path.length - 1) === '/') {
      path = path.slice(0, -1);
    }
    return path || '/';
  };

  var withPublicUrl = function (value, publicUrl) {
    if (!value || /^https?:\/\//.test(value) || /^data:/.test(value)) {
      return value;
    }
    var base = String(publicUrl || '').replace(/\/+$/, '');
    if (!base || value.indexOf(base + '/') === 0) {
      return value;
    }
    return base + (value.charAt(0) === '/' ? value : '/' + value);
  };

  var iconUrlFor = function (icon, options) {
    if (!icon) {
      return '';
    }
    if (/^https?:\/\//.test(icon) || icon.charAt(0) === '/') {
      return icon;
    }
    var prefix = (options && options.staticPrefix) || '/api/v1/static/file-id';
    return prefix.replace(/\/+$/, '') + '/' + icon;
  };

  var manifestUrlFor = function (app, path, options) {
    var prefix = (options && options.manifestPrefix) || '/api/v1/app-manager';
    var params = ['name=' + encodeURIComponent(app.name)];
    if (path && normalizePath(path) !== normalizePath(app.pathUrl)) {
      params.push('path=' + encodeURIComponent(path));
    }
    return prefix.replace(/\/+$/, '') + '/app/center/webmanifest?' + params.join('&');
  };

  var appSurfaces = function (app) {
    var surfaces = [{ path: app.pathUrl, title: app.label || app.name }];
    (app.entries || []).forEach(function (entry) {
      if (entry && entry.url) {
        surfaces.push({ path: entry.url, title: entry.label || app.label || app.name });
      }
    });
    return surfaces;
  };

  var entriesFromApps = function (apps, options) {
    var entries = [];
    (apps || []).forEach(function (app) {
      if (!app || !app.name || !app.pathUrl) {
        return;
      }
      var icon = iconUrlFor(app.icon, options) || (options && options.defaultIcon) || '';
      appSurfaces(app).forEach(function (surface) {
        entries.push({
          path: surface.path,
          title: surface.title,
          icon: icon,
          manifest: manifestUrlFor(app, surface.path, options),
          appName: app.name
        });
      });
    });
    return entries;
  };

  var matchPwaEntry = function (pathname, entries) {
    var current = normalizePath(pathname);
    var specific = (entries || []).filter(function (entry) {
      return entry && normalizePath(entry.path) !== '/';
    });
    specific.sort(function (a, b) {
      return normalizePath(b.path).length - normalizePath(a.path).length;
    });
    for (var i = 0; i < specific.length; i += 1) {
      var entryPath = normalizePath(specific[i].path);
      if (current === entryPath || current.indexOf(entryPath + '/') === 0) {
        return specific[i];
      }
    }
    for (var j = 0; j < (entries || []).length; j += 1) {
      if (entries[j] && normalizePath(entries[j].path) === '/') {
        return entries[j];
      }
    }
    return null;
  };

  var resolveEntry = function (pathname, apps, options) {
    var published = entriesFromApps(apps, options);
    var shell = (options && options.shellEntries) || [];
    return matchPwaEntry(pathname, published.concat(shell));
  };

  var headTagsFor = function (entry, publicUrl) {
    var icon = withPublicUrl(entry.icon, publicUrl);
    var manifest = withPublicUrl(entry.manifest, publicUrl);
    var title = entry.title || '';
    return (
      (icon ? '<link id="pwa-apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="' + icon + '">' : '') +
      (title ? '<meta id="pwa-apple-title" name="apple-mobile-web-app-title" content="' + title + '">' : '') +
      (manifest ? '<link id="pwa-manifest" rel="manifest" href="' + manifest + '">' : '')
    );
  };

  var setAttr = function (id, name, value) {
    if (typeof document === 'undefined' || !value) {
      return;
    }
    var el = document.getElementById(id);
    if (el && el.getAttribute(name) !== value) {
      el.setAttribute(name, value);
    }
  };

  var applyPwaEntry = function (entry, options) {
    if (!entry || typeof document === 'undefined') {
      return entry;
    }
    var publicUrl = (options && options.publicUrl) || '';
    var icon = withPublicUrl(entry.icon, publicUrl);
    var manifest = withPublicUrl(entry.manifest, publicUrl);
    if (typeof window !== 'undefined') {
      window.__PWA_ACTIVE__ = { title: entry.title || '', icon: icon || '', manifest: manifest || '' };
    }
    if (entry.title) {
      document.title = entry.title;
    }
    if (document.readyState === 'loading' && !document.getElementById('pwa-manifest')) {
      document.write(headTagsFor(entry, publicUrl));
      return entry;
    }
    setAttr('pwa-manifest', 'href', manifest);
    setAttr('pwa-apple-touch-icon', 'href', icon);
    setAttr('pwa-apple-title', 'content', entry.title || '');
    return entry;
  };

  var parseApps = function (text) {
    try {
      var body = JSON.parse(text || '{}');
      return (body.data && body.data.pageData) || body.pageData || [];
    } catch (error) {
      return [];
    }
  };

  var fetchApps = function (options) {
    if (typeof XMLHttpRequest === 'undefined' || !options || !options.apiUrl) {
      return [];
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', options.apiUrl, false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return parseApps(xhr.responseText);
      }
    } catch (error) {}
    return [];
  };

  var currentPath = function () {
    if (typeof window === 'undefined') {
      return '/';
    }
    return window.location.pathname;
  };

  var applyCurrent = function () {
    var options = state.host || {};
    var apps = state.apps || [];
    return applyPwaEntry(resolveEntry(currentPath(), apps, options), options);
  };

  var installPwaDocument = function (options) {
    state.host = Object.assign({}, state.host, options || {});
    if (options && Object.prototype.hasOwnProperty.call(options, 'apps')) {
      state.apps = options.apps || [];
    } else if (!state.apps) {
      state.apps = fetchApps(state.host);
    }
    var entry = applyCurrent();
    if (!state.hooked && typeof window !== 'undefined' && window.history) {
      state.hooked = true;
      ['pushState', 'replaceState'].forEach(function (method) {
        var original = window.history[method];
        if (!original) {
          return;
        }
        window.history[method] = function () {
          var result = original.apply(this, arguments);
          applyCurrent();
          return result;
        };
      });
      window.addEventListener('popstate', applyCurrent);
    }
    return entry;
  };

  var syncPwaDocument = function (apps, options) {
    return installPwaDocument(Object.assign({}, options, { apps: apps || [] }));
  };

  var buildWebManifest = function (app, options) {
    options = options || {};
    var scope = app.pathUrl || '/';
    var startPath = options.path || scope;
    var title = options.title || app.label || app.name;
    var icon = options.icon || '';
    var manifest = {
      id: startPath,
      name: title,
      short_name: title,
      description: app.description || '',
      lang: 'zh-CN',
      start_url: startPath,
      scope: scope,
      display: 'standalone',
      theme_color: options.themeColor || '#0080FF',
      background_color: options.backgroundColor || '#f6f7f9',
      icons: []
    };
    if (icon) {
      manifest.icons = [
        { src: icon, sizes: '192x192', type: 'image/png' },
        { src: icon, sizes: '512x512', type: 'image/png' }
      ];
    }
    return manifest;
  };

  var SCRIPT_RE = /(<script\b[^>]*>[\s\S]*?<\/script>)/gi;

  var isScript = function (part) {
    return /^<script\b/i.test(part);
  };

  var replaceAttr = function (attrs, attr, value) {
    var attrRe = new RegExp('\\s' + attr + '="[^"]*"');
    if (attrRe.test(attrs)) {
      return attrs.replace(attrRe, ' ' + attr + '="' + value + '"');
    }
    return attrs + ' ' + attr + '="' + value + '"';
  };

  var replaceTagById = function (html, id, attr, value) {
    return html.replace(new RegExp('<([a-zA-Z0-9:-]+)([^>]*\\bid="' + id + '"[^>]*)>', 'g'), function (full, name, attrs) {
      return '<' + name + replaceAttr(attrs, attr, value) + '>';
    });
  };

  var hasTagId = function (html, id) {
    return new RegExp('<[a-zA-Z0-9:-]+[^>]*\\bid="' + id + '"[^>]*>').test(html);
  };

  var rewriteTags = function (html, entry) {
    var next = html;
    if (entry.manifest && hasTagId(next, 'pwa-manifest')) {
      next = replaceTagById(next, 'pwa-manifest', 'href', entry.manifest);
    }
    if (entry.icon && hasTagId(next, 'pwa-apple-touch-icon')) {
      next = replaceTagById(next, 'pwa-apple-touch-icon', 'href', entry.icon);
    }
    if (entry.title) {
      next = replaceTagById(next, 'pwa-apple-title', 'content', entry.title);
    }
    return next;
  };

  /**
   * 服务端返回 HTML 前写好 manifest / 图标 / 标题。
   * 只改 script 之外的标签，不改脚本正文。
   */
  var applyPwaHtml = function (html, entry, options) {
    if (!entry) {
      return html;
    }
    var rewritten = String(html)
      .split(SCRIPT_RE)
      .map(function (part) {
        return isScript(part) ? part : rewriteTags(part, entry);
      })
      .join('');
    var outside = rewritten
      .split(SCRIPT_RE)
      .filter(function (part) {
        return !isScript(part);
      })
      .join('');
    if (hasTagId(outside, 'pwa-manifest')) {
      return rewritten;
    }
    var tags = headTagsFor(entry, options && options.publicUrl);
    if (/<meta\s+charset=/i.test(rewritten)) {
      return rewritten.replace(/(<meta\s+charset="[^"]*"\s*\/?>)/i, '$1' + tags);
    }
    return rewritten.replace(/<head([^>]*)>/i, '<head$1>' + tags);
  };

  return {
    normalizePath: normalizePath,
    appSurfaces: appSurfaces,
    entriesFromApps: entriesFromApps,
    matchPwaEntry: matchPwaEntry,
    resolveEntry: resolveEntry,
    applyPwaEntry: applyPwaEntry,
    applyPwaHtml: applyPwaHtml,
    installPwaDocument: installPwaDocument,
    syncPwaDocument: syncPwaDocument,
    buildWebManifest: buildWebManifest,
    iconUrlFor: iconUrlFor
  };
});
