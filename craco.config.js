const {CracoRemoteComponentsPlugin} = require("@kne/modules-dev");
const aliasConfig = require("./webstorm.webpack.config");

process.env.CI = false;

module.exports = {
    webpack: {
        alias: aliasConfig.resolve.alias, configure: (webpackConfig) => {
            const definePlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === "DefinePlugin");
            Object.assign(definePlugin.definitions["process.env"], {
                DEFAULT_VERSION: `"${process.env.npm_package_version}"`
            });
            return webpackConfig;
        }
    }, plugins: [{
        plugin: CracoRemoteComponentsPlugin,
        options: {
            // 官方原生开关：编译器由 @kne/modules-dev 内置，不在业务项目再装 babel-plugin-react-compiler。
            // target '19' 使用本项目 react 提供的 react/compiler-runtime，并由插件做单例共享。
            reactCompiler: { target: '19' }
        }
    }]
};
