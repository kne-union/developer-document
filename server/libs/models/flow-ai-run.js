module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '关联流程节点' }),
      nodeId: definePrimaryType('nodeId', { comment: '任务所属节点，通常与 flowId 相同' }),
      stage: {
        type: DataTypes.STRING(32),
        comment: '执行时所在阶段'
      },
      goal: {
        type: DataTypes.STRING(64),
        defaultValue: 'draft',
        comment: 'draft / review_ready / release / unblock / decompose / converge'
      },
      status: {
        type: DataTypes.ENUM('claimed', 'running', 'awaiting_human', 'succeeded', 'failed', 'abandoned', 'blocked'),
        defaultValue: 'running',
        allowNull: false,
        comment: 'run 状态；awaiting_human 表示球在真人那边，出池且不占租约'
      },
      actorUserId: definePrimaryType('actorUserId', { comment: '令牌对应的登录用户' }),
      actorType: {
        type: DataTypes.ENUM('human', 'mcp-ai'),
        defaultValue: 'mcp-ai',
        comment: '执行方'
      },
      model: {
        type: DataTypes.STRING(64),
        comment: 'Agent 自报模型名'
      },
      clientName: {
        type: DataTypes.STRING(64),
        comment: 'Agent 自报客户端名'
      },
      contextSnapshot: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '起跑时的阶段、模板、准出进度、建议检索词'
      },
      outputs: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '本次拟写入 / 实际写入的交付物草稿'
      },
      events: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '追加式事件流 [{at,tool,action,target,result,...}]，一期承担 AI 侧审计'
      },
      idempotencyKey: {
        type: DataTypes.STRING(160),
        unique: true,
        comment: '幂等键，防重复起跑'
      },
      startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '开始时间'
      },
      finishedAt: {
        type: DataTypes.DATE,
        comment: '结束时间'
      },
      error: {
        type: DataTypes.TEXT,
        comment: '错误信息'
      },
      // 派单租约字段（领取任务 = 起一个 run，不新增表）
      workItemKey: {
        type: DataTypes.STRING(200),
        comment: '{nodeId}:{stage}:{goal}'
      },
      leaseId: {
        type: DataTypes.STRING(64),
        comment: '租约 id'
      },
      leaseExpiresAt: {
        type: DataTypes.DATE,
        comment: '租约到期时间，默认 20 分钟'
      },
      active: {
        type: DataTypes.BOOLEAN,
        comment: '仅未释放租约为 1，释放后置 NULL，配合 (workItemKey, active) 唯一索引'
      },
      prioritySnapshot: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '领取时的优先级分数明细'
      },
      priorityReasons: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '人能看懂的派单理由'
      },
      attempt: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '失败次数，>=3 转 blocked'
      },
      claimedByUserId: definePrimaryType('claimedByUserId', { comment: '领取者' }),
      claimedByClient: {
        type: DataTypes.STRING(64),
        comment: '领取客户端'
      }
    },
    associate: ({ flowAiRun }) => {
      flowAiRun.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: 'AI 执行与任务租约',
      indexes: [{ unique: true, fields: ['work_item_key', 'active'] }, { fields: ['lease_expires_at', 'status'] }, { fields: ['flow_id', 'started_at'] }, { fields: ['status', 'goal'] }]
    }
  };
};
