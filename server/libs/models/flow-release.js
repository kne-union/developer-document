/**
 * AI 放行台账。
 *
 * 设计目标：AI 自主驱动全流程，不再要求每一步都预先真人签字；
 * 人工控制点收敛到「撤回（undo）」与「打回（reject + feedback）」。
 * 因此每次放行必须留下一份可复原的 before 快照，打回还要能留下 AI 看得见的反馈，
 * 且反馈未 ack 前不得原样重跑 —— 否则「打回」对 AI 没有约束力。
 */
module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      releaseId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: '一次放行的唯一 id，人工据此撤回 / 打回'
      },
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '关联流程节点' }),
      runId: definePrimaryType('runId', { comment: '本次 AI 执行' }),
      action: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'review / waive / transition / decompose'
      },
      subject: {
        type: DataTypes.STRING(32),
        comment: '放行主题'
      },
      stage: {
        type: DataTypes.STRING(32),
        comment: '放行时所处阶段'
      },
      fromStage: {
        type: DataTypes.STRING(32),
        comment: '快照：放行前阶段'
      },
      toStage: {
        type: DataTypes.STRING(32),
        comment: '快照：放行后阶段'
      },
      actorUserId: definePrimaryType('actorUserId', { comment: '执行人 / AI 令牌所属用户' }),
      actorType: {
        type: DataTypes.ENUM('human', 'mcp-ai'),
        defaultValue: 'mcp-ai',
        allowNull: false,
        comment: '执行方'
      },
      mode: {
        type: DataTypes.ENUM('ai_autonomous', 'human_confirmed', 'admin'),
        defaultValue: 'ai_autonomous',
        allowNull: false,
        comment: 'ai_autonomous = 无真人预签字，人工可事后撤回 / 打回'
      },
      confirmationId: definePrimaryType('confirmationId', { comment: '可选：主动请求人工复核时的凭证' }),
      before: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '放行前快照：flow + deliverables + decompose'
      },
      after: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '放行后快照'
      },
      evidenceRefs: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '结构化原始证据引用'
      },
      note: {
        type: DataTypes.TEXT,
        comment: 'AI 对本次放行的说明'
      },
      feedbackStatus: {
        type: DataTypes.ENUM('none', 'open', 'acknowledged'),
        defaultValue: 'none',
        allowNull: false,
        comment: '人工打回后为 open，AI 处理并说明后才可继续放行'
      },
      feedback: {
        type: DataTypes.TEXT,
        comment: '人工打回意见'
      },
      feedbackBy: definePrimaryType('feedbackBy', { comment: '打回人' }),
      feedbackAt: {
        type: DataTypes.DATE,
        comment: '打回时间'
      },
      ackNote: {
        type: DataTypes.TEXT,
        comment: 'AI 对打回意见的处理说明'
      },
      ackAt: {
        type: DataTypes.DATE,
        comment: 'AI 确认已处理打回意见的时间'
      },
      undoneAt: {
        type: DataTypes.DATE,
        comment: '撤销时间'
      },
      undoneBy: definePrimaryType('undoneBy', { comment: '撤销人' }),
      undoReason: {
        type: DataTypes.TEXT,
        comment: '撤销原因'
      }
    },
    associate: ({ flowRelease }) => {
      flowRelease.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: 'AI 放行台账（快照 + 人工撤回 / 打回反馈）',
      indexes: [{ unique: true, fields: ['release_id'] }, { fields: ['flow_id', 'created_at'] }, { fields: ['flow_id', 'feedback_status'] }]
    }
  };
};
