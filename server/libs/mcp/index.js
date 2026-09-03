const fp = require('fastify-plugin');
const { McpServer } = require('@modelcontextprotocol/server');
const { NodeStreamableHTTPServerTransport } = require('@modelcontextprotocol/node');
const z = require('zod/v4');

const registerTools = (mcpServer, { services, userId }) => {
  mcpServer.registerTool(
    'check_worklog_exists',
    {
      description: '按 relativePath 检查工作日志是否已在服务端存在',
      inputSchema: z.object({
        relativePath: z.string().describe('相对 ~/.kne_document 的路径，如 worklog/project/...')
      })
    },
    async ({ relativePath }) => {
      const result = await services.worklog.exists({ relativePath });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'check_experience_exists',
    {
      description: '按 relativePath 检查经验是否已在服务端存在',
      inputSchema: z.object({
        relativePath: z.string().describe('相对 ~/.kne_document 的路径，如 experience/business/...')
      })
    },
    async ({ relativePath }) => {
      const result = await services.experience.exists({ relativePath });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'upload_experience',
    {
      description: '上传或更新可复用经验 JSON',
      inputSchema: z.object({
        relativePath: z.string().describe('相对 ~/.kne_document/experience 的路径'),
        content: z.record(z.string(), z.unknown()).describe('经验 JSON 内容'),
        skipIfExists: z.boolean().optional().describe('true 时服务端已存在则跳过（用于首次迁移）')
      })
    },
    async ({ relativePath, content, skipIfExists }) => {
      const result = await services.experience.upsert({ relativePath, content, userId, skipIfExists: !!skipIfExists });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'upload_worklog',
    {
      description: '上传或更新工作日志 JSON',
      inputSchema: z.object({
        relativePath: z.string().describe('相对 ~/.kne_document/worklog 的路径'),
        content: z.record(z.string(), z.unknown()).describe('工作日志 JSON 内容'),
        skipIfExists: z.boolean().optional().describe('true 时服务端已存在则跳过（用于首次迁移）')
      })
    },
    async ({ relativePath, content, skipIfExists }) => {
      const result = await services.worklog.upsert({ relativePath, content, userId, skipIfExists: !!skipIfExists });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'search_experience',
    {
      description: '关键词搜索可复用经验（仅 active）',
      inputSchema: z.object({
        query: z.string().optional().describe('搜索关键词'),
        category: z.string().optional().describe('business | library | process'),
        limit: z.number().optional().describe('返回条数，默认 3')
      })
    },
    async ({ query, category, limit }) => {
      const results = await services.experience.search({ query, category, limit, userId, source: 'mcp' });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'search_worklog',
    {
      description: [
        '查询工作日志，用于写周报/复盘。返回 markdown（按项目分组）。',
        '',
        '时间筛选（任选其一，默认近 7 天）：',
        '- week="this"|"last"：按 Asia/Shanghai 自然周（周一～周日）',
        '- days=N：近 N 天',
        '- startAt / endAt：ISO 日期或日期时间',
        '',
        '创建人筛选（任选其一）：',
        '- mine=true：当前登录用户',
        '- creator：昵称 / 邮箱 / 用户 id（模糊匹配多人时会返回候选）',
        '- createdUserId：精确用户 id',
        '',
        '还可按 project、query（标题/路径/项目名关键词）收窄。'
      ].join('\n'),
      inputSchema: z.object({
        query: z.string().optional().describe('关键词（标题 / 路径 / 项目名）'),
        project: z.string().optional().describe('项目名（模糊匹配 content.project.name）'),
        creator: z.string().optional().describe('创建人：昵称、邮箱或用户 id'),
        createdUserId: z.string().optional().describe('创建人用户 id（精确）'),
        mine: z.boolean().optional().describe('仅当前 MCP 登录用户的日志'),
        startAt: z.string().optional().describe('开始时间，ISO 日期或日期时间'),
        endAt: z.string().optional().describe('结束时间，ISO 日期或日期时间'),
        week: z.enum(['this', 'last']).optional().describe('this=本周，last=上周（上海时区，周一为一周起点）'),
        days: z.number().optional().describe('近 N 天；未指定时间范围时默认 7'),
        limit: z.number().optional().describe('最多返回条数，默认 50，上限 200'),
        mode: z.enum(['report', 'list']).optional().describe('report=周报素材（默认）；list=紧凑列表')
      })
    },
    async ({ query, project, creator, createdUserId, mine, startAt, endAt, week, days, limit, mode }) => {
      const result = await services.worklog.search({
        query,
        projectName: project,
        creator,
        createdUserId,
        mine,
        startAt,
        endAt,
        week,
        days,
        limit,
        mode,
        currentUserId: userId
      });
      return { content: [{ type: 'text', text: result.text }], isError: !!result.error };
    }
  );

  mcpServer.registerTool(
    'search_document_index',
    {
      description: [
        '写 @kne 组件 / npm 包代码前的主检索工具，返回 markdown 正文（不是 JSON）。',
        '一次调用就在预算内给出可直接照抄的示例与 API 表格，并合并经验与后台文档命中；',
        '匹配已登记包会先建索引，@kne/@kne-components 无记录时会先校验 npm 存在再自动创建。',
        '',
        '用法：',
        '- 先调用本工具，**一次通常就够**，不要习惯性再搜一遍或换关键词重试。',
        '- 结果里出现 truncated 或「未包含」清单，且确实需要那部分时，才用 fetch_docs，一次传多个 ref。',
        '- 只想看某个包里有什么，用 mode="locate"（只回 ref 与一句摘要）。',
        '',
        '禁止：不要为了拿示例去猜 README 路径；没有 ref 支撑的 API 一律不要臆造。'
      ].join('\n'),
      inputSchema: z.object({
        query: z.string().describe('搜索关键词，可用组件名、包名、token（如 components-core:FormInfo）或中文场景词'),
        docId: z.string().optional().describe('限定文档 id（包名或 remote）'),
        version: z.string().optional().describe('限定版本'),
        limit: z.number().optional().describe('最多命中段数，默认 12'),
        maxChars: z.number().optional().describe('输出预算（字符），默认 12000'),
        mode: z.enum(['answer', 'locate']).optional().describe('answer=带正文（默认）；locate=只回 ref 与摘要')
      })
    },
    async ({ query, docId, version, limit, maxChars, mode }) => {
      if (!query && !docId) {
        return { content: [{ type: 'text', text: 'query 或 docId 至少提供一个' }], isError: true };
      }
      const text = await services.docRetrieval.search({
        query,
        docId,
        version,
        limit,
        maxChars,
        mode,
        userId,
        source: 'mcp'
      });
      return { content: [{ type: 'text', text }] };
    }
  );

  mcpServer.registerTool(
    'fetch_docs',
    {
      description: [
        '按 ref 深读文档内容，返回 markdown。仅在 search_document_index 标注 truncated 或列出「未包含」时使用。',
        'ref 形如：',
        '- doc-index:{docId}@{version}#/{组件名}                 组件目录（有哪些 API 子节与示例、各多大）',
        '- doc-index:{docId}@{version}#/{组件名}/api/{子节}      单个 API 子节（最省 token）',
        '- doc-index:{docId}@{version}#/{组件名}/examples/{序号} 单条示例代码',
        '- experience:{相对路径}  /  document:{id}',
        '一次可传多个 ref，比多次调用便宜。'
      ].join('\n'),
      inputSchema: z.object({
        refs: z.array(z.string()).describe('要深读的 ref 列表，最多 10 个'),
        offset: z.number().optional().describe('内容字符偏移，用于翻页'),
        limit: z.number().optional().describe('本次最多返回的字符数')
      })
    },
    async ({ refs, offset, limit }) => {
      const text = await services.docRetrieval.fetchRefs({ refs, offset, limit });
      return { content: [{ type: 'text', text }] };
    }
  );

  mcpServer.registerTool(
    'search_document',
    {
      description: '只搜后台 document（含 draft/非公开）。组件与 npm 文档请用 search_document_index，它已包含后台文档命中。',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词'),
        limit: z.number().optional().describe('返回条数，默认 3')
      })
    },
    async ({ query, limit }) => {
      const results = await services.document.searchByFts({ query, limit, userId, source: 'mcp' });
      const text = results.length ? results.map(row => `## ${row.name}\nref: document:${row.id}\n状态：${row.status}\n${row.snippet || ''}`).join('\n\n') : `无命中：${query}`;
      return { content: [{ type: 'text', text }] };
    }
  );
};

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const { authenticate } = fastify.account;
  const mcpPath = `${options.prefix}/mcp`;

  const authHook = async request => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ') && !request.headers['x-user-token']) {
      request.headers['x-user-token'] = authHeader.slice(7);
    }
    await authenticate.user(request);
    request.raw.authInfo = { userId: request.userInfo.id, user: request.userInfo };
  };

  fastify.route({
    method: ['GET', 'POST', 'DELETE'],
    url: mcpPath,
    onRequest: [authHook],
    handler: async (request, reply) => {
      if (request.method !== 'POST') {
        reply.code(405).send({ error: 'Method Not Allowed' });
        return;
      }

      const userId = request.userInfo.id;
      const mcpServer = new McpServer({ name: 'developer-document', version: '1.0.0' });
      registerTools(mcpServer, { services, userId });

      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await mcpServer.connect(transport);

      reply.raw.on('close', () => {
        transport.close();
        mcpServer.close();
      });

      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw, request.body);
    }
  });
});
