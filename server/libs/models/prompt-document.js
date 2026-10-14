module.exports = ({ DataTypes }) => {
  return {
    model: {
      packageName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Prompts 类型 npm 包名'
      },
      version: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '提示词所属包版本'
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '相对包内 prompts/ 的路径'
      },
      title: {
        type: DataTypes.STRING,
        comment: '标题（首个一级标题或文件名）'
      },
      content: {
        type: DataTypes.TEXT,
        comment: '提示词 markdown 全文'
      }
    },
    options: {
      comment: 'Prompts 包内的提示词文档（每个包只保留最新同步的版本）'
    }
  };
};
