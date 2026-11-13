/**
 * 流程交付物的文件通道。
 *
 * 约定：MCP 是 JSON-RPC，不承载二进制。文件通过独立通道落到 fileManager，
 * MCP 与数据库里只保存 fileId。三种输入互斥：
 *   - localPath    AI 与服务端同机时使用，服务端从产物目录读文件（推荐，零请求体膨胀）
 *   - contentBase64 远端部署、小文件时使用，默认上限 1MB
 *   - sourceUrl    服务端直接抓取 http(s) 资源
 *
 * 上传后返回 fileId，交给 flow_save_deliverables 的 file / jsonb.options.file 引用。
 */
const crypto = require('node:crypto');
const dns = require('node:dns').promises;
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { Readable } = require('node:stream');
const z = require('zod/v4');

const MAX_BASE64_BYTES = 1 * 1024 * 1024; // 内联内容默认上限 1MB，与服务端 1MB bodyLimit 对齐；超过请走 localPath / sourceUrl
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 单文件总上限
const MAX_TEXT_BYTES = 100 * 1024; // file_get 允许内联返回文本的上限
const DEFAULT_NAMESPACE = 'flow_deliverable'; // file-manager 的 namespace 只接受字母数字下划线
const TEXT_EXTENSIONS = ['.md', '.txt', '.log', '.json', '.csv', '.yaml', '.yml', '.xml', '.html', '.js', '.ts'];

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip'
};

const artifactRoot = () => path.resolve(process.env.FLOW_ARTIFACT_ROOT || path.join(process.cwd(), '.workbuddy', 'flow-testing'));

const decodeBase64 = value => {
  const matched = String(value || '').match(/^data:([^;,]+)?(?:;[^,]*)?,(.*)$/s);
  const raw = matched ? matched[2] : String(value || '');
  const content = Buffer.from(raw.replace(/\s/g, ''), 'base64');
  if (!content.length) {
    throw new Error('contentBase64 为空或不是合法的 base64');
  }
  if (content.length > MAX_BASE64_BYTES) {
    throw new Error(`内联内容超过 ${MAX_BASE64_BYTES} 字节，请改用 localPath（同机）或 sourceUrl`);
  }
  return { content, mimeType: (matched && matched[1]) || undefined };
};

const resolveLocalFile = filePath => {
  const root = artifactRoot();
  const target = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`localPath 只允许指向产物目录 ${root}，可用 FLOW_ARTIFACT_ROOT 调整`);
  }
  const stat = fs.statSync(target);
  if (!stat.isFile()) {
    throw new Error('localPath 必须是文件');
  }
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`文件超过 ${MAX_FILE_BYTES} 字节上限`);
  }
  return { target, size: stat.size };
};

const isTextFile = (filename, mimeType) => TEXT_EXTENSIONS.includes(path.extname(String(filename || '')).toLowerCase()) || /^text\/|json|xml|javascript/.test(String(mimeType || ''));

/** 拒绝内网 / 环回 / 链路本地 / 元数据地址，防 sourceUrl 被用来打服务端内网 */
const isPrivateAddress = host => {
  const ip = String(host || '')
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  if (!ip) return true;
  if (ip === 'localhost' || ip.endsWith('.localhost') || ip.endsWith('.local') || ip.endsWith('.internal')) return true;
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (!net.isIPv4(ip)) return false;
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 127 || a === 10 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
};

const assertSafeSourceUrl = async raw => {
  const parsed = new URL(String(raw));
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('sourceUrl 只支持 http(s)');
  if (parsed.username || parsed.password) throw new Error('sourceUrl 不得携带账号密码');
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isPrivateAddress(host)) throw new Error('sourceUrl 不得指向内网 / 环回地址');
  const allowlist = String(process.env.FLOW_SOURCE_URL_ALLOWLIST || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length && !allowlist.some(domain => host === domain || host.endsWith(`.${domain}`))) {
    throw new Error(`sourceUrl 域名不在白名单内：${host}`);
  }
  // 生产建议开启：解析后的 IP 也要检查，防 DNS rebinding / 域名指向内网
  if (process.env.FLOW_SOURCE_URL_DNS_CHECK === 'true') {
    const addresses = await dns.lookup(host, { all: true }).catch(() => []);
    if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) {
      throw new Error(`sourceUrl 解析结果不可信：${host}`);
    }
  }
  return parsed.toString();
};

const registerFileTools = (mcpServer, { fastify, userId, isAdmin = false }) => {
  const fileRecord = fastify?.fileManager?.services?.fileRecord;
  if (!fileRecord || typeof fileRecord.uploadToFileSystem !== 'function') {
    return; // 未挂载文件管理插件时不注册，不影响其它 MCP 工具
  }

  const buildOptions = ({ flowId, runId, templateCode, stepId, caseId, sha256, source }) =>
    Object.fromEntries(Object.entries({ actorType: 'mcp-ai', userId, flowId, runId, templateCode, stepId, caseId, sha256, source }).filter(([, value]) => value !== undefined && value !== null && value !== ''));

  const readFileRow = async fileId => {
    try {
      const instance = await fileRecord.getFileInstance({ id: fileId });
      return instance && typeof instance.get === 'function' ? instance.get({ plain: true }) : instance;
    } catch (e) {
      return null;
    }
  };

  /** 覆盖与读取都要校验归属：options.userId 由 buildOptions 写入，普通令牌不能动别人的文件 */
  const assertFileOwnership = async (fileId, action) => {
    if (!fileId || isAdmin) return;
    const row = await readFileRow(fileId);
    if (!row) return; // 文件不存在 = 新建，不阻断
    const owner = row?.options?.userId;
    if (owner && String(owner) !== String(userId)) throw new Error(`${action}被拒绝：该文件属于其他用户`);
  };

  // fileRecord.getFileUrl 返回的是 /api/v1/static/file/... 相对路径，
  // 给 AI 的返回值必须是可直接 fetch 的完整地址（含 origin），不要让调用方自己拼。
  const toAbsoluteUrl = url => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // OSS 等已返回绝对地址时保持原样
    const origin = String(fastify?.config?.ORIGIN || process.env.ORIGIN || '').replace(/\/+$/, '');
    if (!origin) return url;
    return `${origin}${String(url).startsWith('/') ? '' : '/'}${url}`;
  };

  const finish = async record => {
    const fileId = record.id || record.uuid;
    if (!fileId) {
      throw new Error('文件上传失败：未返回 fileId');
    }
    let url = null;
    try {
      url = toAbsoluteUrl(await fileRecord.getFileUrl({ id: fileId }));
    } catch (error) {
      // URL 解析失败不影响上传结果，AI 仍可用 fileId 引用
    }
    return { record, fileId, url };
  };

  mcpServer.registerTool(
    'file_upload',
    {
      description: [
        '把 AI 产出的文件（测试报告、测试用例、截图、日志等）上传到文件管理，返回 fileId。',
        'MCP 不承载二进制：AI 与服务端同机时优先用 localPath（产物目录内的路径，零请求体膨胀）；远端部署用 contentBase64（<=1MB）或 sourceUrl。三者必须且只能传一个。',
        '拿到 fileId 后再调用 flow_save_deliverables，把 fileId + fileName 写进 file 类型交付物或 jsonb.options 里的 type=file 项；不要自己编造 fileId。',
        '传 fileId 可覆盖同一条文件记录（用于改稿幂等）。flowId / runId / templateCode 会写进文件 options 供审计。',
        '返回的 url 为可直接访问的完整地址（含 origin），AI 直接 fetch 即可，不要自行拼接路径。'
      ].join('\n'),
      inputSchema: z.object({
        fileName: z.string().describe('文件名（含扩展名），如 测试报告.md。截图与测试步骤的对应关系不能靠文件名推断，必须在 flow_save_deliverables 里用明确的 stepId。'),
        localPath: z.string().optional().describe('服务端可访问的产物文件路径；默认根目录 <cwd>/.workbuddy/flow-testing，可用 FLOW_ARTIFACT_ROOT 覆盖'),
        contentBase64: z.string().optional().describe('文件内容 base64 或 data URL，默认上限 1MB'),
        sourceUrl: z.string().optional().describe('服务端抓取的 http(s) 文件地址'),
        mimeType: z.string().optional().describe('MIME 类型；不传时按 data URL 或扩展名推断'),
        namespace: z.string().optional().describe('文件命名空间，默认 flow_deliverable；只允许字母数字下划线'),
        fileId: z.string().optional().describe('传已上传的 fileId 时原地覆盖该文件记录（改稿幂等），不传则新建'),
        flowId: z.string().optional().describe('关联流程 id，写入文件 options 供审计'),
        runId: z.string().optional().describe('关联 AI run id，写入文件 options 供审计'),
        templateCode: z.string().optional().describe('关联交付物模板 code，如 test_cases / test_report'),
        stepId: z.string().optional().describe('仅写入文件 options 供审计，不会据此自动关联测试步骤。步骤关联必须在 flow_save_deliverables 的 options 里使用明确的 stepId，不能靠文件名或顺序配对。'),
        caseId: z.string().optional().describe('仅写入文件 options 供审计，同样不会自动建立用例/步骤关系。')
      })
    },
    async args => {
      try {
        const sources = [args.localPath, args.contentBase64, args.sourceUrl].filter(Boolean);
        if (sources.length !== 1) {
          throw new Error('localPath / contentBase64 / sourceUrl 必须且只能传一个');
        }
        const fileName = path.basename(String(args.fileName || '')).trim();
        if (!fileName) {
          throw new Error('fileName 必填');
        }
        const namespace = args.namespace || DEFAULT_NAMESPACE;
        if (!/^[A-Za-z0-9_]+$/.test(namespace)) {
          throw new Error('namespace 只允许字母、数字、下划线');
        }
        const mimeType = args.mimeType || MIME_BY_EXT[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
        const id = args.fileId || undefined;
        await assertFileOwnership(id, '覆盖文件');

        let record;
        let sha256 = null;
        let source;

        if (args.localPath) {
          const { target } = resolveLocalFile(args.localPath);
          const content = fs.readFileSync(target);
          sha256 = crypto.createHash('sha256').update(content).digest('hex');
          source = 'localPath';
          record = await fileRecord.uploadToFileSystem({
            id,
            // 已在 resolveLocalFile 里限制大小，读入内存后再交给 fileManager，避免文件句柄竞态
            file: { filename: fileName, mimetype: mimeType, encoding: 'binary', file: Readable.from([content]) },
            namespace,
            options: buildOptions({ flowId: args.flowId, runId: args.runId, templateCode: args.templateCode, stepId: args.stepId, caseId: args.caseId, sha256, source })
          });
        } else if (args.contentBase64) {
          const { content, mimeType: dataMime } = decodeBase64(args.contentBase64);
          sha256 = crypto.createHash('sha256').update(content).digest('hex');
          source = 'contentBase64';
          record = await fileRecord.uploadToFileSystem({
            id,
            file: { filename: fileName, mimetype: args.mimeType || dataMime || mimeType, encoding: 'binary', file: Readable.from([content]) },
            namespace,
            options: buildOptions({ flowId: args.flowId, runId: args.runId, templateCode: args.templateCode, stepId: args.stepId, caseId: args.caseId, sha256, source })
          });
        } else {
          const safeUrl = await assertSafeSourceUrl(args.sourceUrl);
          source = 'sourceUrl';
          const options = buildOptions({ flowId: args.flowId, runId: args.runId, templateCode: args.templateCode, stepId: args.stepId, caseId: args.caseId, sha256: null, source });
          if (process.env.FLOW_SOURCE_URL_STRICT_FETCH === 'true') {
            // 严格模式：自己抓取且禁止跟随重定向，避免 uploadFromUrl 被 302 带到内网
            const response = await fetch(safeUrl, { redirect: 'error' });
            if (!response.ok) throw new Error(`sourceUrl 抓取失败：HTTP ${response.status}`);
            const content = Buffer.from(await response.arrayBuffer());
            if (content.length > MAX_FILE_BYTES) throw new Error(`远端文件超过 ${MAX_FILE_BYTES} 字节上限`);
            sha256 = crypto.createHash('sha256').update(content).digest('hex');
            record = await fileRecord.uploadToFileSystem({
              id,
              file: { filename: fileName, mimetype: mimeType, encoding: 'binary', file: Readable.from([content]) },
              namespace,
              options: { ...options, sha256 }
            });
          } else {
            record = await fileRecord.uploadFromUrl({ id, url: safeUrl, filename: fileName, namespace, options });
          }
        }

        const { fileId, url } = await finish(record);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  fileId,
                  fileName: record.filename || fileName,
                  size: record.size ?? null,
                  mimeType: record.mimetype || mimeType,
                  namespace: record.namespace || namespace,
                  storageType: record.storageType || null,
                  sha256,
                  source,
                  url,
                  uploadedBy: 'mcp-ai',
                  flowId: args.flowId || null,
                  runId: args.runId || null,
                  templateCode: args.templateCode || null,
                  hint: '把 fileId + fileName 传给 flow_save_deliverables；不要编造 fileId'
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'FILE_UPLOAD_FAILED', message: error.message }) }] };
      }
    }
  );

  mcpServer.registerTool(
    'file_get',
    {
      description: [
        '按 fileId 读取文件元信息与可直接访问的完整 URL（含 origin），不回传二进制。',
        'includeText=true 且文件为文本类、大小 <=100KB 时额外返回 text 正文（用于 AI 阅读已上传的测试用例/报告/日志）；大文件与图片只返回 url。'
      ].join('\n'),
      inputSchema: z.object({
        fileId: z.string().describe('file_upload 返回的 fileId，或已存在的 id?filename= 形式'),
        includeText: z.boolean().optional().describe('是否内联返回文本正文，默认 false'),
        maxTextBytes: z.number().optional().describe('内联文本上限，默认 100KB，最大 100KB')
      })
    },
    async ({ fileId, includeText, maxTextBytes }) => {
      try {
        await assertFileOwnership(fileId, '读取文件');
        const instance = await fileRecord.getFileInstance({ id: fileId });
        const row = instance.get({ plain: true });
        const id = row.uuid || row.id || fileId;
        let url = null;
        try {
          url = toAbsoluteUrl(await fileRecord.getFileUrl({ id }));
        } catch (error) {
          // 文件记录存在但存储不可读时仍返回元信息
        }
        const result = {
          fileId: id,
          fileName: row.filename,
          size: row.size,
          mimeType: row.mimetype,
          namespace: row.namespace,
          storageType: row.storageType,
          options: row.options || null,
          url
        };
        if (includeText) {
          const limit = Math.min(Number(maxTextBytes) || MAX_TEXT_BYTES, MAX_TEXT_BYTES);
          if (Number(row.size) <= limit && isTextFile(row.filename, row.mimetype)) {
            const { buffer } = await fileRecord.getFileBlob({ id });
            result.text = buffer.toString('utf8');
          } else {
            result.textNote = '文件过大或非文本类型，只返回 url，请用 url 取内容';
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: 'FILE_NOT_FOUND', message: error.message }) }] };
      }
    }
  );
};

module.exports = { registerFileTools };
