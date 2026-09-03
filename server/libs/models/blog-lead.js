module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      title: {
        type: DataTypes.STRING,
        comment: '标题',
        allowNull: false
      },
      summary: {
        type: DataTypes.TEXT,
        comment: '摘要',
        allowNull: true
      },
      content: {
        type: DataTypes.TEXT,
        comment: '正文（用户补全）',
        allowNull: true,
        defaultValue: ''
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed'),
        comment: '状态',
        defaultValue: 'pending',
        allowNull: false
      },
      channel: {
        type: DataTypes.STRING,
        comment: '渠道',
        defaultValue: 'zhihu',
        allowNull: false
      },
      sourceUrl: {
        type: DataTypes.TEXT,
        comment: '原文链接',
        allowNull: true
      },
      externalId: {
        type: DataTypes.STRING,
        comment: '外部内容 ID（去重）',
        allowNull: true
      },
      meta: {
        type: DataTypes.JSONB,
        comment: '元信息',
        defaultValue: {}
      },
      blogId: {
        type: DataTypes.STRING,
        comment: '完成后关联的博客 ID',
        allowNull: true
      },
      fetchedAt: {
        type: DataTypes.DATE,
        comment: '抓取时间',
        allowNull: true
      }
    },
    associate: ({ blogLead }) => {
      blogLead.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser',
        comment: '完成操作人',
        allowNull: true
      });
    },
    options: {
      comment: '文章线索'
    }
  };
};
