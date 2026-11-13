const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

describe('React Compiler：原生开关且产生有效 transform', () => {
  test('craco 只用 modules-dev 原生 reactCompiler.target=19，业务 package 不单独装编译器插件', () => {
    const craco = require(path.join(root, 'craco.config.js'));
    const plugin = (craco.plugins || []).find(item => item && item.plugin && (item.plugin.overrideCracoConfig || item.options));
    const options = (craco.plugins.find(item => item.options && item.options.reactCompiler) || {}).options;
    assert.deepEqual(options.reactCompiler, { target: '19' });
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const all = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    assert.equal(all['babel-plugin-react-compiler'], undefined);
    assert.equal(all['react-compiler-runtime'], undefined);
  });

  test('官方插件把 babel-plugin-react-compiler 注入到 CRA 应用 babel-loader，且编译器能改写组件', () => {
    const { buildCompilerConfig, resolveCompilerPlugin, overrideWebpackConfig, getCompilerSharedEntries, assertReact19Runtime } = require('@kne/modules-dev/lib/craco-react-compiler-plugin');
    const compilerConfig = buildCompilerConfig({ target: '19' });
    assert.equal(compilerConfig.target, '19');
    assert.equal(compilerConfig.compilerOptions.target, '19');
    const pluginPath = resolveCompilerPlugin(compilerConfig.pluginName);
    assert.match(pluginPath, /babel-plugin-react-compiler/);
    assertReact19Runtime('19');

    const webpackConfig = {
      module: {
        rules: [
          {
            oneOf: [
              {
                loader: '/virtual/babel-loader/index.js',
                options: {
                  presets: ['/virtual/babel-preset-react-app/index.js'],
                  plugins: []
                }
              },
              {
                loader: '/virtual/babel-loader/index.js',
                options: {
                  presets: ['/virtual/babel-preset-react-app/dependencies.js'],
                  plugins: []
                }
              }
            ]
          }
        ]
      }
    };
    // 使用官方导出的 overrideWebpackConfig（injectCompilerPlugin 未导出）
    overrideWebpackConfig({ webpackConfig, pluginOptions: { reactCompiler: { target: '19' } }, cracoConfig: {} });
    const app = webpackConfig.module.rules[0].oneOf[0].options;
    const dep = webpackConfig.module.rules[0].oneOf[1].options;
    assert.equal(app.plugins[0][0], pluginPath);
    assert.deepEqual(app.plugins[0][1], compilerConfig.compilerOptions);
    assert.match(String(app.cacheIdentifier), /react-compiler-/);
    assert.equal((dep.plugins || []).length, 0);

    const shared = getCompilerSharedEntries('19');
    assert.deepEqual(shared['react/compiler-runtime'], { singleton: true, requiredVersion: false });

    const babel = require('@babel/core');
    const src = `function Counter({ count }) {\n  const doubled = count * 2;\n  return <div>{doubled}</div>;\n}\nexport default Counter;\n`;
    const result = babel.transformSync(src, {
      filename: 'Counter.js',
      plugins: [[pluginPath, compilerConfig.compilerOptions]],
      presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
      babelrc: false,
      configFile: false,
      compact: false
    });
    assert.match(result.code, /react\/compiler-runtime/);
    assert.match(result.code, /_c\(/);
    assert.match(result.code, /const \$ = _c\(/);
  });

  test('若存在 compile 产物，其中含 compiler-runtime 引用与 memo_cache 改写标记', () => {
    const buildDir = path.join(root, 'build');
    if (!fs.existsSync(buildDir)) {
      return;
    }
    const walk = dir => {
      const out = [];
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) out.push(...walk(full));
        else if (/\.(js|mjs)$/.test(name)) out.push(full);
      }
      return out;
    };
    const files = walk(path.join(buildDir, 'static')).filter(Boolean);
    // 必须是 compiler-runtime 模块引用，以及组件被改写后的 memo cache 标记。
    // 单独 _c( 在压缩产物里会误报，生产包会把 _c 改名。
    const hasRuntime = files.some(file => fs.readFileSync(file, 'utf8').includes('react/compiler-runtime'));
    const hasTransform = files.some(file => {
      const text = fs.readFileSync(file, 'utf8');
      return text.includes('react.memo_cache_sentinel') || text.includes('useMemoCache');
    });
    assert.equal(hasRuntime, true, 'build 产物应含 react/compiler-runtime 模块引用（含 MF 单例共享）');
    assert.equal(hasTransform, true, 'build 产物应含编译器改写标记 react.memo_cache_sentinel 或 useMemoCache');
  });
});

describe('远程组件与 React 版本清单（配置契约）', () => {
  test('preset 覆盖全部已配置 remote，admin 不用 CDN 404 的 npm 最新', () => {
    const src = fs.readFileSync(path.join(__dirname, 'preset.js'), 'utf8');
    const versions = {};
    const re = /remote:\s*'([^']+)'[\s\S]*?defaultVersion:\s*'([^']+)'/g;
    let match;
    while ((match = re.exec(src))) versions[match[1]] = match[2];
    assert.deepEqual(versions, {
      'components-core': '0.7.6',
      'components-iconfont': '0.3.0',
      'components-file-manager': '0.1.13',
      'components-admin': '1.1.146',
      'components-thirdparty': '0.1.61',
      'components-app-manager': '0.1.1'
    });
    assert.match(src, /1\.1\.148[\s\S]*404|CDN remoteEntry 为 404/);
  });

  test('本项目 react / react-dom 与 modules-dev 指向最新稳定，antd 保持 6', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.devDependencies.react, '^19.3.1');
    assert.equal(pkg.devDependencies['react-dom'], '^19.3.1');
    assert.equal(pkg.devDependencies['@kne/modules-dev'], '^2.4.21');
    assert.match(pkg.devDependencies.antd, /\^6\./);
  });
});
