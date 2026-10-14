const crypto = require('node:crypto');
const z = require('zod/v4');

const MAX_TEXT = 30000;
const MAX_LOG_LINES = 1000;

const toText = value => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n...（已截断，共 ${text.length} 字符，请缩小范围）` : text;
};

const pickApp = app =>
  app && {
    name: app.name,
    label: app.label,
    status: app.status,
    message: app.message || null,
    port: app.port,
    pathUrl: app.pathUrl,
    domain: app.domain || null,
    currentVersionId: app.currentVersionId || null,
    description: app.description || null,
    isPublic: app.isPublic,
    entries: app.entries
  };

const summarizeLoad = (pageData, minutes) => {
  const since = Date.now() - minutes * 60 * 1000;
  const samples = (pageData || []).filter(item => item.ts >= since);
  if (!samples.length) {
    return { minutes, samples: 0 };
  }
  const stat = values => {
    const list = values.filter(value => Number.isFinite(value));
    if (!list.length) {
      return null;
    }
    return { avg: Math.round((list.reduce((sum, value) => sum + value, 0) / list.length) * 10) / 10, max: Math.max(...list) };
  };
  const toMb = bytes => Math.round((bytes / 1024 / 1024) * 10) / 10;
  return {
    minutes,
    samples: samples.length,
    cpuPercent: stat(samples.map(item => item.cpu)),
    memoryMb: stat(samples.map(item => toMb(item.memory || 0))),
    qps: stat(samples.map(item => item.requests?.qps)),
    p95Ms: stat(samples.map(item => item.requests?.p95)),
    errorRate: stat(samples.map(item => item.requests?.errorRate)),
    restartsDelta: Math.max(0, (samples[samples.length - 1].restarts || 0) - (samples[0].restarts || 0)),
    offlineSamples: samples.filter(item => item.status !== 'online').length
  };
};

/**
 * 应用中心（@kne/fastify-app-manager）管理工具：调用方须在注册前确认当前用户为管理员（MCP server 按请求创建）。
 * 数据调试仅提供只读能力；写库只通过迁移脚本（run_app_migration）。
 */
const registerAppManagerTools = (mcpServer, { fastify }) => {
  const getServices = () => fastify.appManager.services;

  const run = handler => async args => {
    try {
      const result = await handler(args, getServices());
      return { content: [{ type: 'text', text: toText(result) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: e.message || String(e) }], isError: true };
    }
  };

  const register = (name, description, shape, handler) => mcpServer.registerTool(name, { description, inputSchema: z.object(shape) }, run(handler));

  const appName = z.string().describe('应用标识 name（小写 slug）');

  register(
    'list_apps',
    '列出应用中心的应用（名称、状态、端口、访问路径、当前版本）',
    {
      keyword: z.string().optional().describe('按 name / label 模糊搜索'),
      status: z.enum(['idle', 'deploying', 'running', 'stopped', 'error']).optional(),
      perPage: z.number().optional().describe('默认 50'),
      currentPage: z.number().optional()
    },
    async ({ keyword, status, perPage = 50, currentPage = 1 }, services) => {
      const { pageData, totalCount } = await services.app.list({ filter: { keyword, status }, perPage, currentPage });
      return { totalCount, pageData: pageData.map(pickApp) };
    }
  );

  register('get_app', '应用详情：状态与原因、当前版本、环境变量缺失摘要、最近一次部署进度', { name: appName }, async ({ name }, services) => {
    const app = await services.app.detail({ name });
    const declaration = await services.app.getEnvDeclaration({ name }).catch(e => ({ error: e.message }));
    const progress = services.app.getDeployProgress().snapshot(name);
    return {
      app: pickApp(app),
      env: declaration.error
        ? { error: declaration.error }
        : {
            version: declaration.version,
            hasSchema: declaration.hasSchema,
            valid: declaration.valid,
            problems: (declaration.declared || []).filter(item => item.error).map(item => ({ key: item.key, error: item.error }))
          },
      lastDeploy: progress
    };
  });

  register(
    'create_app',
    '创建应用（分配端口与访问路径）；创建后用 upload_app_version 上传版本，再 deploy_app',
    {
      name: appName,
      label: z.string().describe('显示名称'),
      description: z.string().optional(),
      domain: z.string().optional().describe('绑定域名（可选）'),
      isPublic: z.boolean().optional().describe('是否在应用中心公开，默认公开')
    },
    async (args, services) => pickApp(await services.app.create(args))
  );

  register(
    'update_app',
    '更新应用元信息（名称、描述、域名、是否公开）；环境变量请用 save_app_env',
    {
      name: appName,
      label: z.string().optional(),
      description: z.string().optional(),
      domain: z.string().optional(),
      isPublic: z.boolean().optional()
    },
    async (args, services) => pickApp(await services.app.save(args))
  );

  register(
    'get_app_env',
    [
      '按版本的 server/env.schema.json 列出需要用户填写的环境变量：declared（声明的变量，含必填、说明、当前值、校验错误）与 others（已配置但未声明）。',
      '不含应用中心注入的变量（PORT、托管库 DB_*、DB_TABLE_PREFIX、OIDC 等），密钥值为 ********。'
    ].join('\n'),
    {
      name: appName,
      versionId: z.string().optional().describe('默认当前版本，没有则最新上传的版本')
    },
    async ({ name, versionId }, services) => services.app.getEnvDeclaration({ name, versionId })
  );

  register(
    'save_app_env',
    '合并保存环境变量：值为 null 删除该变量；密钥保持 ******** 表示不改。PORT 与系统变量会被忽略。返回保存后的变量声明',
    {
      name: appName,
      env: z.record(z.string(), z.string().nullable()).describe('{ KEY: value | null }'),
      secretKeys: z.array(z.string()).optional().describe('需要按密钥保存的键名（只增不减）')
    },
    async ({ name, env, secretKeys }, services) => {
      await services.app.saveEnv({ name, env, secretEnvKeys: secretKeys });
      return services.app.getEnvDeclaration({ name });
    }
  );

  register(
    'list_app_versions',
    '列出应用版本（版本号、说明、是否有 SQL 与 env.schema.json、上传时间）',
    {
      name: appName,
      perPage: z.number().optional().describe('默认 20'),
      currentPage: z.number().optional()
    },
    async ({ name, perPage = 20, currentPage = 1 }, services) => {
      const { pageData, totalCount } = await services.app.listVersions({ name, perPage, currentPage });
      return {
        totalCount,
        pageData: pageData.map(({ id, version, label, hasMigration, hasEnvSchema, sqlFiles, fileId, createdAt }) => ({ id, version, label, hasMigration, hasEnvSchema, sqlFiles, fileId, createdAt }))
      };
    }
  );

  register(
    'upload_app_version',
    ['用已上传到文件管理的部署包登记新版本。', 'fileId 来自 `npx @kne/npm-tools packApp --upload` 的输出（或 POST /app-package/upload）。包须含 server/env.schema.json，否则拒绝。'].join('\n'),
    {
      name: appName,
      version: z.string().describe('版本号，同应用内唯一'),
      label: z.string().optional().describe('版本说明'),
      fileId: z.string().describe('文件管理中的文件 id')
    },
    async ({ name, version, label, fileId }, services) => {
      const { buffer } = await fastify.fileManager.services.fileRecord.getFileBlob({ id: fileId });
      const row = await services.app.uploadVersion({ name, version, label, zipBuffer: buffer, fileId });
      return { id: row.id, version: row.version, label: row.label, hasMigration: row.hasMigration, hasEnvSchema: row.hasEnvSchema, sqlFiles: row.sqlFiles || [] };
    }
  );

  const resolveVersionId = async (services, { name, versionId }) => {
    if (versionId) {
      return versionId;
    }
    const app = await services.app.detail({ name });
    if (!app?.currentVersionId) {
      throw new Error(`应用 ${name} 还没有部署版本，请传 versionId`);
    }
    return String(app.currentVersionId);
  };

  const versionIdArg = z.string().optional().describe('不传则为当前部署版本');
  const sqlFileArg = z.string().describe('脚本文件名，[A-Za-z0-9_-.] 且以 .sql 结尾，按文件名排序执行');

  register('list_app_migrations', '列出某版本（默认当前部署版本）的 SQL 迁移脚本及是否已执行，部署前用于决定 deploy_app 的 migrations', { name: appName, versionId: versionIdArg }, async ({ name, versionId }, services) =>
    services.migration.list({ name, versionId: await resolveVersionId(services, { name, versionId }) })
  );

  register(
    'save_app_migration',
    ['向某版本（默认当前部署版本）新增或覆盖 SQL 迁移脚本，无需重新打包上传版本。', '保存后用 run_app_migration 单独执行，或重新 deploy_app 该版本时按未执行脚本自动执行。'].join('\n'),
    { name: appName, versionId: versionIdArg, file: sqlFileArg, content: z.string().describe('SQL 内容') },
    async ({ name, versionId, file, content }, services) => {
      const id = await resolveVersionId(services, { name, versionId });
      await services.migration.save({ name, versionId: id, file, content });
      return services.migration.list({ name, versionId: id });
    }
  );

  register(
    'run_app_migration',
    ['对应用数据库执行某版本（默认当前部署版本）的一个迁移脚本并记录为已执行；不会重启应用。', 'action=mark 只记录为已执行不跑 SQL，unmark 撤销执行记录（不回滚数据）。'].join('\n'),
    { name: appName, versionId: versionIdArg, file: sqlFileArg, action: z.enum(['execute', 'mark', 'unmark']).optional().describe('默认 execute') },
    async ({ name, versionId, file, action = 'execute' }, services) => services.migration.action({ action, name, versionId: await resolveVersionId(services, { name, versionId }), file })
  );

  register(
    'deploy_app',
    ['部署指定版本：准备部署包 → 校验环境变量 → SQL 迁移 → 启动 → 健康检查。', '环境变量不符合 env.schema.json 时停在 env 阶段并列出问题，可先 get_app_env / save_app_env 修正。', 'wait=true（默认）时等待部署结束再返回各阶段结果。'].join(
      '\n'
    ),
    {
      name: appName,
      versionId: z.string().optional().describe('与 version 二选一'),
      version: z.string().optional(),
      runMigration: z.boolean().optional().describe('默认 true'),
      migrations: z
        .array(z.object({ name: z.string(), action: z.enum(['execute', 'skip', 'hold']) }))
        .optional()
        .describe('逐个指定待执行脚本的处理方式；未列出的按 execute'),
      wait: z.boolean().optional().describe('默认 true'),
      timeoutMs: z.number().optional().describe('等待超时，默认 180000')
    },
    async ({ name, versionId, version, runMigration = true, migrations, wait = true, timeoutMs = 180000 }, services) => {
      if (!versionId && !version) {
        throw new Error('versionId 或 version 至少提供一个');
      }
      const progressId = crypto.randomUUID();
      const steps = () => {
        const snapshot = services.app.getDeployProgress().snapshot(name);
        return snapshot && snapshot.progressId === progressId ? snapshot.events.map(({ step, status, detail, message }) => ({ step, status, detail, message })) : [];
      };
      try {
        await services.app.deploy({ name, versionId, version, runMigration, migrations, progressId });
      } catch (e) {
        return { ok: false, message: e.message, steps: steps() };
      }
      if (!wait) {
        return { ok: null, progressId, message: '已开始部署，可用 get_app 查看进度', steps: steps() };
      }
      const result = await services.app.waitDeployProgress({ name, progressId, timeoutMs });
      const app = await services.app.detail({ name });
      return {
        ok: result.ok,
        timedOut: result.timedOut,
        status: app.status,
        message: app.message || null,
        steps: result.events.map(({ step, status, detail, message }) => ({ step, status, detail, message }))
      };
    }
  );

  for (const [action, description] of [
    ['start', '启动应用（启动前按 env.schema.json 校验环境变量）'],
    ['stop', '停止应用'],
    ['restart', '重启应用以加载新的环境变量（校验不通过时不影响正在运行的进程）']
  ]) {
    register(`${action}_app`, description, { name: appName }, async ({ name }, services) => pickApp(await services.app[action]({ name })));
  }

  register(
    'get_app_logs',
    ['读取应用日志尾部用于排错：stream=err（默认，错误输出）或 out；file 指定历史归档（来自 files 列表）。', 'keyword 只返回包含关键字的行（不区分大小写）。返回行格式为「行号 | 内容」，并附带可用的日志文件列表。'].join('\n'),
    {
      name: appName,
      stream: z.enum(['err', 'out']).optional(),
      lines: z.number().optional().describe(`最多读取的行数，默认 200，上限 ${MAX_LOG_LINES}`),
      keyword: z.string().optional(),
      file: z.string().optional().describe('归档文件名，不传读当前日志')
    },
    async ({ name, stream = 'err', lines = 200, keyword, file }, services) => {
      const target = Math.min(Math.max(1, lines), MAX_LOG_LINES);
      const collected = [];
      let currentPage = 1;
      while (collected.length < target) {
        const page = await services.app.logs({ name, stream, file, perPage: 100, currentPage });
        collected.push(...page.pageData);
        if (!page.hasMore || !page.pageData.length) {
          break;
        }
        currentPage += 1;
      }
      const ordered = collected.slice(0, target).reverse();
      const needle = keyword ? keyword.toLowerCase() : null;
      const matched = needle ? ordered.filter(item => String(item.content).toLowerCase().includes(needle)) : ordered;
      const { pageData: files } = await services.app.logFiles({ name });
      return [
        `应用 ${name} ${file || `${stream}.log`}：读取最近 ${ordered.length} 行${needle ? `，包含「${keyword}」的 ${matched.length} 行` : ''}`,
        '',
        matched.map(item => `${item.line} | ${item.content}`).join('\n') || '（无内容）',
        '',
        `日志文件：${files.map(item => item.fileName).join(', ')}`
      ].join('\n');
    }
  );

  register('list_app_tables', '列出应用数据库中归属该应用的表（含列与主键摘要），只读', { name: appName }, async ({ name }, services) => services.dbops.listTables({ name }));

  register(
    'list_app_rows',
    '分页查看表数据（只读）；filter 为等值或范围 { $gte,$lte,$gt,$lt }，keyword 在字符串列模糊匹配',
    {
      name: appName,
      table: z.string(),
      perPage: z.number().optional().describe('默认 20，上限 100'),
      currentPage: z.number().optional(),
      filter: z.record(z.string(), z.unknown()).optional(),
      keyword: z.string().optional(),
      sort: z.array(z.object({ name: z.string(), sort: z.enum(['ASC', 'DESC']) })).optional(),
      includeDeleted: z.boolean().optional()
    },
    async ({ perPage = 20, ...args }, services) => services.dbops.listRows(Object.assign({}, args, { perPage: Math.min(perPage, 100) }))
  );

  register(
    'query_app_sql',
    '对应用数据库执行只读 SQL（SELECT / WITH / EXPLAIN / SHOW / DESCRIBE / PRAGMA），共享库只能访问应用自有的表，返回行数有上限',
    {
      name: appName,
      sql: z.string(),
      maxRows: z.number().optional()
    },
    async ({ name, sql, maxRows }, services) => services.dbops.runQuery({ name, sql, maxRows })
  );

  register(
    'get_app_load',
    '应用负载：当前样本（CPU、内存、实例、重启次数、请求 QPS / RT / 错误率）与最近 N 分钟汇总',
    {
      name: appName,
      minutes: z.number().optional().describe('汇总最近 N 分钟，默认 10')
    },
    async ({ name, minutes = 10 }, services) => {
      const { intervalMs, current, pageData } = await services.app.load({ name });
      return { intervalMs, current, summary: summarizeLoad(pageData, minutes) };
    }
  );
};

module.exports = registerAppManagerTools;
module.exports.summarizeLoad = summarizeLoad;
