module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      name: {
        type: DataTypes.STRING,
        comment: '名称',
        allowNull: false
      },
      parentId: definePrimaryType('parentId', {
        comment: '父栏目id，为空时为根栏目'
      }),
      type: {
        type: DataTypes.ENUM('api', 'blog', 'document'),
        comment: '栏目类型',
        allowNull: false
      }
    },
    options: {
      comment: '内容栏目'
    }
  };
};
