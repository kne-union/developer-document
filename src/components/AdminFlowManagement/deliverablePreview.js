/**
 * 流程详情交付物预览分类：纯函数，便于单测。
 *
 * 覆盖范围（不要扩大到任意链接）：
 * - 扩展材料（product_design.options）及同类 jsonb 中 type===file 的附件
 * - 测试阶段 contentType===file 的材料（test_cases / test_report）
 * - 原型 / 设计稿（templateCode===prototype，contentType 通常为 url）
 *
 * 页内预览走 components-core:FilePreview：OSS 附件传 id+filename（走 preset 的 apis.file.getUrl），
 * 可识别的文件 URL 传 src+filename。不在这里拼接签名地址，不直接注入 HTML。
 * 不能内嵌的外链给明确空态 + 可选手动打开，不能把自动跳新页伪称预览。
 */

/** 仅这些模板的 URL 走页内预览；pr_link / staging_env / defect_closure 等仍用外链。 */
const IN_PAGE_URL_PREVIEW_TEMPLATE_CODES = Object.freeze(['prototype']);

/**
 * 与 @kne/react-file builtinTypeFormat 对齐的扩展名。
 * FilePreview 对未知类型会走 UnknownPreview，仍在当前页展示。
 */
const FILE_PREVIEW_EXTENSIONS = Object.freeze({
  txt: 'txt',
  md: 'markdown',
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  bmp: 'image',
  webp: 'image',
  svg: 'image',
  html: 'html',
  htm: 'html',
  doc: 'office',
  docx: 'office',
  xls: 'office',
  xlsx: 'office',
  ppt: 'office',
  pptx: 'office',
  csv: 'office',
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  aac: 'audio',
  mp4: 'video',
  avi: 'video',
  mov: 'video',
  mkv: 'video',
  flv: 'video',
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  tar: 'zip',
  gz: 'zip',
  json: 'json'
});

/**
 * 常见设计工具域名：通常带 X-Frame-Options / 登录墙，不能也不应绕过。
 * 无扩展名的其他 http(s) 地址同样按不支持内嵌处理，不限于这份名单。
 */
const DESIGN_HOST_SUFFIXES = Object.freeze([
  'figma.com',
  'figjam.com',
  'axure.com',
  'axure.cloud',
  'lanhuapp.com',
  'mastergo.com',
  'modao.cc',
  'pixso.cn',
  'js.design',
  'invisionapp.com',
  'sketch.com',
  'sketch.cloud',
  'xd.adobe.com',
  'xiaopiu.com',
  'mockplus.cn',
  'protopie.io'
]);

function resolveFileId(value) {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.length ? resolveFileId(value[0]) : '';
  }
  if (typeof value === 'object') {
    // Upload interceptor object-output-value 可能留下 { id } / { fileId } / { value }
    return resolveFileId(value.id != null ? value.id : value.fileId != null ? value.fileId : value.value != null ? value.value : '');
  }
  return '';
}

function isSafeHttpUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function filenameFromUrl(url) {
  if (!isSafeHttpUrl(url)) {
    return '';
  }
  try {
    const parsed = new URL(url.trim());
    const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return last;
  } catch (error) {
    return '';
  }
}

function extensionOf(nameOrUrl) {
  if (typeof nameOrUrl !== 'string') {
    return '';
  }
  const path = nameOrUrl.split('#')[0].split('?')[0];
  const match = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function filePreviewType(filename) {
  const ext = extensionOf(filename);
  return FILE_PREVIEW_EXTENSIONS[ext] || 'unknown';
}

function hostnameOf(url) {
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch (error) {
    return '';
  }
}

function isLikelyEmbedBlockedHost(url) {
  const host = hostnameOf(url);
  if (!host) {
    return false;
  }
  return DESIGN_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith('.' + suffix));
}

function isInPageUrlPreviewTemplate(templateCode) {
  return IN_PAGE_URL_PREVIEW_TEMPLATE_CODES.indexOf(templateCode) !== -1;
}

/**
 * OSS 附件分类。未知扩展名仍返回 ossPreview：由 FilePreview 的 UnknownPreview 页内展示，并保留下载。
 */
function classifyFileAttachment({ fileId, fileName } = {}) {
  const id = resolveFileId(fileId);
  if (!id) {
    return { kind: 'empty', id: '', filename: '', previewType: 'unknown' };
  }
  const filename = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : String(id);
  return {
    kind: 'ossPreview',
    id,
    filename,
    previewType: filePreviewType(filename)
  };
}

/**
 * 原型 / 设计稿 URL 分类。不用于其他 url 字段。
 * filePreview：扩展名可识别，用 FilePreview src 页内嵌入。
 * unsupported：外站/无扩展名，空态 + 可选手动打开，不自动跳转。
 * invalid：非 http(s) 或带凭证，不渲染可点击跳转。
 */
function classifyPrototypeUrl(url) {
  if (url == null || (typeof url === 'string' && !url.trim())) {
    return { kind: 'empty' };
  }
  if (!isSafeHttpUrl(url)) {
    return { kind: 'invalid', url: typeof url === 'string' ? url.trim() : '' };
  }
  const trimmed = url.trim();
  const filename = filenameFromUrl(trimmed) || 'preview';
  const previewType = filePreviewType(filename);
  if (previewType !== 'unknown') {
    return {
      kind: 'filePreview',
      src: trimmed,
      filename,
      previewType
    };
  }
  return {
    kind: 'unsupported',
    url: trimmed,
    filename,
    previewType: 'unknown',
    embedBlocked: isLikelyEmbedBlockedHost(trimmed),
    reason: isLikelyEmbedBlockedHost(trimmed) ? 'embed-blocked' : 'unsupported-embed'
  };
}

/**
 * 统一入口：交付物或 jsonb 单行材料的预览分类。
 * option 存在时只看该行（扩展材料 / 设计评审记录等 jsonb），且 url 行保持外链，不套用原型预览。
 */
function classifyDeliverablePreview(item, option) {
  if (option) {
    const type = option.type;
    if (type === 'file') {
      return classifyFileAttachment(option);
    }
    if (type === 'url') {
      return { kind: 'link', url: option.url || '' };
    }
    if (type === 'text') {
      return { kind: 'text', content: option.content || '' };
    }
    return { kind: 'empty' };
  }
  if (!item) {
    return { kind: 'empty' };
  }
  if (item.contentType === 'file') {
    return classifyFileAttachment(item);
  }
  if (item.contentType === 'url' && isInPageUrlPreviewTemplate(item.templateCode)) {
    return classifyPrototypeUrl(item.url);
  }
  if (item.contentType === 'url') {
    return { kind: 'link', url: item.url || '' };
  }
  return { kind: 'passthrough' };
}

function staysOnCurrentPage(classification) {
  if (!classification) {
    return true;
  }
  return classification.kind !== 'link';
}

module.exports = {
  IN_PAGE_URL_PREVIEW_TEMPLATE_CODES,
  FILE_PREVIEW_EXTENSIONS,
  resolveFileId,
  isSafeHttpUrl,
  filenameFromUrl,
  filePreviewType,
  isInPageUrlPreviewTemplate,
  isLikelyEmbedBlockedHost,
  classifyFileAttachment,
  classifyPrototypeUrl,
  classifyDeliverablePreview,
  staysOnCurrentPage
};
