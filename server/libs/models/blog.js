module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      title: {
        type: DataTypes.STRING,
        comment: '标题',
        allowNull: false
      },
      content: {
        type: DataTypes.TEXT,
        comment: '内容',
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('draft', 'published'),
        comment: '状态',
        defaultValue: 'draft'
      },
      publishTime: {
        type: DataTypes.DATE,
        comment: '发布时间,如果是草稿,则在该时间之后自动发布'
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        comment: '是否公开',
        defaultValue: true
      },
      groups: {
        type: DataTypes.JSON,
        comment: '分组列表',
        defaultValue: []
      }
    },
    associate: ({ blog }) => {
      blog.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人',
        allowNull: false
      });
    },
    options: {
      comment: '博客'
    }
  };
};
