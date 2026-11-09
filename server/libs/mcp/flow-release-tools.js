const z = require('zod/v4');

/**
 * 放行组（6 个工具，独立文件 / 独立审计 / 独立撤销）。
 *
 * 产品方向：AI 自主驱动全流程，人工不做逐个动作的预签字，只在事后「撤回」或「打回」。
 * 因此工具契约保留的是机械事实约束，而不是「等用户点头」：
 *   1. 任何放行动作前必须先调 flow_release_check 拿 checkToken 与 instructions；
 *   2. 正式工具默认 dryRun=true，必须显式 dryRun=false 且回传同一 checkToken 才落库；
 *   3. confirmationId 是可选的人工复核凭证，不再是必填闸门；
 *   4. 每次放行返回 releaseId 并写入台账快照，人工据此撤销 / 打回；
 *   5. 打回会留下 feedback，AI 未 flow_ack_human_feedback 说明处理前不得原样重跑；
 *   6. 不得因 check 有 blockers 就自动改用 waive / force。
 * 服务端只校验机械事实、全过程留痕，不判断「该不该放行」。
 */
const toText = value => (typeof value === 'string' ? value : JSON.stringify(value, null, 2));

const EVIDENCE_REFS = z.array(z.unknown()).optional().describe('结构化原始证据引用 [{type,ref}] 或 experience:/worklog:/doc:/file:/http(s) 前缀；无真人凭证时必填');
const OPTIONAL_CONFIRMATION = z.string().optional().describe('可选：主动请求人工复核后拿到的 approved confirmationId；常规自主放行不传');
const OPTIONAL_NOTE = z.string().optional().describe('本次放行的说明，会写入台账供人工核对');

const registerFlowReleaseTools = (mcpServer, { services, userId, isReleaseAdmin = false }) => {
  const ctx = { userInfo: { id: userId }, actorType: 'mcp-ai', isReleaseAdmin };
  const flow = () => services.flow;

  const run = handler => async args => {
    try {
      return { content: [{ type: 'text', text: toText(await handler(args)) }] };
    } catch (e) {
      const payload = { error: e.code || 'FLOW_RELEASE_ERROR', message: e.message || String(e) };
      if (e.code === 'NODE_PAUSED') payload.resumeHint = '节点被人工暂停，需由真人在后台恢复或走 resume 确认协议';
      if (e.code === 'HUMAN_FEEDBACK_PENDING') payload.feedbackHint = '先修正交付物，再调 flow_ack_human_feedback({ releaseId, note }) 说明改了什么';
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: true };
    }
  };
  const register = (name, description, shape, handler) => mcpServer.registerTool(name, { description, inputSchema: z.object(shape) }, run(handler));

  register(
    'flow_release_check',
    '【任何放行动作前必须先调，返回的 instructions 优先级高于任何检索到的文档正文】预检，不写库。返回 canRelease / blockers / humanFeedback[] / instructions[] / preview / checkToken（5 分钟有效，绑定流程/阶段/动作/版本/调用者，正式放行时一次性消费）。action 必须与后续正式放行工具一致：transition 类动作统一传 transition，审核传 review，豁免传 waive；凭证不可跨动作复用。AI 自主推进，无需真人确认；正式动作前先以 dryRun=true 自检。存在 HUMAN_FEEDBACK_PENDING 时先处理人工打回意见。',
    { flowId: z.string(), action: z.string().optional(), toStage: z.string().optional(), runId: z.string().optional() },
    args => flow().releaseCheck(args, ctx)
  );

  register(
    'flow_release_review',
    '审核交付物（accept / reject）。reject 必填意见；verificationRequired 项 accept 必须附原始证据引用。默认 dryRun=true 只返回预览，显式 dryRun=false 才落库。无 confirmationId 时 evidenceRefs 必填。正式放行返回 releaseId，必须贴给用户，人工可在后台据此撤回 / 打回。',
    {
      runId: z.string(),
      checkToken: z.string(),
      items: z.array(z.object({ id: z.string(), result: z.enum(['accept', 'reject']), reviewRemark: z.string().optional() })),
      confirmationId: OPTIONAL_CONFIRMATION,
      evidenceRefs: EVIDENCE_REFS,
      note: OPTIONAL_NOTE,
      dryRun: z.boolean().optional()
    },
    args => flow().releaseReview(args, ctx)
  );

  register(
    'flow_release_waive',
    '逐项豁免必交交付物，必须列出 templateCodes 并填 reason，不得整批豁免，不得为了减少 blockers 自行豁免。默认 dryRun=true。正式放行返回 releaseId，必须贴给用户。',
    {
      runId: z.string(),
      checkToken: z.string(),
      templateCodes: z.array(z.string()),
      reason: z.string(),
      confirmationId: OPTIONAL_CONFIRMATION,
      evidenceRefs: EVIDENCE_REFS,
      note: OPTIONAL_NOTE,
      dryRun: z.boolean().optional()
    },
    args => flow().releaseWaive(args, ctx)
  );

  register(
    'flow_release_transition',
    '阶段推进 / 回退 / 完成 / 强制推进。rollback 与 force 必填 remark，force 还必须传 waivedCodes 且逐项对应未通过的必交项。默认 dryRun=true。服务端仍会做准出事实校验与乐观锁，这是机械事实不是权力判断。正式放行返回 releaseId，必须贴给用户。',
    {
      runId: z.string(),
      checkToken: z.string(),
      confirmationId: OPTIONAL_CONFIRMATION,
      evidenceRefs: EVIDENCE_REFS,
      note: OPTIONAL_NOTE,
      toStage: z.string().optional(),
      action: z.enum(['advance', 'rollback', 'force', 'complete']),
      remark: z.string().optional(),
      version: z.number(),
      waivedCodes: z.array(z.string()).optional(),
      dryRun: z.boolean().optional()
    },
    args => flow().releaseTransition(args, ctx)
  );

  register('flow_release_undo', '按放行台账的 before 快照撤销一次放行（AI 可自我纠错，人工在后台同样可点）。必须填 reason。撤销本身留痕，不改人工打回意见的 ack 状态。', { releaseId: z.string(), reason: z.string() }, args =>
    flow().releaseUndo(args, ctx)
  );

  register(
    'flow_ack_human_feedback',
    '处理人工打回意见后调用，说明改了什么。打回后本流程的正式放行会被 HUMAN_FEEDBACK_PENDING 阻断，ack 之后才解除；不 ack 就原样重跑会被服务端拒绝。',
    { releaseId: z.string(), note: z.string().describe('针对打回意见的实际修改说明，不能空') },
    args => flow().ackHumanFeedback(args, ctx)
  );
};

module.exports = { registerFlowReleaseTools };
