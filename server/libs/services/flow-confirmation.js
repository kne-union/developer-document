const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { fail, asId, plain, hashToken, makeEvent } = require('../utils/flow-helpers');

const SUBJECTS = ['stage_complete', 'enter_next_stage', 'decompose', 'converge', 'waive', 'force', 'resume'];
const DECISIONS = ['approve', 'reject', 'changes_requested'];
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const expireOverdue = async () => {
    await models.flowConfirmation.update({ status: 'expired' }, { where: { status: 'pending', expiresAt: { [Op.lt]: new Date() } } });
  };

  /**
   * 生成会话内一次性确认短链。短码由 @kne/fastify-shorten 签发（自带过期校验与去重），
   * 站点地址复用 OIDC 已有的 ORIGIN（resolveOidcOptions 已含 local 默认值），无需额外配置。
   */
  const buildConfirmUrl = async (row, request) => {
    const shortCode = await fastify.shorten.services.sign(JSON.stringify({ c: asId(row.id), u: asId(request?.userInfo?.id || request?.user?.userId || '0') }), row.expiresAt);
    await row.update({ answerTokenHash: hashToken(shortCode), answerTokenExpiresAt: row.expiresAt });
    const origin = (fastify.oidcOptions?.origin || '').replace(/\/$/, '');
    const confirmPath = `/flow-confirm/${encodeURIComponent(shortCode)}`;
    return { confirmToken: shortCode, confirmPath, confirmUrl: origin ? `${origin}${confirmPath}` : confirmPath };
  };

  /** 短码解析：decode 由 shorten 包校验存在性与过期，这里只拆出确认单 id 与签字人 */
  const parseConfirmToken = async token => {
    let payload;
    try {
      payload = JSON.parse(await fastify.shorten.services.decode(token));
    } catch (e) {
      throw fail('INVALID_CONFIRM_TOKEN', '确认链接无效或已过期，请让 AI 重新发起确认');
    }
    if (!payload?.c) throw fail('INVALID_CONFIRM_TOKEN', '确认链接内容损坏');
    return { confirmationId: asId(payload.c), userId: asId(payload.u) };
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
      // 重复发起返回同一条 pending，但短链重新签发（旧链接仍有效，两者共用同一 answer 状态机）
      const link = await buildConfirmUrl(existing, request);
      return { confirmationId: asId(existing.id), status: existing.status, reused: true, subject: existing.subject, expiresAt: existing.expiresAt, ...link };
    }
    if (existing) {
      await existing.update({ status: 'superseded', supersededById: null });
    }

    const expiresAt = new Date(Date.now() + (expiresIn ? Number(expiresIn) * 1000 : DEFAULT_TTL));
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

    const link = await buildConfirmUrl(row, request);
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
      instructions: [
        '把 confirmUrl 直接贴在回复里给真人，人可在会话内打开确认页完成签字。',
        '这一轮到此结束，明确告诉人「我等你确认」，不要假设已同意继续往下做。',
        '下一轮先调 flow_get_confirmation 读最终 humanEdits / finalChildren，approved 后才能放行。'
      ]
    };
  };

  const get = async ({ confirmationId }) => {
    const row = await models.flowConfirmation.findByPk(confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
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
    const where = {};
    if (runId) where.runId = runId;
    if (status) where.status = status;
    if (requestedBy) where.requestedBy = requestedBy;
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
    if (row.status !== 'pending') throw fail('CONFIRMATION_DECIDED', '该确认已被处理，不能撤回');
    await row.update({ status: 'cancelled', comment: reason || 'AI 主动撤回' });
    return { confirmationId: asId(row.id), status: 'cancelled', reason, requestedBy: asId(request?.userInfo?.id) };
  };

  /**
   * 三个 surface（adminAuth / magic_link / IM 卡片）共用的唯一状态机入口。
   * decidedBy 只能由验签通道传入，MCP 工具没有写它的路径。
   */
  const answer = async ({ id, decision, answers = [], comment, surface = 'admin_center', finalChildren, humanEdits, decidedBy }, request = {}) => {
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
    return { confirmationId: asId(row.id), status, decidedBy: humanId, decidedAt: row.decidedAt, surface, finalChildren: proposal.finalChildren || null };
  };

  /** 短链页读取（免登录，token 验签即身份），不返回后台任何列表数据 */
  const getByToken = async ({ token }) => {
    const parsed = await parseConfirmToken(token);
    const row = await models.flowConfirmation.findByPk(parsed.confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    if (hashToken(token) !== row.answerTokenHash) throw fail('INVALID_CONFIRM_TOKEN', '确认链接已被替换或失效');
    if (row.status === 'pending' && row.expiresAt < new Date()) {
      await row.update({ status: 'expired' });
    }
    const node = await models.flow.findByPk(row.nodeId || row.flowId);
    const children = await models.flow.findAll({ where: { parentId: row.nodeId || row.flowId }, order: [['orderIndex', 'ASC']] });
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
      proposal: row.proposal || {},
      proposalComment: row.proposal?.changeNote || null,
      expiresAt: row.expiresAt,
      decidedBy: row.decidedBy ? asId(row.decidedBy) : null,
      decidedAt: row.decidedAt || null,
      comment: row.comment || null,
      surface: row.surface || null,
      userId: parsed.userId
    };
  };

  const answerByToken = async ({ token, decision, answers, comment, finalChildren, humanEdits }) => {
    const parsed = await parseConfirmToken(token);
    const row = await models.flowConfirmation.findByPk(parsed.confirmationId);
    if (!row) throw fail('CONFIRMATION_NOT_FOUND', '确认不存在');
    if (hashToken(token) !== row.answerTokenHash) throw fail('INVALID_CONFIRM_TOKEN', '确认链接已被替换或失效');
    return answer({ id: parsed.confirmationId, decision, answers, comment, finalChildren, humanEdits, surface: 'magic_link', decidedBy: parsed.userId });
  };

  /** 放行 / 落树消费凭证：一次性，消费即写 usedAt = releaseId */
  const consume = async ({ confirmationId, flowId, nodeId, stage, subject, releaseId, transaction }) => {
    if (!confirmationId) throw fail('CONFIRMATION_REQUIRED', '缺少真人确认凭证 confirmationId');
    const row = await models.flowConfirmation.findByPk(confirmationId, { transaction });
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
    // 核验类放行要求原始证据可解析
    const evidenceRefs = row.proposal?.evidenceRefs || [];
    if (['stage_complete', 'enter_next_stage', 'waive', 'force'].includes(subject) && evidenceRefs.length === 0) {
      throw fail('EVIDENCE_REQUIRED', '放行凭证缺少 evidenceRefs 原始证据引用');
    }
    await row.update({ usedAt: new Date(), usedByReleaseId: releaseId || null }, { transaction });
    return row;
  };

  Object.assign(services, {
    flowConfirmation: { request, get, list, listMine, cancel, answer, getByToken, answerByToken, consume, expireOverdue, SUBJECTS }
  });
});
