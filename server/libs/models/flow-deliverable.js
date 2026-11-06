const { STAGE_CODES } = require('../utils/flow-stages');

module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '关联流程节点' }),
      stage: {
        type: DataTypes.ENUM(...STAGE_CODES),
        allowNull: false,
        comment: '所属阶段'
      },
      templateCode: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: '交付物模板项标识'
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '模板名称快照'
      },
      contentType: {
        type: DataTypes.ENUM('file', 'url', 'text', 'checklist', 'jsonb'),
        allowNull: false,
        comment: '内容类型，jsonb 只认 options'
      },
      required: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: '是否必交（模板快照）'
      },
      sort: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '展示顺序'
      },
      acceptCriteria: {
        type: DataTypes.TEXT,
        comment: '验收要点快照'
      },
      fileId: {
        type: DataTypes.STRING(64),
        comment: '文件服务返回的 id'
      },
      fileName: {
        type: DataTypes.STRING(255),
        comment: '上传文件名'
      },
      url: {
        type: DataTypes.STRING(1000),
        comment: '外部链接'
      },
      content: {
        type: DataTypes.TEXT,
        comment: '文本正文'
      },
      checklist: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '[{label,checked,remark}]'
      },
      options: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'jsonb 多份材料 / 通用扩展位'
      },
      status: {
        type: DataTypes.ENUM('pending', 'ai_draft', 'submitted', 'accepted', 'rejected', 'waived'),
        defaultValue: 'pending',
        allowNull: false,
        comment: '交付物状态，ai_draft 不算准出通过'
      },
      producedBy: {
        type: DataTypes.ENUM('human', 'ai', 'hybrid'),
        defaultValue: 'human',
        allowNull: false,
        comment: '双生产者来源'
      },
      verificationRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: '是否需核验原始证据（模板快照）'
      },
      allowedProducers: {
        type: DataTypes.ENUM('any', 'human', 'ai'),
        defaultValue: 'any',
        allowNull: false,
        comment: '允许的生产者（模板快照），本期 23 项均为 any'
      },
      aiRunId: definePrimaryType('aiRunId', { comment: '关联本次 AI 执行' }),
      sourceRefs: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'AI 产出的引用依据 [{type,ref,title}]'
      },
      confidence: {
        type: DataTypes.INTEGER,
        comment: 'AI 自报置信度 0-100，只展示不参与准出'
      },
      submittedBy: definePrimaryType('submittedBy', { comment: '提交人' }),
      submittedAt: {
        type: DataTypes.DATE,
        comment: '提交时间'
      },
      reviewedBy: definePrimaryType('reviewedBy', { comment: '审核人' }),
      reviewedByType: {
        type: DataTypes.ENUM('human', 'mcp-ai'),
        defaultValue: 'human',
        comment: '审核执行方'
      },
      reviewedAt: {
        type: DataTypes.DATE,
        comment: '审核时间'
      },
      reviewRemark: {
        type: DataTypes.TEXT,
        comment: '驳回 / 豁免原因'
      },
      releaseId: {
        type: DataTypes.STRING(64),
        comment: '本次审核所属放行 id'
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: '第几次提交'
      },
      revisions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '每次提交前的内容快照'
      }
    },
    associate: ({ flowDeliverable }) => {
      flowDeliverable.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人'
      });
    },
    options: {
      comment: '流程阶段交付物实例',
      indexes: [{ unique: true, fields: ['flow_id', 'stage', 'template_code'] }, { fields: ['flow_id', 'status'] }, { fields: ['stage', 'status'] }]
    }
  };
};
