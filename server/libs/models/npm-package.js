module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      packageName: {
        type: DataTypes.STRING,
        comment: 'npm package name',
        allowNull: false,
        unique: true
      },
      registry: {
        type: DataTypes.STRING,
        comment: 'npm registry',
        defaultValue: 'https://registry.npmjs.org/'
      },
      name: {
        type: DataTypes.STRING,
        comment: '组件显示名称'
      },
      description: {
        type: DataTypes.TEXT,
        comment: '组件描述'
      },
      type: {
        type: DataTypes.STRING,
        comment: '组件类型：frontend-前端组件, nodejs-NodeJS, engineering-工程化, miniprogram-小程序, prompts-Prompts, other-其他',
        defaultValue: 'other'
      },
      keywords: {
        type: DataTypes.JSONB,
        comment: '关键词标签',
        defaultValue: []
      },
      examples: {
        type: DataTypes.JSONB,
        comment: '示例列表',
        defaultValue: []
      },
      versions: {
        type: DataTypes.JSONB,
        comment: '版本列表',
        defaultValue: {}
      },
      distTags: {
        type: DataTypes.JSONB,
        comment: 'dist-tags'
      },
      readme: {
        type: DataTypes.TEXT,
        comment: 'readme'
      },
      latestVersion: {
        type: DataTypes.STRING,
        comment: '最新版本'
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        comment: '是否公开',
        defaultValue: true
      }
    },
    options: {
      comment: 'npm package'
    }
  };
};
