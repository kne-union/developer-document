module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      relativePath: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '相对路径'
      },
      projectName: {
        type: DataTypes.STRING,
        comment: '项目名'
      },
      title: {
        type: DataTypes.STRING,
        comment: '标题'
      },
      writtenAt: {
        type: DataTypes.DATE,
        comment: 'writtenAt'
      },
      content: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: '工作日志 JSON'
      }
    },
    associate: ({ worklog }) => {
      worklog.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser'
      });
    },
    options: {
      comment: '工作日志'
    }
  };
};
