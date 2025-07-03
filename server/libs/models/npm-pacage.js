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
      }
    },
    options: {
      comment: 'npm package'
    }
  };
};
