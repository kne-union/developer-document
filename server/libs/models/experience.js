module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      relativePath: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '相对路径'
      },
      category: {
        type: DataTypes.STRING,
        comment: 'business | library | process'
      },
      title: {
        type: DataTypes.STRING,
        comment: '标题'
      },
      content: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '经验 JSON'
      },
      keywords: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '关键词'
      },
      status: {
        type: DataTypes.ENUM('active', 'closed'),
        defaultValue: 'active',
        comment: 'active 启用 closed 关闭'
      }
    },
    associate: ({ experience }) => {
      experience.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser'
      });
    },
    options: {
      comment: '可复用经验'
    }
  };
};
