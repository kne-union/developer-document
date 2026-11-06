const { STAGE_CODES, NODE_TYPES } = require('../utils/flow-stages');

module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      code: {
        type: DataTypes.STRING(32),
        unique: true,
        comment: '流程流水号 FLOW-YYYYMM-0001'
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '需求 / 任务标题'
      },
      description: {
        type: DataTypes.TEXT,
        comment: '需求描述、验收标准'
      },
      stage: {
        type: DataTypes.ENUM(...STAGE_CODES),
        defaultValue: 'requirement',
        allowNull: false,
        comment: '当前阶段，只能经 transition 修改'
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
        defaultValue: 'active',
        allowNull: false,
        comment: '实例状态'
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false,
        comment: '优先级，参与全局派单排序'
      },
      ownerUserId: definePrimaryType('ownerUserId', { comment: '当前负责人' }),
      participantIds: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '参与人 id 数组'
      },
      tags: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '标签'
      },
      dueAt: {
        type: DataTypes.DATE,
        comment: '计划完成时间'
      },
      stageEnteredAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '进入当前阶段时间'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '开始时间'
      },
      finishedAt: {
        type: DataTypes.DATE,
        comment: '完成时间'
      },
      source: {
        type: DataTypes.ENUM('manual', 'ai', 'worklog', 'experience'),
        defaultValue: 'manual',
        comment: '来源'
      },
      sourceId: definePrimaryType('sourceId', { comment: '来源记录 id，AI 创建时存 runId' }),
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '乐观锁版本'
      },
      // 裂变树字段
      parentId: definePrimaryType('parentId', { comment: '父节点，根节点为空' }),
      rootId: definePrimaryType('rootId', { allowNull: false, comment: '整棵树的根节点 id' }),
      nodeType: {
        type: DataTypes.ENUM(...NODE_TYPES),
        defaultValue: 'requirement',
        allowNull: false,
        comment: '节点类型，决定允许的 stage 集合'
      },
      depth: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '树深度，上限 4'
      },
      path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        defaultValue: '',
        comment: '物化路径 /{rootId}/{parentId}/{id}'
      },
      orderIndex: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: '同级顺序'
      },
      isAggregate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: '仅预发布汇聚节点为 true'
      },
      convergeKey: {
        type: DataTypes.STRING(120),
        unique: true,
        comment: '{rootId}:pre_release，保证同树只有一个预发布'
      },
      upstreamNodeIds: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '预发布节点的全部上游开发节点 id'
      },
      decomposeKey: {
        type: DataTypes.STRING(160),
        unique: true,
        comment: '{parentId}:{nodeType}:{orderIndex}，幂等落树'
      },
      origin: {
        type: DataTypes.ENUM('human', 'ai', 'ai_decompose'),
        defaultValue: 'human',
        allowNull: false,
        comment: '节点来源：人建 / AI 建 / AI 裂变落树'
      },
      // 暂停字段：pausedAt 非空即暂停，不改 status
      pausedAt: {
        type: DataTypes.DATE,
        comment: '暂停时刻，非空即暂停'
      },
      pausedBy: definePrimaryType('pausedBy', { comment: '暂停操作人' }),
      pausedByType: {
        type: DataTypes.ENUM('human', 'mcp-ai'),
        defaultValue: 'human',
        comment: '暂停发起方'
      },
      pauseReason: {
        type: DataTypes.STRING(500),
        comment: '暂停原因'
      },
      pausedStage: {
        type: DataTypes.STRING(32),
        comment: '仅暂停该阶段；为空表示整节点'
      },
      pauseHistory: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '追加式暂停 / 恢复记录，保留最近 50 条'
      },
      resumedAt: {
        type: DataTypes.DATE,
        comment: '最近一次恢复时刻，aging 从此刻重算'
      }
    },
    associate: ({ flow }) => {
      flow.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: '流程节点（自引用工作分解树）',
      indexes: [
        { fields: ['status', 'stage'] },
        { fields: ['owner_user_id'] },
        { fields: ['created_at'] },
        { fields: ['root_id', 'path'] },
        { fields: ['parent_id', 'order_index'] },
        { fields: ['status', 'stage', 'priority'] },
        { fields: ['paused_at'] }
      ]
    }
  };
};
