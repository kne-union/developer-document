module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      name: {
        type: DataTypes.STRING,
        comment: '名称',
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('draft', 'published'),
        defaultValue: 'published',
        comment: '状态'
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否公开'
      },
      groups: {
        type: DataTypes.JSON,
        comment: '分组列表',
        defaultValue: []
      }
    },
    associate: ({ document }) => {
      document.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人',
        allowNull: false
      });
    },
    options: {
      comment: '文档'
    }
  };
};
