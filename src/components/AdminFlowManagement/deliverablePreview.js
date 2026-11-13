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

/**
 * 流程详情文件预览分级。项目内没有既有的 isCore / coreFile / previewMode 配置可复用；
 * 重要性只按模板角色与入口种类判定，不用文件后缀猜测业务重要性（后缀只用来区分「文件 vs 网页」）。
 */
const PREVIEW_PRESENTATION = Object.freeze({
  INLINE: 'inline',
  MODAL: 'modal',
  LINK: 'link'
});

/** 这些模板上「交付物本身的主文件」是核心：当前页 FilePreview（或步骤截图缩略图直接可见） */
const CORE_FILE_TEMPLATE_CODES = Object.freeze(['prototype', 'test_report', 'test_cases']);

/** 扩展材料 / 评审 / 背景资料 / 拆解 / 回归等补充附件：点击同页弹窗 */
const SUPPLEMENTARY_TEMPLATE_CODES = Object.freeze(['options', 'background_ref', 'requirement_review', 'design_review', 'decomposition_plan', 'design_decomposition', 'regression_note']);

/**
 * entryKind 取值：
 *   deliverable_main         交付物主文件（contentType=file 本体、prototype 地址）
 *   test_case_document       测试用例主文档
 *   test_step_screenshot     已关联测试步骤的截图（必须直接可见）
 *   test_unlinked_screenshot 未关联步骤的测试截图（仍属测试截图，直接可见）
 *   option_file              jsonb 材料行里的附件
 *   regression_screenshot    回归记录自身的截图（补充材料）
 *   markdown_file            正文 / 说明里检出的真实附件
 *   ledger_file              放行台账证据中的文件
 *   business_url             普通非文件业务链接，不强改预览
 */
const FILE_PREVIEW_ENTRY_KINDS = Object.freeze(['deliverable_main', 'test_case_document', 'test_step_screenshot', 'test_unlinked_screenshot', 'option_file', 'regression_screenshot', 'markdown_file', 'ledger_file', 'business_url']);

function resolveFilePreviewPresentation({ templateCode, entryKind } = {}) {
  if (entryKind === 'business_url') {
    return PREVIEW_PRESENTATION.LINK;
  }
  if (entryKind === 'test_step_screenshot' || entryKind === 'test_unlinked_screenshot' || entryKind === 'test_case_document') {
    return PREVIEW_PRESENTATION.INLINE;
  }
  if (entryKind === 'regression_screenshot' || entryKind === 'markdown_file' || entryKind === 'ledger_file') {
    return PREVIEW_PRESENTATION.MODAL;
  }
  if (entryKind === 'option_file') {
    return CORE_FILE_TEMPLATE_CODES.includes(templateCode) ? PREVIEW_PRESENTATION.INLINE : PREVIEW_PRESENTATION.MODAL;
  }
  if (entryKind === 'deliverable_main' || !entryKind) {
    if (CORE_FILE_TEMPLATE_CODES.includes(templateCode)) {
      return PREVIEW_PRESENTATION.INLINE;
    }
    if (templateCode && SUPPLEMENTARY_TEMPLATE_CODES.includes(templateCode)) {
      return PREVIEW_PRESENTATION.MODAL;
    }
    // 未声明入口且模板不在核心名单：默认非核心，避免把补充附件做成页内大预览
    return PREVIEW_PRESENTATION.MODAL;
  }
  return PREVIEW_PRESENTATION.MODAL;
}

function classifyPreviewSource({ fileId, src, fileName } = {}) {
  if (fileId) {
    return classifyFileAttachment({ fileId, fileName, filename: fileName });
  }
  if (src) {
    const classified = classifyPrototypeUrl(src);
    if (fileName && (classified.kind === 'filePreview' || classified.kind === 'unsupported') && !classified.filename) {
      return Object.assign({}, classified, { filename: fileName });
    }
    return classified;
  }
  return { kind: 'empty' };
}

const REF_TYPE_ALIASES = { doc: 'document_index', document: 'document_index', docs: 'document_index', experience: 'experience', exp: 'experience', worklog: 'worklog', log: 'worklog', file: 'file', url: 'url', link: 'url' };

/** 解析流程引用（台账 evidence / 前缀文本），不把业务引用强改成文件预览 */
function parseFlowRef(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (isSafeHttpUrl(trimmed)) {
      return { type: 'url', ref: trimmed };
    }
    const matched = trimmed.match(/^([a-z_]+):(.+)$/i);
    if (matched) {
      const type = REF_TYPE_ALIASES[matched[1].toLowerCase()];
      return type ? { type, ref: matched[2].trim() } : null;
    }
    return null;
  }
  if (value && typeof value === 'object' && typeof value.ref === 'string' && value.ref.trim()) {
    const type = REF_TYPE_ALIASES[String(value.type || '').toLowerCase()];
    return type ? { type, ref: value.ref.trim() } : null;
  }
  return null;
}

const APP_FILE_URL_PATH = '/api/v1/static/file-url/';

function appFileIdFromHref(href) {
  if (typeof href !== 'string' || !href) {
    return '';
  }
  const trimmed = href.trim();
  if (trimmed.startsWith(APP_FILE_URL_PATH)) {
    const rest = trimmed.slice(APP_FILE_URL_PATH.length).split('?')[0].split('#')[0];
    try {
      return decodeURIComponent(rest);
    } catch (error) {
      return rest;
    }
  }
  if (isSafeHttpUrl(trimmed)) {
    try {
      const path = new URL(trimmed).pathname;
      if (path.startsWith(APP_FILE_URL_PATH)) {
        return decodeURIComponent(path.slice(APP_FILE_URL_PATH.length));
      }
    } catch (error) {
      return '';
    }
  }
  return '';
}

function parseFileHref(href, label) {
  if (typeof href !== 'string') {
    return null;
  }
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }
  // 业务里的 file:{id} 前缀，必须和操作系统 file:// 协议区分；后者非法，不得预览
  if (/^file:\/\//i.test(trimmed)) {
    return { kind: 'invalid', reason: 'invalid_scheme', url: trimmed };
  }
  const filePrefix = trimmed.match(/^file:([^/?#]+)(?:\?filename=([^&]+))?$/i);
  if (filePrefix) {
    const filename = decodeURIComponent(filePrefix[2] || label || filePrefix[1]);
    return classifyPreviewSource({ fileId: filePrefix[1], fileName: filename });
  }
  if (/^(javascript|data|vbscript|blob):/i.test(trimmed)) {
    return { kind: 'invalid', reason: 'invalid_scheme', url: trimmed };
  }
  const queryName = trimmed.match(/[?&]filename=([^&]+)/i);
  const queryFileName = queryName ? decodeURIComponent(queryName[1]) : '';
  const appFileId = appFileIdFromHref(trimmed);
  if (appFileId) {
    return classifyPreviewSource({ fileId: appFileId, fileName: queryFileName || label || appFileId });
  }
  if (isSafeHttpUrl(trimmed)) {
    const filename = queryFileName || filenameFromUrl(trimmed) || label || '';
    const classified = classifyPreviewSource({ src: trimmed, fileName: filename });
    if (classified.kind === 'filePreview') {
      return classified;
    }
    // 无扩展名或站外网页：不当作文件预览，留给原文链接
    return null;
  }
  const idWithName = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9_-]{5,})\?filename=(.+)$/);
  if (idWithName) {
    return classifyPreviewSource({ fileId: idWithName[1], fileName: decodeURIComponent(idWithName[2]) });
  }
  return null;
}

function classifyEvidencePreview(item) {
  const parsed = parseFlowRef(item);
  if (!parsed) {
    return { kind: 'unparsed' };
  }
  if (parsed.type === 'file') {
    const source = parseFileHref('file:' + parsed.ref, '') || parseFileHref(parsed.ref, '') || classifyPreviewSource({ fileId: parsed.ref });
    return Object.assign({ presentation: PREVIEW_PRESENTATION.MODAL, entryKind: 'ledger_file', refType: 'file' }, source);
  }
  if (parsed.type === 'url') {
    const asFile = parseFileHref(parsed.ref, '');
    if (asFile && (asFile.kind === 'filePreview' || asFile.kind === 'ossPreview' || asFile.kind === 'invalid')) {
      return Object.assign({ presentation: PREVIEW_PRESENTATION.MODAL, entryKind: 'ledger_file', refType: 'url' }, asFile);
    }
    return { kind: 'link', url: parsed.ref, presentation: PREVIEW_PRESENTATION.LINK, entryKind: 'business_url', refType: 'url' };
  }
  return { kind: 'ref', type: parsed.type, ref: parsed.ref, presentation: PREVIEW_PRESENTATION.LINK, entryKind: 'business_url', refType: parsed.type };
}

const MARKDOWN_LINK = /!?\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*(?:["'][^"']*["'])?\s*\)/g;

function collectMarkdownFileAttachments(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return [];
  }
  const found = [];
  const seen = new Set();
  const add = item => {
    if (!item || (item.kind !== 'ossPreview' && item.kind !== 'filePreview' && item.kind !== 'invalid' && item.kind !== 'unsupported' && item.kind !== 'empty')) {
      return;
    }
    const key = item.id ? `id:${item.id}` : item.src ? `src:${item.src}` : `other:${item.kind}:${item.reason || ''}:${item.url || item.filename || ''}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    found.push(item);
  };
  MARKDOWN_LINK.lastIndex = 0;
  let match;
  while ((match = MARKDOWN_LINK.exec(text))) {
    const isImage = match[0].charAt(0) === '!';
    const label = match[1] || '';
    const href = match[2];
    const parsed = parseFileHref(href, label);
    if (!parsed) {
      continue;
    }
    // markdown 已能直接展示的外链图片不再重复做成附件预览
    if (isImage && parsed.kind === 'filePreview' && parsed.previewType === 'image' && parsed.src) {
      continue;
    }
    add(parsed);
  }
  return found;
}

module.exports = {
  IN_PAGE_URL_PREVIEW_TEMPLATE_CODES,
  FILE_PREVIEW_EXTENSIONS,
  PREVIEW_PRESENTATION,
  CORE_FILE_TEMPLATE_CODES,
  SUPPLEMENTARY_TEMPLATE_CODES,
  FILE_PREVIEW_ENTRY_KINDS,
  resolveFileId,
  isSafeHttpUrl,
  filenameFromUrl,
  filePreviewType,
  isInPageUrlPreviewTemplate,
  isLikelyEmbedBlockedHost,
  classifyFileAttachment,
  classifyPrototypeUrl,
  classifyDeliverablePreview,
  staysOnCurrentPage,
  resolveFilePreviewPresentation,
  classifyPreviewSource,
  parseFlowRef,
  parseFileHref,
  appFileIdFromHref,
  classifyEvidencePreview,
  collectMarkdownFileAttachments
};
