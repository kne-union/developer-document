const { STAGE_CODES } = require('../utils/flow-stages');

module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '关联流程节点' }),
      fromStage: {
        type: DataTypes.ENUM(...STAGE_CODES),
        comment: '来源阶段，创建时为 null'
      },
      toStage: {
        type: DataTypes.ENUM(...STAGE_CODES),
        allowNull: false,
        comment: '目标阶段'
      },
      action: {
        type: DataTypes.ENUM('create', 'advance', 'rollback', 'force', 'complete', 'archive', 'resume'),
        allowNull: false,
        comment: '流转动作'
      },
      operatorUserId: definePrimaryType('operatorUserId', { comment: '操作人' }),
      remark: {
        type: DataTypes.TEXT,
        comment: '说明 / 打回原因'
      },
      enteredAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '进入时间'
      },
      leftAt: {
        type: DataTypes.DATE,
        comment: '离开时间，当前阶段为 null'
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        comment: '阶段停留分钟数'
      },
      snapshot: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '准出与放行快照'
      },
      actorType: {
        type: DataTypes.ENUM('human', 'mcp-ai'),
        defaultValue: 'human',
        allowNull: false,
        comment: '放行由谁执行'
      },
      releaseId: {
        type: DataTypes.STRING(64),
        comment: '一次放行的唯一 id，用于撤销'
      },
      confirmationId: definePrimaryType('confirmationId', { comment: '本次流转所凭的真人确认凭证' }),
      undoneAt: {
        type: DataTypes.DATE,
        comment: '放行被撤销时间'
      },
      undoneBy: definePrimaryType('undoneBy', { comment: '放行撤销人' })
    },
    associate: ({ flowStageRecord }) => {
      flowStageRecord.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: '流程阶段流转记录（只追加）',
      indexes: [{ fields: ['flow_id', 'entered_at'] }, { fields: ['release_id'] }]
    }
  };
};
