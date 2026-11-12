// 放行预检凭证：明文 checkToken 只在签发时返回一次，库内仅存 SHA-256。
// 新表由 sequelize 模型 + sync 初始化，不另附建表 SQL。
module.exports = ({ DataTypes, definePrimaryType }) => {
  return {
    model: {
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'checkToken 的 SHA-256 十六进制摘要，不存明文'
      },
      flowId: definePrimaryType('flowId', { allowNull: false, comment: '绑定的流程' }),
      runId: definePrimaryType('runId', { comment: '绑定的 AI 运行' }),
      action: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: '绑定动作：transition / review / waive'
      },
      toStage: {
        type: DataTypes.STRING(32),
        comment: '绑定目标阶段'
      },
      stage: {
        type: DataTypes.STRING(32),
        comment: '签发时的当前阶段'
      },
      subject: {
        type: DataTypes.STRING(64),
        comment: '绑定科目'
      },
      actorUserId: definePrimaryType('actorUserId', { comment: '绑定调用者' }),
      version: {
        type: DataTypes.INTEGER,
        comment: '绑定流程乐观锁版本'
      },
      previewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'dryRun 预览已通过，正式放行前置条件；预览本身不消费凭证'
      },
      consumedAt: {
        type: DataTypes.DATE,
        comment: '正式放行一次性消费时刻；与放行写入同一事务，回滚则未消费'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '过期时刻，默认签发后 5 分钟'
      }
    },
    options: {
      paranoid: false,
      comment: '放行预检凭证，数据库共享，重启后未过期仍有效',
      indexes: [{ fields: ['expires_at'] }, { fields: ['flow_id', 'consumed_at'] }]
    }
  };
};
