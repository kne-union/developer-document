module.exports = ({ DataTypes }) => {
  return {
    model: {
      docId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '文档 id（包名或 remote）'
      },
      version: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '版本'
      },
      source: {
        type: DataTypes.STRING,
        comment: 'npm | remote'
      },
      indexData: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'index.json'
      },
      componentsData: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'components.json'
      },
      meta: {
        type: DataTypes.JSONB,
        defaultValue: {},
        comment: 'meta.json'
      },
      searchText: {
        type: DataTypes.TEXT,
        comment: '全文检索文本'
      }
    },
    options: {
      comment: '组件/npm 文档索引'
    }
  };
};
