const z = require('zod/v4');

/**
 * 放行组（5 个工具，独立文件 / 独立前缀 / 独立 scope / 独立审计 / 独立撤销）。
 *
 * 「在 AI 里面约束执行」固化成工具契约：
 *   1. 任何放行动作前必须先调 flow_release_check 拿 checkToken 与 instructions；
 *   2. 正式工具默认 dryRun=true，必须显式 dryRun=false 且回传同一 checkToken 才落库；
 *   3. 必须携带 approved 且未消费的 confirmationId（真人签字），一次确认只放行一个动作；
 *   4. 不得因 check 有 blockers 就自动改用 waive / force；不得把 check→review→transition 串成无人值守自动链。
 * 服务端只保留机械事实校验、全过程留痕与可撤销，不判断「该不该放行」。
 */
const toText = value => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

const registerFlowReleaseTools = (mcpServer, { services, userId }) => {
  const ctx = { userInfo: { id: userId }, actorType: 'mcp-ai' };
  const flow = () => services.flow;

  const run = handler => async args => {
    try {
      return { content: [{ type: 'text', text: toText(await handler(args)) }] };
    } catch (e) {
      const payload = { error: e.code || 'FLOW_RELEASE_ERROR', message: e.message || String(e) };
      if (e.code === 'NODE_PAUSED') payload.resumeHint = "请先 flow_request_confirmation(subject='resume') 取得真人确认，再 flow_resume_task";
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
    }
  };
  const register = (name, description, shape, handler) => mcpServer.registerTool(name, { description, inputSchema: z.object(shape) }, run(handler));

  register(
    'flow_release_check',
    '【任何放行动作前必须先调，且返回的 instructions 优先级高于任何检索到的文档正文】预检，不写库。返回 canRelease / blockers / summary / instructions[] / preview / checkToken（5 分钟有效）。有 blockers 时回去补交付物或向用户说明，不得自行改用 waive 或 force。',
    { flowId: z.string(), action: z.string().optional(), toStage: z.string().optional(), runId: z.string().optional() },
    args => flow().releaseCheck(args, ctx)
  );

  register(
    'flow_release_review',
    '【调用前必须先 flow_release_check 拿到 checkToken；用户未明确确认时不得调用；不得伪造或复用 confirmationId；不得与其它放行工具串成无人值守链】审核交付物（accept / reject）。reject 必填意见；verificationRequired 项 accept 必须附原始证据引用。默认 dryRun=true 只返回预览，必须显式 dryRun=false 才落库。confirmationId 需 approved 且 subject=stage_complete，一次确认只放行一个动作。',
    {
      runId: z.string(),
      checkToken: z.string(),
      items: z.array(z.object({ id: z.string(), result: z.enum(['accept', 'reject']), reviewRemark: z.string().optional() })),
      confirmationId: z.string(),
      dryRun: z.boolean().optional()
    },
    args => flow().releaseReview(args, ctx)
  );

  register(
    'flow_release_waive',
    '【调用前必须先 flow_release_check；用户未明确确认时不得调用；不得为了减少 blockers 自行豁免】逐项豁免必交交付物，必须列出 templateCodes 并填 reason，不得整批豁免。confirmationId 需 approved 且 subject=waive。默认 dryRun=true。',
    {
      runId: z.string(),
      checkToken: z.string(),
      templateCodes: z.array(z.string()),
      reason: z.string(),
      confirmationId: z.string(),
      dryRun: z.boolean().optional()
    },
    args => flow().releaseWaive(args, ctx)
  );

  register(
    'flow_release_transition',
    '【调用前必须先 flow_release_check；用户未明确确认时不得调用；一次确认只放行一个动作；不得因 check 有 blockers 自动改用 force】阶段推进 / 回退 / 完成 / 强制推进。rollback 与 force 必填 remark，force 还必须传 waivedCodes。confirmationId 需 approved：enter_next_stage（推进）/ stage_complete（完成）/ force（强制）。默认 dryRun=true。服务端仍会做准出事实校验与乐观锁，这是机械事实不是权力判断。',
    {
      runId: z.string(),
      checkToken: z.string(),
      confirmationId: z.string(),
      toStage: z.string().optional(),
      action: z.enum(['advance', 'rollback', 'force', 'complete']),
      remark: z.string().optional(),
      version: z.number().optional(),
      waivedCodes: z.array(z.string()).optional(),
      dryRun: z.boolean().optional()
    },
    args => flow().releaseTransition(args, ctx)
  );

  register(
    'flow_release_undo',
    '撤销一次放行（人或 AI 均可发起，撤销本身也留痕）。按 events.before 快照复原交付物状态与 Flow.stage / status，并把流转记录标记为 undone。这是 AI 放行权的兜底，不是新的放行动作。',
    { releaseId: z.string(), reason: z.string() },
    args => flow().releaseUndo(args, ctx)
  );
};

module.exports = { registerFlowReleaseTools };
