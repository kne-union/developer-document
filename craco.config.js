const path = require("path");
const {CracoRemoteComponentsPlugin} = require("@kne/modules-dev");
const aliasConfig = require("./webstorm.webpack.config");

process.env.CI = false;

const sharedTestExecution = path.resolve(__dirname, "server/libs/utils/test-execution.js");

module.exports = {
    webpack: {
        alias: aliasConfig.resolve.alias, configure: (webpackConfig) => {
            const definePlugin = webpackConfig.plugins.find((plugin) => plugin.constructor.name === "DefinePlugin");
            Object.assign(definePlugin.definitions["process.env"], {
                DEFAULT_VERSION: `"${process.env.npm_package_version}"`
            });
            // ModuleScopePlugin 用「issuer 目录 + 请求字符串」做绝对路径比对，不含自动补 .js。
            // 因此同时放行带/不带扩展名的路径，且不放开整个仓库。
            const scopePlugin = (webpackConfig.resolve.plugins || []).find((plugin) => plugin.constructor.name === "ModuleScopePlugin");
            if (!scopePlugin || !scopePlugin.allowedFiles) {
                throw new Error("未找到 webpack ModuleScopePlugin，无法放行 server/libs/utils/test-execution.js");
            }
            scopePlugin.allowedFiles.add(sharedTestExecution);
            scopePlugin.allowedFiles.add(sharedTestExecution.replace(/\.js$/, ""));
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
