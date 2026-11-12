// 写入限流：按 flowId + userId + 自然分钟窗口计数，原子递增，窗口过期后可清理。
// 新表由 sequelize 模型 + sync 初始化，不另附建表 SQL。
module.exports = ({ DataTypes }) => {
  return {
    model: {
      windowKey: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        comment: 'flowId:userId:windowStartMinute，跨实例唯一窗口键'
      },
      flowId: {
        type: DataTypes.STRING(64),
        comment: '流程或占位键'
      },
      userId: {
        type: DataTypes.STRING(64),
        comment: '调用者'
      },
      windowStart: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '窗口起始（unix 分钟）'
      },
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '本窗口已计数（原子递增）'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '窗口过期时刻，供清理'
      }
    },
    options: {
      paranoid: false,
      comment: '流程写入限流计数，数据库共享',
      indexes: [{ fields: ['expires_at'] }]
    }
  };
};
