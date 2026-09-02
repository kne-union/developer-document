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
    'search_document_index',
    {
      description: '全文搜索组件/npm 文档索引；匹配已登记包会先建索引；@kne/@kne-components 无记录时会先校验 npm 存在再自动创建并建索引',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词（与 docId 至少提供一个）'),
        docId: z.string().optional().describe('限定文档 id（包名或 remote）'),
        version: z.string().optional().describe('限定版本'),
        limit: z.number().optional().describe('返回条数，默认 3')
      })
    },
    async ({ query, docId, version, limit }) => {
      if (!query && !docId) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'query 或 docId 至少提供一个' }, null, 2) }], isError: true };
      }
      const results = await services.documentIndex.search({ query, docId, version, limit, userId, source: 'mcp' });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  mcpServer.registerTool(
    'search_document',
    {
      description: 'PostgreSQL 全文搜索全部后台 document（含 draft/非公开）',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词'),
        limit: z.number().optional().describe('返回条数，默认 3')
      })
    },
    async ({ query, limit }) => {
      const results = await services.document.searchByFts({ query, limit, userId, source: 'mcp' });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
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
