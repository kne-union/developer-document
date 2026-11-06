const z = require('zod/v4');
const { formatSkillFile } = require('../utils/skillAssetFormat');

const asText = value => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify(value, null, 2)
    }
  ]
});

const registerSkillTools = (mcpServer, { services, userId }) => {
  mcpServer.registerTool(
    'search_skill',
    {
      description: [
        '关键词搜索团队的受管技能（skill）与规则（rule），仅返回启用（active）的条目。',
        '返回 [{ id, type, name, title, description, category, alwaysApply, globs, snippet }]。',
        'type=rule|skill 可按类型收窄；category=business|library|process 可按分类收窄。',
        '需要可直接安装到客户端的文件清单时，改用 export_skills({ target })。'
      ].join('\n'),
      inputSchema: z.object({
        query: z.string().optional().describe('关键词（名称/标题/描述/正文）'),
        type: z.enum(['rule', 'skill']).optional().describe('rule=规则，skill=技能'),
        category: z.string().optional().describe('business | library | process'),
        limit: z.number().optional().describe('返回条数，默认 5')
      })
    },
    async ({ query, type, category, limit }) => {
      const list = await services.skillAsset.search({ query, type, category, limit });
      return asText(list);
    }
  );

  mcpServer.registerTool(
    'get_skill',
    {
      description: ['按 id 或（type + name）读取技能/规则的完整内容（含 Markdown 正文）。', '传入 target=cursor|workbuddy 时改为返回单条安装文件描述（path / frontmatter / content），不传则保持原始记录。'].join('\n'),
      inputSchema: z.object({
        id: z.string().optional().describe('记录 id'),
        type: z.enum(['rule', 'skill']).optional().describe('与 name 搭配定位'),
        name: z.string().optional().describe('唯一标识（rule 文件名 / skill 目录名）'),
        target: z.enum(['cursor', 'workbuddy']).optional().describe('安装目标；传入时返回安装文件描述')
      })
    },
    async ({ id, type, name, target }) => {
      const row = await services.skillAsset.get({ id, type, name });
      if (!row) {
        return {
          content: [{ type: 'text', text: `未找到技能/规则：${id || name}` }],
          isError: true
        };
      }
      return asText(target ? formatSkillFile(row, target) : row);
    }
  );

  mcpServer.registerTool(
    'export_skills',
    {
      description: [
        '按安装目标导出技能/规则安装清单 JSON（与 npm-tools initDevDocumentMcp 落盘使用的 REST 输出完全一致）。',
        'target=cursor：rule → ~/.cursor/rules/<name>.mdc，skill → ~/.cursor/skills/<name>/SKILL.md。',
        'target=workbuddy：全部 → ~/.workbuddy/skills/<name>/SKILL.md；alwaysApply=true 的 rule 额外生成 memoryBlocks[]，',
        '由 CLI 合并写入用户级 MEMORY.md 托管区块，保证每会话必加载（摘要 + 全文路径）。',
        'files[].content 是已拼好 frontmatter 的最终文件全文，CLI 只负责写盘。默认只导出 active 条目。'
      ].join('\n'),
      inputSchema: z.object({
        target: z.enum(['cursor', 'workbuddy']).describe('安装目标'),
        type: z.enum(['rule', 'skill']).optional().describe('只导出指定类型'),
        name: z.string().optional().describe('只导出指定标识'),
        category: z.string().optional().describe('只导出指定分类'),
        includeClosed: z.boolean().optional().describe('是否包含已关闭条目，默认 false')
      })
    },
    async args => {
      const manifest = await services.skillAsset.exportForTarget(args);
      return asText(manifest);
    }
  );

  mcpServer.registerTool(
    'create_skill',
    {
      description: '新建一条技能或规则（type=rule|skill）。name 在同一 type 下唯一。',
      inputSchema: z.object({
        type: z.enum(['rule', 'skill']).optional().describe('默认 skill'),
        name: z.string().describe('唯一标识（rule 文件名 / skill 目录名）'),
        title: z.string().optional().describe('标题'),
        description: z.string().optional().describe('描述'),
        category: z.string().optional().describe('business | library | process'),
        content: z.string().optional().describe('Markdown 正文'),
        keywords: z.array(z.string()).optional().describe('关键词'),
        globs: z.array(z.string()).optional().describe('仅 rule 生效'),
        alwaysApply: z.boolean().optional().describe('仅 rule 生效'),
        source: z.string().optional().describe('来源标记，如 cursor-setting')
      })
    },
    async args => {
      const row = await services.skillAsset.create(Object.assign({}, args, { userId }));
      return asText({ action: 'created', id: row.id, type: row.type, name: row.name });
    }
  );

  mcpServer.registerTool(
    'update_skill',
    {
      description: '按 id 更新技能/规则的字段（type 与 name 不可修改）。',
      inputSchema: z.object({
        id: z.string().describe('记录 id'),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        content: z.string().optional().describe('Markdown 正文'),
        keywords: z.array(z.string()).optional(),
        globs: z.array(z.string()).optional(),
        alwaysApply: z.boolean().optional(),
        status: z.enum(['active', 'closed']).optional(),
        source: z.string().optional()
      })
    },
    async ({ id, ...patch }) => {
      const row = await services.skillAsset.update(Object.assign({}, patch, { id }));
      return asText({ action: 'updated', id: row.id, type: row.type, name: row.name });
    }
  );

  mcpServer.registerTool(
    'delete_skill',
    {
      description: '按 id 删除技能/规则。',
      inputSchema: z.object({
        id: z.string().describe('记录 id')
      })
    },
    async ({ id }) => {
      const result = await services.skillAsset.remove({ id });
      return asText(result);
    }
  );
};

module.exports = { registerSkillTools };
