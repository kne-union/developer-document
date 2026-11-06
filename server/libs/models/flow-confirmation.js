module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '关联流程节点' }),
      nodeId: definePrimaryType('nodeId', { comment: '确认针对的节点' }),
      stage: {
        type: DataTypes.STRING(32),
        comment: '确认针对的阶段'
      },
      runId: definePrimaryType('runId', { comment: '发起确认的 AI 执行' }),
      subject: {
        type: DataTypes.ENUM('stage_complete', 'enter_next_stage', 'decompose', 'converge', 'waive', 'force', 'resume'),
        allowNull: false,
        comment: '确认主题，决定可放行的动作'
      },
      proposal: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'AI 草案：summary / completedItems / evidenceRefs / proposedAction / treePreview / children / finalChildren / humanEdits / changeNote'
      },
      questions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '[{key,question,answer,required}]'
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'changes_requested', 'expired', 'cancelled', 'superseded'),
        defaultValue: 'pending',
        allowNull: false,
        comment: '确认状态'
      },
      proposalVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: '裂变草案版本'
      },
      supersedesId: definePrimaryType('supersedesId', { comment: '被本版替代的确认 id' }),
      supersededById: definePrimaryType('supersededById', { comment: '替代本版的确认 id' }),
      requestedByType: {
        type: DataTypes.ENUM('ai', 'human'),
        defaultValue: 'ai',
        allowNull: false,
        comment: '发起方；decompose 的 apply 要求为 ai'
      },
      requestedBy: definePrimaryType('requestedBy', { comment: '发起人' }),
      decidedBy: definePrimaryType('decidedBy', { comment: '真人签字人，只能经验签通道写入' }),
      decidedAt: {
        type: DataTypes.DATE,
        comment: '真人决策时间'
      },
      comment: {
        type: DataTypes.TEXT,
        comment: '人的意见；reject / changes_requested 必填'
      },
      surface: {
        type: DataTypes.ENUM('im_card', 'magic_link', 'admin_center'),
        comment: '从哪个入口答的，仅审计'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '过期时间，默认 24h'
      },
      usedAt: {
        type: DataTypes.DATE,
        comment: '被放行动作消费的时间，一次性凭证'
      },
      usedByReleaseId: {
        type: DataTypes.STRING(64),
        comment: '消费该凭证的放行 id'
      },
      answerTokenHash: {
        type: DataTypes.STRING(128),
        comment: '会话内一次性短链 token 的哈希，明文不落库'
      },
      answerTokenExpiresAt: {
        type: DataTypes.DATE,
        comment: '短链 token 过期时间'
      }
    },
    associate: ({ flowConfirmation }) => {
      flowConfirmation.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: '真人确认凭证（一次性）',
      indexes: [{ fields: ['flow_id', 'stage', 'subject', 'status'] }, { fields: ['node_id', 'status'] }, { fields: ['expires_at', 'status'] }, { fields: ['run_id'] }]
    }
  };
};
