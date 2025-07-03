module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      settingKey: {
        type: DataTypes.STRING,
        comment: '设置项Key',
        allowNull: false,
        unique: true
      },
      settingValue: {
        type: DataTypes.JSON,
        comment: '设置项Value'
      },
      status: {
        type: DataTypes.ENUM('open', 'close'),
        defaultValue: 'open',
        comment: '设置状态'
      },
      options: {
        type: DataTypes.JSON,
        comment: '扩展项'
      }
    },
    options: {
      comment: '系统设置'
    }
  };
};
