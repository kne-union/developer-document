module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      searchType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'experience | document_index | document'
      },
      query: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '搜索关键词'
      },
      hitCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '命中数'
      },
      topHits: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: 'Top 命中摘要'
      },
      source: {
        type: DataTypes.STRING,
        defaultValue: 'rest',
        comment: 'mcp | rest'
      }
    },
    associate: ({ searchRecord }) => {
      searchRecord.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser'
      });
    },
    options: {
      comment: '搜索记录'
    }
  };
};
