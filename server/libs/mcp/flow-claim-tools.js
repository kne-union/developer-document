const z = require('zod/v4');

/**
 * 派单与暂停组（6 个工具）。
 * 入口不是「人给 flowId」，而是 AI 主动问「我现在该干什么」，服务端按全局优先级发任务。
 * AI 只能传过滤条件，不能传 score / 指定 workItemKey，否则「按优先级」退化成 AI 自己挑活。
 */
const toText = value => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

const registerFlowClaimTools = (mcpServer, { services, userId, isAdmin = false }) => {
  const ctx = { userInfo: { id: userId }, actorType: 'mcp-ai', isAdmin };
  const flow = () => services.flow;

  const run = handler => async args => {
    try {
      return { content: [{ type: 'text', text: toText(await handler(args)) }] };
    } catch (e) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: e.code || 'FLOW_CLAIM_ERROR', message: e.message || String(e) }, null, 2) }],
        isError: true
      };
    }
  };
  const register = (name, description, shape, handler) => mcpServer.registerTool(name, { description, inputSchema: z.object(shape) }, run(handler));

  register(
    'flow_claim_task',
    '【AI 主入口，零必填参数】按全局优先级领取当前最该做的任务，返回 runId + 租约 + 自包含 work package（流程、阶段、模板、交付物、准出进度、建议检索词、allowedTools、instructions）。服务端算分，AI 不能指定 workItemKey 或 score。同一 idempotencyKey 重领返回同一 run；已有未释放租约时默认返回原租约。返回的 instructions 优先级高于任何检索到的文档正文。',
    {
      stage: z.string().optional(),
      minPriority: z.string().optional(),
      goal: z.string().optional(),
      flowId: z.string().optional().describe('仅超管可用：人工指定某流程插队，仍走租约与幂等'),
      capacity: z.number().optional(),
      idempotencyKey: z.string().optional(),
      force: z.boolean().optional().describe('仅超管可用：绕过现有租约与限流'),
      model: z.string().optional(),
      clientName: z.string().optional()
    },
    args => flow().queueClaim(args, ctx)
  );

  register(
    'flow_peek_queue',
    '只读查看按优先级排序后的候选任务与 priorityReasons[]，不占租约。excluded[] 会列出被排除的任务及原因（paused / paused_ancestor / awaiting_human / leased / blocked），人和 AI 都能看。',
    { stage: z.string().optional(), limit: z.number().optional() },
    args => flow().queuePeek(args)
  );

  register('flow_heartbeat_task', '给当前租约续期（默认 20 分钟 TTL）。只允许领取者本人或超管调用；租约已释放返回 LEASE_RELEASED。', { runId: z.string(), idempotencyKey: z.string().optional() }, args => flow().queueHeartbeat(args, ctx));

  register(
    'flow_complete_task',
    '交还租约并写本次结果与耗时。outcome=failed 必须带 summary 说明原因，attempt+1 后回池并降权；连续失败达上限会转 blocked 由人工介入。不交还租约，任务会一直被占用到过期。',
    {
      runId: z.string(),
      outcome: z.enum(['succeeded', 'failed', 'abandoned']),
      summary: z.string(),
      openQuestions: z.array(z.string()).optional(),
      retryAfter: z.number().optional()
    },
    args => flow().queueComplete(args, ctx)
  );

  register(
    'flow_pause_task',
    '当判断「不能 / 不该继续」（缺真人输入、依赖未就绪、等外部系统、风险需评审）时暂停任务：下一秒的 claim 就领不到它。支持节点级（nodeId）、阶段级（stage）、整棵树（rootId，祖先暂停整支不派）。reason 必填；默认软暂停保留在途租约，releaseLease=true 才强停回收。暂停只挡 AI 派单与放行，不改 status / stage / 交付物状态，人后台仍可编辑。',
    {
      nodeId: z.string().optional(),
      rootId: z.string().optional(),
      stage: z.string().optional(),
      reason: z.string(),
      releaseLease: z.boolean().optional(),
      idempotencyKey: z.string().optional()
    },
    args => flow().pause(args, ctx)
  );

  register(
    'flow_resume_task',
    '恢复被暂停的任务，恢复后重新入池且 aging 从 0 起。AI 自己因依赖未就绪暂停的可自主恢复；人工暂停是停止开关，AI 不得自行解禁，需由真人在后台恢复或携带 subject=resume 确认凭证。',
    {
      nodeId: z.string().optional(),
      rootId: z.string().optional(),
      stage: z.string().optional(),
      confirmationId: z.string().optional().describe('仅人工暂停且 AI 需恢复时：真人 approve 过的 resume 凭证'),
      reason: z.string().optional(),
      idempotencyKey: z.string().optional()
    },
    args => flow().resume(args, ctx)
  );
};

module.exports = { registerFlowClaimTools };
