module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      name: {
        type: DataTypes.STRING,
        comment: '项目名称',
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('url', 'json', 'yml'),
        comment: '文档类型',
        allowNull: false
      },
      content: {
        type: DataTypes.JSON,
        comment: '文档内容',
        allowNull: false
      },
      env: {
        type: DataTypes.STRING,
        comment: '环境标签，一般为:dev,test,prod'
      },
      status: {
        type: DataTypes.ENUM('draft', 'published'),
        defaultValue: 'draft',
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
    options: {
      comment: 'api文档'
    }
  };
};
