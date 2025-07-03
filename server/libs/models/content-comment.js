module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      content: {
        type: DataTypes.TEXT,
        comment: '评论内容'
      },
      type: {
        type: DataTypes.ENUM('blog', 'document'),
        allowNull: false
      },
      targetId: definePrimaryType('targetId', {
        comment: '评论目标id',
        allowNull: false
      }),
      replyId: definePrimaryType('replyId', {
        comment: '回复的评论id'
      })
    },
    associate: ({ contentComment }) => {
      contentComment.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '创建人',
        allowNull: false
      });
    },
    options: {
      comment: '评论'
    }
  };
};
