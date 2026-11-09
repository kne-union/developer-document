const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { fail, asId, plain, hashToken, makeEvent, normalizeEvidenceRefs } = require('../utils/flow-helpers');

const SUBJECTS = ['stage_complete', 'enter_next_stage', 'decompose', 'converge', 'waive', 'force', 'resume'];
const DECISIONS = ['approve', 'reject', 'changes_requested'];
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

/**
 * 确认单现在只是「AI 主动请求人工复核」的可选通道，不再是放行的前置闸门。
 * 正常主链路 AI 自主跑完 check → dryRun → release，人工在后台放行记录里撤回 / 打回。
 * 但既然 AI 主动发起了确认，就必须等真人回答，不能自己代签。
 */
const WAIT_INSTRUCTIONS = {
  optional: true,
  instructions: [
    '这是你主动发起的人工复核，不是放行的必填闸门；常规推进无需发起确认，AI 可自主放行。',
    'confirmUrl 只是查看凭证，可贴在回复里给真人看草案，但不含签字能力。',
    '签字链接已由服务端通过带外通道投递给签字人（FLOW_CONFIRM_DELIVERY_URL / 服务端日志），AI 不得索取，也不得自行 POST approve。',
    '真人也可登录后台确认中心直接签字。',
    '既然发起了复核，这一轮到此结束，明确告诉人「我等你确认」，不要假设已同意继续往下做。',
    '下一轮先调 flow_get_confirmation 读最终 humanEdits / finalChildren，approved 后可选择带着 confirmationId 放行。'
  ]
};

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const expireOverdue = async () => {
    await models.flowConfirmation.update({ status: 'expired' }, { where: { status: 'pending', expiresAt: { [Op.lt]: new Date() } } });
  };

  /** 非管理员只能读写自己发起的确认单，避免读他人 proposal / 撤回他人凭证 */
  const assertConfirmationOwner = (row, request = {}) => {
    if (request?.isAdmin || request?.actorType === 'system') return;
    const uid = asId(request?.userInfo?.id || request?.user?.userId);
    if (!uid || asId(row.requestedBy) !== uid) throw fail('CONFIRMATION_FORBIDDEN', '无权读取他人发起的确认单');
  };

  /**
   * 查看凭证与签字凭证分离：
   *  - viewToken：AI 可读，只能打开确认页查看草案，不含签字能力；
   *  - answerToken：独立短码，明文只经带外通道投递给真人，库里仅存哈希。
   * 短码由 @kne/fastify-shorten 签发（自带过期校验），站点地址复用 OIDC 的 ORIGIN。
   */
  const originOf = () => (fastify.oidcOptions?.origin || '').replace(/\/$/, '');

  const issueViewToken = async row => {
    const viewToken = await fastify.shorten.services.sign(JSON.stringify({ c: asId(row.id), k: 'view' }), row.expiresAt);
    const confirmPath = `/flow-confirm/${encodeURIComponent(viewToken)}`;
    const origin = originOf();
    return { confirmPath, confirmUrl: origin ? `${origin}${confirmPath}` : confirmPath };
  };

  /** 签字凭证只走带外通道；未配置投递地址时仅写服务端日志，后台确认中心仍可由登录管理员签字 */
  const deliverAnswerToken = async ({ row, flow, viewUrl, request }) => {
    const signerUserId = asId(flow?.ownerUserId || request?.userInfo?.id || request?.user?.userId || null);
    const answerToken = await fastify.shorten.services.sign(JSON.stringify({ c: asId(row.id), k: 'answer', u: signerUserId }), row.expiresAt);
    await row.update({ answerTokenHash: hashToken(answerToken), answerTokenExpiresAt: row.expiresAt });
    const signUrl = `${viewUrl}${viewUrl.includes('?') ? '&' : '?'}a=${encodeURIComponent(answerToken)}`;
    const delivery = { confirmationId: asId(row.id), subject: row.subject, flowId: asId(row.flowId), signerUserId, signUrl, expiresAt: row.expiresAt };
    const webhook = process.env.FLOW_CONFIRM_DELIVERY_URL;
    if (webhook) {
      try {
        const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(delivery) });
        if (!response.ok) throw new Error(`delivery webhook ${response.status}`);
        return;
      } catch (e) {
        fastify.log.error({ err: String(e), confirmationId: delivery.confirmationId }, '签字链接带外投递失败，已回退到服务端日志');
      }
    }
    fastify.log.info({ flowConfirmDelivery: delivery }, '真人签字链接（带外通道未配置，仅服务端可见）');
  };

  /** 短码解析：decode 由 shorten 包校验存在性与过期，这里拆出确认单 id / 签字人 / 凭证类型 */
  const parseConfirmToken = async token => {
    let payload;
    try {
      payload = JSON.parse(await fastify.shorten.services.decode(token));
    } catch (e) {
      throw fail('INVALID_CONFIRM_TOKEN', '确认链接无效或已过期，请让 AI 重新发起确认');
    }
    if (!payload?.c) throw fail('INVALID_CONFIRM_TOKEN', '确认链接内容损坏');
    return { confirmationId: asId(payload.c), userId: asId(payload.u || null), kind: payload.k || 'legacy' };
  };

  /**
   * AI 发起确认。同一 flowId + nodeId + stage + subject 只允许一条 pending，重复发起返回原凭证。
   */
  const request = async (params = {}, request = {}) => {
    const { runId, subject, proposal = {}, questions = [], expiresIn, supersedeConfirmationId, changeNote, flowId: inputFlowId, nodeId, stage } = params;
    if (!SUBJECTS.includes(subject)) throw fail('INVALID_SUBJECT', `subject 必须是 ${SUBJECTS.join(' / ')}`);

    let run = null;
    if (runId) {
      run = await models.flowAiRun.findByPk(runId);
      if (!run) throw fail('RUN_NOT_FOUND', 'run 不存在');
    }
    const flowId = asId(inputFlowId || nodeId || run?.flowId);
    if (!flowId) throw fail('FLOW_ID_REQUIRED', '缺少 flowId');
    const flow = await models.flow.findByPk(flowId);
    if (!flow) throw fail('FLOW_NOT_FOUND', '流程不存在');
    if (flow.pausedAt && subject !== 'resume') throw fail('NODE_PAUSED', '节点已暂停，请先恢复后再发起确认');

    await expireOverdue();

    // 改稿：旧版置 superseded，生成 v(N+1)
    let previous = null;
    if (supersedeConfirmationId) {
      previous = await models.flowConfirmation.findByPk(supersedeConfirmationId);
      if (!previous) throw fail('CONFIRMATION_NOT_FOUND', '被替代的确认不存在');
      if (asId(previous.nodeId || previous.flowId) !== flowId) throw fail('CONFIRMATION_MISMATCH', '改稿凭证不属于该节点');
      if (previous.subject !== subject) throw fail('CONFIRMATION_MISMATCH', '改稿凭证主题不一致');
    }

    const existing = await models.flowConfirmation.findOne({
      where: { flowId, nodeId: flowId, stage: stage || flow.stage, subject, status: 'pending' }
    });
    if (existing && !supersedeConfirmationId) {
      // 重复发起只重签「查看凭证」；签字凭证不重新签发，避免覆盖 answerTokenHash 让已投递的链接失效
      const link = await issueViewToken(existing);
      return { confirmationId: asId(existing.id), status: existing.status, reused: true, subject: existing.subject, expiresAt: existing.expiresAt, ...link, ...WAIT_INSTRUCTIONS };
    }
    if (existing) {
      await existing.update({ status: 'superseded', supersededById: null });
    }

    // expiresIn 限定 5 分钟 ~ 24 小时，禁止负数或超长有效期
    const ttlSeconds = expiresIn === undefined || expiresIn === null ? DEFAULT_TTL / 1000 : Math.min(Math.max(Number(expiresIn) || 0, 300), 24 * 60 * 60);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const row = await models.flowConfirmation.create({
      flowId,
      nodeId: flowId,
      stage: stage || flow.stage,
      runId: runId ? asId(runId) : null,
      subject,
      proposal: {
        ...proposal,
        ...(changeNote ? { changeNote } : {}),
        ...(previous ? { supersedesId: asId(previous.id) } : {})
      },
      questions,
      status: 'pending',
      proposalVersion: previous ? Number(previous.proposalVersion || 1) + 1 : 1,
      supersedesId: previous ? asId(previous.id) : null,
      requestedByType: request?.actorType === 'human' ? 'human' : 'ai',
      requestedBy: asId(request?.userInfo?.id || request?.user?.userId || run?.actorUserId),
      expiresAt,
      createdUserId: asId(request?.userInfo?.id || request?.user?.userId || run?.actorUserId)
    });
    if (previous) {
      await previous.update({ status: 'superseded', supersededById: asId(row.id) });
    }

    const link = await issueViewToken(row);
    await deliverAnswerToken({ row, flow, viewUrl: link.confirmUrl, request });
    if (run) {
      // decompose 草案出稿后停在 awaiting_human：出池、不占租约
      if (subject === 'decompose') {
        await run.update({
          status: 'awaiting_human',
          active: null,
          events: [...(run.events || []), makeEvent({ tool: 'flow_propose_decomposition', action: 'awaiting_human', target: row.id, result: 'pending', actorUserId: run.actorUserId, extra: { confirmationId: asId(row.id) } })]
        });
      } else {
        await run.update({ events: [...(run.events || []), makeEvent({ tool: 'flow_request_confirmation', action: 'request', target: row.id, result: 'pending', actorUserId: run.actorUserId })] });
      }
    }

    return {
      confirmationId: asId(row.id),
      status: row.status,
      subject,
      proposalVersion: row.proposalVersion,
      expiresAt,
      ...link,
      treePreview: proposal.treePreview || null,
      ...WAIT_INSTRUCTIONS
    };
  };

  const get = async ({ confirmationId }, request = {}) => {
    const row = await models.flowConfirmation.findByPk(confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    assertConfirmationOwner(row, request);
    if (row.status === 'pending' && row.expiresAt < new Date()) {
      await row.update({ status: 'expired' });
    }
    const data = plain(row);
    return {
      ...data,
      id: asId(data.id),
      finalChildren: data.proposal?.finalChildren || data.proposal?.children || [],
      humanEdits: data.proposal?.humanEdits || null,
      confirmToken: null,
      answerTokenHash: null
    };
  };

  const listMine = async ({ runId, status, requestedBy } = {}, request = {}) => {
    await expireOverdue();
    const actorId = asId(request?.userInfo?.id || request?.user?.userId);
    // 非管理员强制按调用者过滤，忽略外部传入的 requestedBy，杜绝列出全库确认单
    const ownerId = request?.isAdmin && requestedBy ? asId(requestedBy) : actorId;
    if (!ownerId) throw fail('CONFIRMATION_FORBIDDEN', '缺少发起人身份，无法列出确认单');
    const where = { requestedBy: ownerId };
    if (runId) where.runId = runId;
    if (status) where.status = status;
    const rows = await models.flowConfirmation.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    return { totalCount: rows.length, pageData: rows.map(row => ({ ...plain(row), id: asId(row.id), answerTokenHash: null })) };
  };

  const list = async ({ status, nodeId, perPage = 20, currentPage = 1 } = {}) => {
    await expireOverdue();
    const where = {};
    if (status) where.status = status;
    if (nodeId) where.nodeId = nodeId;
    const { count, rows } = await models.flowConfirmation.findAndCountAll({
      where,
      limit: Number(perPage),
      offset: (Number(currentPage) - 1) * Number(perPage),
      order: [['createdAt', 'DESC']]
    });
    return { totalCount: count, pageData: rows.map(row => ({ ...plain(row), id: asId(row.id), answerTokenHash: null })) };
  };

  const cancel = async ({ confirmationId, reason }, request = {}) => {
    const row = await models.flowConfirmation.findByPk(confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    assertConfirmationOwner(row, request);
    if (row.status !== 'pending') throw fail('CONFIRMATION_DECIDED', '该确认已被处理，不能撤回');
    await row.update({ status: 'cancelled', comment: reason || 'AI 主动撤回' });
    return { confirmationId: asId(row.id), status: 'cancelled', reason, requestedBy: asId(row.requestedBy) };
  };

  /**
   * 三个 surface（adminAuth / magic_link / IM 卡片）共用的唯一状态机入口。
   * decidedBy 只能由验签通道传入，MCP 工具没有写它的路径。
   */
  const answer = async ({ id, decision, answers = [], comment, surface = 'admin_center', finalChildren, humanEdits, decidedBy, signature }, request = {}) => {
    if (!DECISIONS.includes(decision)) throw fail('INVALID_DECISION', `decision 必须是 ${DECISIONS.join(' / ')}`);
    if ((decision === 'reject' || decision === 'changes_requested') && !comment) {
      throw fail('COMMENT_REQUIRED', '驳回 / 要求修改必须填写意见');
    }
    const row = await models.flowConfirmation.findByPk(id);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    if (row.status !== 'pending') throw fail('CONFIRMATION_DECIDED', `该确认已被处理（${row.status}），不能重复回答`);
    if (row.expiresAt < new Date()) {
      await row.update({ status: 'expired' });
      throw fail('CONFIRMATION_EXPIRED', '确认已过期，请让 AI 重新发起');
    }
    const humanId = asId(decidedBy || request?.userInfo?.id || request?.user?.userId);
    if (!humanId || humanId === '0') throw fail('DECIDED_BY_REQUIRED', '缺少真人签字人身份');

    const proposal = { ...(row.proposal || {}) };
    if (signature) proposal._signature = signature;
    if (finalChildren) proposal.finalChildren = finalChildren;
    if (humanEdits) {
      proposal.humanEdits = humanEdits;
      proposal.editedByHuman = true;
      if (!proposal.finalChildren) proposal.finalChildren = finalChildren || proposal.children || [];
    }
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested';
    await row.update({
      status,
      proposal,
      questions: (row.questions || []).map(q => ({ ...q, answer: answers?.find(a => a.key === q.key)?.answer ?? q.answer ?? null })),
      comment: comment || null,
      decidedBy: humanId,
      decidedAt: new Date(),
      surface
    });
    return { confirmationId: asId(row.id), status, decidedBy: humanId, decidedAt: row.decidedAt, surface, signature: proposal._signature || null, finalChildren: proposal.finalChildren || null };
  };

  /** 短链页读取（免登录，只需查看凭证），不返回后台任何列表数据，也不返回签字凭证 */
  const getByToken = async ({ token }) => {
    const parsed = await parseConfirmToken(token);
    if (parsed.kind !== 'view') throw fail('INVALID_CONFIRM_TOKEN', '该链接不是确认页查看凭证');
    const row = await models.flowConfirmation.findByPk(parsed.confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    if (row.status === 'pending' && row.expiresAt < new Date()) {
      await row.update({ status: 'expired' });
    }
    const node = await models.flow.findByPk(row.nodeId || row.flowId);
    const children = await models.flow.findAll({ where: { parentId: row.nodeId || row.flowId }, order: [['orderIndex', 'ASC']] });
    const { _signature, ...safeProposal } = row.proposal || {};
    return {
      confirmationId: asId(row.id),
      subject: row.subject,
      status: row.status,
      nodeTitle: node?.title || '',
      treeDiff: {
        current: children.map(item => ({ id: asId(item.id), title: item.title, nodeType: item.nodeType, stage: item.stage })),
        adding: row.proposal?.finalChildren || row.proposal?.children || []
      },
      questions: row.questions || [],
      proposal: safeProposal,
      proposalComment: safeProposal.changeNote || null,
      expiresAt: row.expiresAt,
      decidedBy: row.decidedBy ? asId(row.decidedBy) : null,
      decidedAt: row.decidedAt || null,
      comment: row.comment || null,
      surface: row.surface || null,
      signature: _signature || null,
      canSign: false
    };
  };

  /**
   * 短链页提交决策。签字凭证（answerToken）经带外通道投递，AI 只持有查看凭证，
   * 因此「AI 拿自己收到的 confirmUrl 直接 approve」在服务端被拒绝。
   * 兼容通道：FLOW_CONFIRM_ALLOW_ASSISTED=true 时允许显式声明的授权代签，必须带 authorizationRef，
   * 并在确认单里留下 mode=agent_assisted 的审计签名，便于区分真人独立签字与 AI 代签。
   */
  const answerByToken = async ({ token, answerToken, assisted = false, authorizationRef, decision, answers, comment, finalChildren, humanEdits }) => {
    const view = await parseConfirmToken(token);
    if (view.kind !== 'view') throw fail('INVALID_CONFIRM_TOKEN', '该链接不是确认页查看凭证');
    const row = await models.flowConfirmation.findByPk(view.confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');

    let humanId;
    let signature;
    if (assisted) {
      if (process.env.FLOW_CONFIRM_ALLOW_ASSISTED !== 'true') {
        throw fail('AGENT_ASSISTED_FORBIDDEN', 'AI 代签已禁用，请由真人在后台确认中心或带外签字链接完成确认');
      }
      if (!authorizationRef || typeof authorizationRef !== 'string' || !authorizationRef.trim()) {
        throw fail('AUTHORIZATION_REF_REQUIRED', 'AI 代签必须提供 authorizationRef（用户授权消息 id 或授权记录）');
      }
      humanId = asId(view.userId || row.requestedBy);
      signature = { mode: 'agent_assisted', authorizationRef: authorizationRef.trim(), signerUserId: humanId, actorUserId: asId(row.requestedBy) };
    } else {
      if (!answerToken) throw fail('ANSWER_TOKEN_REQUIRED', '缺少真人签字凭证，请从带外通道（IM / 邮件 / 服务端投递）获取签字链接');
      if (hashToken(answerToken) !== row.answerTokenHash) throw fail('INVALID_CONFIRM_TOKEN', '签字凭证已被替换或失效');
      if (row.answerTokenExpiresAt && new Date(row.answerTokenExpiresAt) < new Date()) throw fail('CONFIRMATION_EXPIRED', '签字凭证已过期');
      const parsed = await parseConfirmToken(answerToken);
      if (parsed.kind !== 'answer' || asId(parsed.confirmationId) !== asId(row.id)) throw fail('INVALID_CONFIRM_TOKEN', '签字凭证与确认单不匹配');
      humanId = asId(parsed.userId);
      if (!humanId || humanId === '0') throw fail('DECIDED_BY_REQUIRED', '缺少真人签字人身份');
      if (asId(row.requestedBy) && humanId === asId(row.requestedBy)) {
        throw fail('DECIDED_BY_SAME_AS_REQUESTER', '签字人不得与确认发起人相同，请由真人独立签字');
      }
      signature = { mode: 'human', signerUserId: humanId, surface: 'magic_link' };
    }
    return answer({ id: asId(row.id), decision, answers, comment, finalChildren, humanEdits, surface: 'magic_link', decidedBy: humanId, signature });
  };

  /**
   * 后台管理员直接流转 / 审核时，由服务端生成一条已批准的 admin_center 审计凭证，
   * 与 MCP 放行共用同一套留痕口径，但不需要 AI 的确认单。
   */
  const recordAdminDecision = async ({ flowId, stage, subject, releaseId, actorId, transaction: tx }) => {
    const now = new Date();
    return models.flowConfirmation.create(
      {
        flowId,
        nodeId: flowId,
        stage,
        subject,
        proposal: { summary: '后台管理员直接操作（服务端自动生成的审计凭证）' },
        questions: [],
        status: 'approved',
        requestedByType: 'human',
        requestedBy: actorId || null,
        decidedBy: actorId || null,
        decidedAt: now,
        surface: 'admin_center',
        expiresAt: new Date(now.getTime() + DEFAULT_TTL),
        usedAt: now,
        usedByReleaseId: releaseId || null,
        createdUserId: actorId || null
      },
      { transaction: tx }
    );
  };

  /** 放行 / 落树消费凭证：一次性，条件更新 + 事务内执行，杜绝并发双花 */
  const consume = async ({ confirmationId, flowId, nodeId, stage, subject, releaseId, transaction: tx }) => {
    if (!confirmationId) throw fail('CONFIRMATION_REQUIRED', '缺少真人确认凭证 confirmationId');
    const row = await models.flowConfirmation.findByPk(confirmationId, { transaction: tx });
    if (!row) throw fail('INVALID_CONFIRMATION', '确认凭证不存在');
    if (row.status !== 'approved') throw fail('INVALID_CONFIRMATION', `确认未批准（${row.status}），必须先由真人 approve`);
    if (row.requestedByType !== 'ai' && subject === 'decompose') throw fail('INVALID_CONFIRMATION', '裂变凭证必须由 AI 发起');
    if (!SUBJECTS.includes(subject)) throw fail('INVALID_SUBJECT', '未知的确认主题');
    if (row.subject !== subject) {
      // 阶段完成与进入下一阶段两种确认主题互认，其余严格匹配
      const allowTransition = ['stage_complete', 'enter_next_stage'].includes(subject) && ['stage_complete', 'enter_next_stage'].includes(row.subject);
      if (!allowTransition) throw fail('INVALID_CONFIRMATION', `确认主题不匹配：需要 ${subject}，实际 ${row.subject}`);
    }
    if (asId(row.nodeId || row.flowId) !== asId(nodeId || flowId)) throw fail('INVALID_CONFIRMATION', '确认凭证不属于该节点');
    if (stage && row.stage && row.stage !== stage) throw fail('INVALID_CONFIRMATION', '确认凭证不属于该阶段');
    if (row.usedAt) throw fail('CONFIRMATION_USED', '该确认凭证已被消费，一次确认只能放行一个动作');
    if (row.expiresAt < new Date()) throw fail('CONFIRMATION_EXPIRED', '确认凭证已过期');
    // 核验类放行要求结构化、可定位的原始证据；裸文本（如「已核验」）一律拒绝
    if (['stage_complete', 'enter_next_stage', 'waive', 'force'].includes(subject)) {
      const refs = normalizeEvidenceRefs(row.proposal?.evidenceRefs);
      const proposal = row.proposal || {};
      if (proposal.flowId && asId(proposal.flowId) !== asId(nodeId || flowId)) {
        throw fail('EVIDENCE_SCOPE_MISMATCH', '证据引用不属于本次放行的流程');
      }
      if (proposal.runId && row.runId && asId(proposal.runId) !== asId(row.runId)) {
        throw fail('EVIDENCE_SCOPE_MISMATCH', '证据引用不属于本次放行的 AI run');
      }
      const fileRecord = fastify.fileManager?.services?.fileRecord;
      for (const ref of refs.filter(item => item.type === 'file')) {
        if (typeof fileRecord?.getFileInstance !== 'function') {
          if (process.env.FLOW_ALLOW_MISSING_FILE_SERVICE !== 'true') {
            throw fail('FILE_SERVICE_UNAVAILABLE', '文件服务未挂载，无法校验证据文件引用');
          }
          continue;
        }
        try {
          await fileRecord.getFileInstance({ id: ref.ref });
        } catch (e) {
          throw fail('INVALID_EVIDENCE_REF', `证据引用的文件不存在：${ref.ref}`);
        }
      }
    }
    const [affected] = await models.flowConfirmation.update({ usedAt: new Date(), usedByReleaseId: releaseId || null }, { where: { id: row.id, status: 'approved', usedAt: null }, transaction: tx });
    if (affected !== 1) throw fail('CONFIRMATION_USED', '该确认凭证已被消费，一次确认只能放行一个动作');
    return row;
  };

  Object.assign(services, {
    flowConfirmation: { request, get, list, listMine, cancel, answer, getByToken, answerByToken, consume, recordAdminDecision, expireOverdue, SUBJECTS }
  });
});
