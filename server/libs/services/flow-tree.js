const fp = require('fastify-plugin');
const { Op } = require('sequelize');
const { NODE_TYPE_CHILDREN, NODE_TYPE_STAGES, isStageAllowed } = require('../utils/flow-stages');
const { fail, asId, plain, makeEvent } = require('../utils/flow-helpers');

const MAX_DEPTH = 4;
const MAX_CHILDREN = 20;

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];

  const getNode = async id => {
    const node = await models.flow.findByPk(id);
    if (!node) throw fail('FLOW_NOT_FOUND', '节点不存在');
    return node;
  };

  const descendants = async node => models.flow.findAll({ where: { path: { [Op.like]: `${node.path}%` } } });

  const childrenOf = async nodeId => models.flow.findAll({ where: { parentId: nodeId }, order: [['orderIndex', 'ASC']] });

  const blockingChildren = async node => {
    const children = await childrenOf(node.id);
    return children.filter(item => item.status !== 'completed').map(item => asId(item.id));
  };

  /** 预发布汇聚度：上游开发节点完成数 / 总数 */
  const convergeReadiness = async node => {
    if (node.nodeType !== 'pre_release') return 1;
    const upstream = node.upstreamNodeIds || [];
    if (!upstream.length) return 0;
    const rows = await models.flow.findAll({ where: { id: { [Op.in]: upstream } } });
    const completed = rows.filter(item => item.status === 'completed').length;
    return { ratio: completed / upstream.length, completed, total: upstream.length, waiting: rows.filter(item => item.status !== 'completed').map(item => asId(item.id)) };
  };

  /**
   * 确保同一需求树只有一个预发布汇聚节点。由 development 节点完成测试阶段时调用。
   */
  const ensureAggregateNode = async ({ rootId, upstreamNodeId, transaction }) => {
    const convergeKey = `${asId(rootId)}:pre_release`;
    const existing = await models.flow.findOne({ where: { convergeKey }, transaction });
    if (existing) {
      const ids = new Set((existing.upstreamNodeIds || []).map(asId));
      ids.add(asId(upstreamNodeId));
      await existing.update({ upstreamNodeIds: [...ids] }, { transaction });
      return existing;
    }
    return services.flow.createNode(
      {
        title: '预发布汇聚',
        nodeType: 'pre_release',
        stage: 'pre_release',
        parentId: rootId,
        isAggregate: true,
        convergeKey,
        upstreamNodeIds: [asId(upstreamNodeId)],
        origin: 'ai_decompose'
      },
      { transaction }
    );
  };

  /**
   * 模块私有：建子节点只允许被 applyDecomposition 以已批准的 confirmation 调用。
   * 对外不暴露 createChildren，从机制上堵死「无凭证建树」。
   */
  const createChildren = async ({ parent, children, confirmation, transaction }) => {
    if (!confirmation || confirmation.status !== 'approved' || confirmation.subject !== 'decompose' || confirmation.requestedByType !== 'ai') {
      throw fail('INVALID_CONFIRMATION', '建子节点必须携带已批准且由 AI 发起的 decompose 确认凭证');
    }
    if (!Array.isArray(children) || children.length === 0) throw fail('INVALID_PROPOSAL', 'AI 草案缺少 children');
    if (children.length > MAX_CHILDREN) throw fail('TOO_MANY_CHILDREN', `单节点子项不能超过 ${MAX_CHILDREN}`);
    if (Number(parent.depth || 0) + 1 > MAX_DEPTH) throw fail('DEPTH_EXCEEDED', `树深度不能超过 ${MAX_DEPTH}`);
    const childType = NODE_TYPE_CHILDREN[parent.nodeType];
    if (!childType) throw fail('DECOMPOSE_NOT_ALLOWED', `${parent.nodeType} 节点不可裂变（预发布为汇聚节点）`);
    if (parent.nodeType === 'development' && parent.stage === 'testing') {
      throw fail('DECOMPOSE_NOT_ALLOWED', '测试内嵌在开发节点，不能裂变');
    }

    const created = [];
    for (let index = 0; index < children.length; index += 1) {
      const item = children[index] || {};
      if (!item.title) throw fail('INVALID_PROPOSAL', `children[${index}].title 必填`);
      const nodeType = item.nodeType || childType;
      if (nodeType !== childType) throw fail('INVALID_NODE_TYPE', `本次裂变只能生成 ${childType} 节点`);
      const stage = item.stage || NODE_TYPE_STAGES[nodeType][0];
      if (!isStageAllowed(nodeType, stage)) throw fail('INVALID_STAGE', `节点类型与阶段不匹配：${nodeType} / ${stage}`);
      const node = await services.flow.createNode(
        {
          title: item.title,
          description: item.scope || item.description || '',
          priority: item.priority || parent.priority,
          ownerUserId: item.ownerUserId || null,
          parentId: parent.id,
          rootId: parent.rootId || parent.id,
          nodeType,
          stage,
          orderIndex: index,
          decomposeKey: `${asId(parent.id)}:${nodeType}:${index}`,
          origin: 'ai_decompose'
        },
        { transaction }
      );
      created.push(node);
    }
    return created;
  };

  /** 树视图（含派生进度字段） */
  const tree = async ({ rootId, flowId } = {}) => {
    let root = rootId;
    if (!root && flowId) {
      const node = await getNode(flowId);
      root = node.rootId || node.id;
    }
    if (!root) throw fail('ROOT_ID_REQUIRED', '缺少 rootId 或 flowId');
    const rootNode = await getNode(root);
    const rows = await models.flow.findAll({
      where: { path: { [Op.like]: `${rootNode.path}%` } },
      order: [
        ['depth', 'ASC'],
        ['orderIndex', 'ASC']
      ]
    });
    const nodes = [];
    for (const row of rows) {
      const children = await childrenOf(row.id);
      const completed = children.filter(item => item.status === 'completed').length;
      const convergence = await convergeReadiness(row);
      nodes.push({
        ...plain(row),
        id: asId(row.id),
        parentId: row.parentId ? asId(row.parentId) : null,
        rootId: asId(row.rootId),
        childrenProgress: children.length ? { total: children.length, completed } : null,
        blockingChildren: children.filter(item => item.status !== 'completed').map(item => asId(item.id)),
        convergeReadiness: typeof convergence === 'number' ? convergence : convergence.ratio,
        waiting: typeof convergence === 'number' ? [] : convergence.waiting,
        pausedByAncestor: !!row.pausedByAncestor
      });
    }
    return { rootId: asId(root), nodes };
  };

  /** AI 出稿（含改稿）：只生成确认请求，绝不落树 */
  const proposeDecomposition = async (params = {}, request = {}) => {
    const { nodeId, children, rationale, supersedeConfirmationId, changeNote, runId } = params;
    const parent = await getNode(nodeId);
    if (parent.pausedAt) throw fail('NODE_PAUSED', '节点已暂停，暂停期间树结构不得变化（需先恢复）');
    const childType = NODE_TYPE_CHILDREN[parent.nodeType];
    const warnings = [];
    if (!childType) throw fail('DECOMPOSE_NOT_ALLOWED', `${parent.nodeType} 节点不可裂变`);
    if (Number(parent.depth || 0) + 1 > MAX_DEPTH) throw fail('DEPTH_EXCEEDED', `树深度不能超过 ${MAX_DEPTH}`);
    if (!Array.isArray(children) || children.length === 0) throw fail('INVALID_PROPOSAL', 'children 必须是非空数组');
    if (children.length > MAX_CHILDREN) throw fail('TOO_MANY_CHILDREN', `单节点子项不能超过 ${MAX_CHILDREN}`);
    if (children.length < 2) warnings.push('只拆出 1 个子节点，通常没有并行收益，建议确认是否真的需要裂变');
    if (!rationale) throw fail('RATIONALE_REQUIRED', '裂变草案必须给出 rationale 拆分理由');

    const current = await childrenOf(parent.id);
    const confirmation = await services.flowConfirmation.request(
      {
        runId,
        flowId: asId(parent.id),
        nodeId: asId(parent.id),
        stage: parent.stage,
        subject: 'decompose',
        supersedeConfirmationId,
        changeNote,
        proposal: {
          summary: rationale,
          rationale,
          children,
          treePreview: {
            current: current.map(item => ({ id: asId(item.id), title: item.title, nodeType: item.nodeType, stage: item.stage })),
            adding: children.map((item, index) => ({ index, title: item.title, nodeType: item.nodeType || childType, scope: item.scope || '', priority: item.priority || parent.priority }))
          },
          completedItems: [],
          evidenceRefs: []
        },
        questions: [{ key: 'agree', question: '是否同意按此方案拆分？', required: true }]
      },
      request
    );
    return {
      ...confirmation,
      warnings,
      instructions: [
        '你不能自己创建子节点，只能提出拆解草案并等真人确认。',
        '把 treePreview 渲染成「现有节点 / 将新增 N 个」贴给用户，并给出 confirmUrl。',
        '本轮到此结束，明确告诉人「我等你确认」；approved 之前不要调用 flow_apply_decomposition。',
        '人给修改意见时用 supersedeConfirmationId 出下一版，不要另起一条新提议。'
      ]
    };
  };

  /** 落树：DTO 只允许 confirmationId，出现 children 直接拒 */
  const applyDecomposition = async (params = {}, request = {}) => {
    const keys = Object.keys(params).filter(key => key !== 'confirmationId');
    if (keys.length) throw fail('SCHEMA_VIOLATION', `flow_apply_decomposition 只接受 confirmationId，不接受 ${keys.join(', ')}`);
    const { confirmationId } = params;
    if (!confirmationId) throw fail('CONFIRMATION_REQUIRED', '缺少 confirmationId');

    const result = await fastify.sequelize.instance.transaction(async transaction => {
      const confirmation = await models.flowConfirmation.findByPk(confirmationId, { transaction });
      if (!confirmation) throw fail('INVALID_CONFIRMATION', '确认凭证不存在');
      if (confirmation.subject !== 'decompose' || confirmation.status !== 'approved' || confirmation.requestedByType !== 'ai') {
        throw fail('INVALID_CONFIRMATION', '落树需要已批准且由 AI 发起的 decompose 凭证');
      }
      if (confirmation.usedAt) throw fail('CONFIRMATION_USED', '该凭证已被消费（裂变已落树）');
      if (confirmation.expiresAt < new Date()) throw fail('CONFIRMATION_EXPIRED', '确认凭证已过期');

      const parent = await getNode(confirmation.nodeId || confirmation.flowId);
      // 暂停前的 approved 凭证依然有效，但暂停期间不得改树（6B.2.4 第 6 条）
      if (parent.pausedAt) throw fail('NODE_PAUSED', '节点暂停中，恢复后再落树');
      const children = confirmation.proposal?.finalChildren || confirmation.proposal?.children || [];
      const created = await createChildren({ parent, children, confirmation, transaction });
      // 父节点裂变出子节点后进入树语义：标记聚合，等待子节点自底向上汇聚
      await parent.update({ isAggregate: true, upstreamNodeIds: created.map(item => asId(item.id)) }, { transaction });
      await confirmation.update({ usedAt: new Date(), usedByReleaseId: `decompose_${asId(confirmation.id)}` }, { transaction });

      // 落树由同一事务把 run 置 succeeded 并写 outputs.decomposition
      if (confirmation.runId) {
        const run = await models.flowAiRun.findByPk(confirmation.runId, { transaction });
        if (run) {
          await run.update(
            {
              status: 'succeeded',
              active: null,
              finishedAt: new Date(),
              outputs: { ...(run.outputs || {}), decomposition: { confirmationId: asId(confirmation.id), nodeIds: created.map(item => asId(item.id)) } },
              events: [
                ...(run.events || []),
                makeEvent({ tool: 'flow_apply_decomposition', action: 'applied', target: confirmation.id, result: 'succeeded', actorUserId: run.actorUserId, extra: { nodeIds: created.map(item => asId(item.id)) } })
              ]
            },
            { transaction }
          );
        }
      }
      return { parentId: asId(parent.id), nodeIds: created.map(item => asId(item.id)), confirmationId: asId(confirmation.id) };
    });
    return { ...result, status: 'succeeded', proposalsUsed: 1, requestedBy: asId(request?.userInfo?.id) };
  };

  Object.assign(services, {
    flowTree: { tree, proposeDecomposition, applyDecomposition, childrenOf, descendants, blockingChildren, convergeReadiness, ensureAggregateNode, MAX_DEPTH, MAX_CHILDREN }
  });
});
