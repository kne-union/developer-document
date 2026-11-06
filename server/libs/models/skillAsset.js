module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      type: {
        type: DataTypes.ENUM('rule', 'skill'),
        allowNull: false,
        defaultValue: 'skill',
        comment: 'rule 规则 | skill 技能'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '唯一标识（rule 用文件名，skill 用目录名）'
      },
      title: {
        type: DataTypes.STRING,
        comment: '标题'
      },
      description: {
        type: DataTypes.TEXT,
        comment: '描述'
      },
      alwaysApply: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '仅 rule：是否常驻生效'
      },
      globs: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '仅 rule：生效文件匹配'
      },
      category: {
        type: DataTypes.STRING,
        comment: 'business | library | process | ...'
      },
      keywords: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: '关键词'
      },
      content: {
        type: DataTypes.TEXT,
        comment: 'Markdown 正文'
      },
      status: {
        type: DataTypes.ENUM('active', 'closed'),
        defaultValue: 'active',
        comment: 'active 启用 closed 关闭'
      },
      source: {
        type: DataTypes.STRING,
        comment: '来源标记（如 cursor-setting / manual）'
      }
    },
    associate: ({ skillAsset }) => {
      skillAsset.belongsTo(options.getUserModel(), {
        foreignKey: 'createdUserId',
        as: 'createdUser'
      });
    },
    options: {
      comment: '受管技能与规则',
      // 删除即物理删除：否则软删行仍占用 (type, name) 唯一索引，无法重建同名条目
      paranoid: false,
      indexes: [
        {
          unique: true,
          fields: ['type', 'name']
        }
      ]
    }
  };
};
