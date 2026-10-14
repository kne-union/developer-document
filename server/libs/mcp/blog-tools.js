const z = require('zod/v4');

const MAX_TEXT = 30000;
const GROUP_TYPE = 'blog';

const toText = value => {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n...（已截断，共 ${text.length} 字符）` : text;
};

const plain = row => (row && typeof row.get === 'function' ? row.get({ plain: true }) : row);

const pickBlog = (row, { withContent = false } = {}) => {
  const blog = plain(row);
  if (!blog) {
    return null;
  }
  const { content, createdUser, ...rest } = blog;
  return Object.assign(
    {
      id: String(rest.id),
      title: rest.title,
      status: rest.status,
      isPublic: rest.isPublic,
      groups: (rest.groups || []).map(({ code, name }) => ({ code, name })),
      publishTime: rest.publishTime || null,
      createdAt: rest.createdAt,
      updatedAt: rest.updatedAt,
      author: createdUser ? createdUser.email || createdUser.phone || String(createdUser.id) : null
    },
    withContent ? { content: content || '' } : { contentLength: (content || '').length }
  );
};

/**
 * 博客编写与发布工具：与后台博客管理同权限（管理员），调用方须在注册前确认。
 */
const registerBlogTools = (mcpServer, { fastify, services, userId }) => {
  const run = handler => async args => {
    try {
      return { content: [{ type: 'text', text: toText(await handler(args)) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: e.message || String(e) }], isError: true };
    }
  };

  const register = (name, description, shape, handler) => mcpServer.registerTool(name, { description, inputSchema: z.object(shape) }, run(handler));

  const loadGroups = async () => (await fastify.group.services.groupList({ type: GROUP_TYPE, output: 'list' })).map(plain);

  const resolveGroups = async codes => {
    if (codes === undefined) {
      return undefined;
    }
    const all = await loadGroups();
    const missing = codes.filter(code => !all.some(group => group.code === code));
    if (missing.length) {
      throw new Error(`分组不存在：${missing.join('、')}，先用 list_blog_groups 查看或 save_blog_group 新建`);
    }
    return codes.map(code => {
      const { id, name } = all.find(group => group.code === code);
      return { id, code, name };
    });
  };

  const getBlog = async id => {
    const blog = await services.blog.detail({ id });
    if (!blog) {
      throw new Error('博客不存在');
    }
    return blog;
  };

  const blogId = z.string().describe('博客 id');
  const contentArg = z.string().describe('正文 HTML（后台富文本编辑器格式，Markdown 不会被渲染）');
  const groupsArg = z.array(z.string()).describe('分组 code 列表，来自 list_blog_groups');
  const publishTimeArg = z.string().describe('发布时间 ISO 8601，如 2026-10-14T10:00:00+08:00');

  register('list_blog_groups', '列出博客分组（code、名称、父级），用于 create_blog / update_blog 的 groups 与 list_blogs 的 group 过滤', {}, async () =>
    (await loadGroups()).map(({ id, code, name, parentId, description }) => ({ id: String(id), code, name, parentId: parentId ? String(parentId) : null, description: description || null }))
  );

  register(
    'save_blog_group',
    '新建或修改博客分组：传 id 为修改，不传为新建（code 不传自动生成）',
    {
      id: z.string().optional(),
      name: z.string(),
      code: z.string().optional().describe('仅新建时生效'),
      parentId: z.string().optional().describe('父分组 id，不传为根分组'),
      description: z.string().optional()
    },
    async args => {
      const data = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
      const group = plain(await fastify.group.services.save({ ...data, type: GROUP_TYPE }));
      return { id: String(group.id), code: group.code, name: group.name, parentId: group.parentId ? String(group.parentId) : null };
    }
  );

  register(
    'list_blogs',
    '列出博客（不含正文，看正文用 get_blog）：按关键字、状态、是否公开、分组过滤，按创建时间倒序',
    {
      keyword: z.string().optional().describe('匹配标题与正文'),
      status: z.enum(['draft', 'published']).optional(),
      isPublic: z.boolean().optional(),
      group: z.string().optional().describe('分组 code，含子分组'),
      perPage: z.number().optional().describe('默认 20'),
      currentPage: z.number().optional()
    },
    async ({ keyword, status, isPublic, group, perPage = 20, currentPage = 1 }) => {
      const { totalCount, pageData } = await services.blog.list({ keyword, status, isPublic, group, perPage, currentPage });
      return { totalCount, pageData: pageData.map(row => pickBlog(row)) };
    }
  );

  register('get_blog', '博客详情（含正文 HTML）', { id: blogId }, async ({ id }) => pickBlog(await getBlog(id), { withContent: true }));

  register(
    'create_blog',
    '新建博客，默认草稿且不公开；status=published 时直接发布（publishTime 默认当前时间）',
    {
      title: z.string(),
      content: contentArg,
      groups: groupsArg.optional(),
      isPublic: z.boolean().optional().describe('默认 false'),
      status: z.enum(['draft', 'published']).optional().describe('默认 draft'),
      publishTime: publishTimeArg.optional()
    },
    async ({ title, content, groups = [], isPublic = false, status = 'draft', publishTime }) => {
      const blog = await services.blog.create({ id: userId }, { title, content, groups: await resolveGroups(groups), isPublic, status, publishTime: status === 'published' ? publishTime || new Date() : publishTime });
      return pickBlog(blog);
    }
  );

  register(
    'update_blog',
    '修改博客：只改传入的字段；groups 传入时整体替换。发布状态请用 publish_blog / unpublish_blog',
    { id: blogId, title: z.string().optional(), content: contentArg.optional(), groups: groupsArg.optional(), isPublic: z.boolean().optional(), publishTime: publishTimeArg.optional() },
    async ({ id, title, content, groups, isPublic, publishTime }) => {
      const current = plain(await getBlog(id));
      const nextGroups = await resolveGroups(groups);
      const blog = await services.blog.update({
        id,
        title: title ?? current.title,
        content: content ?? current.content,
        status: current.status,
        publishTime: publishTime ?? current.publishTime,
        isPublic: isPublic ?? current.isPublic,
        groups: nextGroups ?? current.groups
      });
      return pickBlog(blog);
    }
  );

  register(
    'publish_blog',
    '发布博客（状态改为 published）；前台公开列表只展示已发布且公开的博客，需要时同时传 isPublic=true',
    { id: blogId, publishTime: publishTimeArg.optional().describe('默认当前时间'), isPublic: z.boolean().optional() },
    async ({ id, publishTime, isPublic }) => {
      if (isPublic !== undefined) {
        await (await getBlog(id)).update({ isPublic });
      }
      return pickBlog(await services.blog.publish({ id, publishTime }));
    }
  );

  register('unpublish_blog', '取消发布：改回草稿并清空发布时间', { id: blogId }, async ({ id }) => pickBlog(await services.blog.unpublish({ id })));

  register('delete_blog', '删除博客（不可恢复）', { id: blogId }, async ({ id }) => {
    await services.blog.remove({ id });
    return { id, deleted: true };
  });
};

module.exports = registerBlogTools;
