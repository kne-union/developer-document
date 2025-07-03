module.exports = ({ DataTypes, options }) => {
  return {
    model: {
      remote: {
        type: DataTypes.STRING,
        comment: '远程组件名称',
        allowNull: false,
        unique: true
      },
      url: {
        type: DataTypes.STRING,
        comment: '入口文件地址'
      },
      packageName: {
        type: DataTypes.STRING,
        comment: 'npm package name'
      },
      tpl: {
        type: DataTypes.STRING,
        comment: '加载地址模版',
        defaultValue: '{{url}}/components/@kne-components/{{remote}}/{{version}}/build'
      },
      name: {
        type: DataTypes.STRING,
        comment: '组件名称'
      },
      description: {
        type: DataTypes.STRING,
        comment: '组件描述'
      },
      versions: {
        type: DataTypes.JSON,
        comment: '组件版本列表，如果是npm package，会自动获取',
        defaultValue: []
      },
      defaultVersion: {
        type: DataTypes.STRING,
        comment: '默认版本'
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        comment: '是否公开',
        defaultValue: true
      }
    },
    options: {
      comment: '远程组件库'
    }
  };
};
