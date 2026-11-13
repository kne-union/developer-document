const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');

const RUNTIME_GLOBS_ROOT = ['index.js', 'server.js'];

const walkJs = dir => {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'test') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walkJs(full));
    else if (/\.(js|cjs|mjs)$/.test(name)) out.push(full);
  }
  return out;
};

const runtimeFiles = () => {
  const files = walkJs(path.join(serverRoot, 'libs'));
  for (const name of RUNTIME_GLOBS_ROOT) {
    const full = path.join(serverRoot, name);
    if (fs.existsSync(full)) files.push(full);
  }
  return files;
};

const SRC_REQUIRE = /require\((['"])([^'"]*\/src\/[^'"]*|[^'"]*src\/components[^'"]*)\1\)/;

test('server 运行时不再 require 仓库 src 或前端模块路径', () => {
  const offenders = [];
  for (const file of runtimeFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    if (SRC_REQUIRE.test(text)) {
      offenders.push(path.relative(serverRoot, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test('在仅含 server 的隔离部署目录中可加载 flow helper / service（src 不存在）', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'node-app-'));
  try {
    const copyDir = (src, dest) => {
      fs.cpSync(src, dest, {
        recursive: true,
        filter: source => !source.split(path.sep).includes('node_modules')
      });
    };
    copyDir(path.join(serverRoot, 'libs'), path.join(tmp, 'libs'));
    for (const name of ['index.js', 'server.js', 'package.json']) {
      const src = path.join(serverRoot, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, name));
    }
    const nodeModules = path.join(serverRoot, 'node_modules');
    assert.equal(fs.existsSync(nodeModules), true, 'server/node_modules 必须已安装，才能在隔离目录解析生产依赖');
    fs.symlinkSync(nodeModules, path.join(tmp, 'node_modules'));

    assert.equal(fs.existsSync(path.join(tmp, 'src')), false);
    // 与生产一致：从 libs/utils 解析 ../../../src 不应落到本仓库 src
    const leakedSrc = path.resolve(tmp, 'libs/utils/../../../src/components/AdminFlowManagement/testExecution.js');
    assert.equal(fs.existsSync(leakedSrc), false, `隔离目录解析到了意外的 src 路径：${leakedSrc}`);
    // 对照：仓库根的 src 仍然存在，但不能被隔离进程用到
    assert.equal(fs.existsSync(path.join(repoRoot, 'src/components/AdminFlowManagement/testExecution.js')), true);

    const probe = `'use strict';
const assert = require('node:assert/strict');
const helpers = require('./libs/utils/flow-helpers');
const confirmation = require('./libs/services/flow-confirmation');
const flow = require('./libs/services/flow');
assert.equal(typeof helpers.collectFileRefs, 'function');
assert.equal(typeof confirmation, 'function');
assert.equal(typeof flow, 'function');
const ids = helpers.collectFileRefs({
  contentType: 'jsonb',
  payload: {
    fileId: 'top-file',
    options: [
      {
        type: 'test_case',
        steps: [{ screenshots: [{ fileId: 'step-shot' }, { fileId: 'step-shot' }] }]
      },
      {
        type: 'regression_run',
        screenshots: [{ fileId: 'regression-shot' }]
      }
    ]
  }
});
assert.deepEqual(ids.sort(), ['regression-shot', 'step-shot', 'top-file']);
console.log('LOAD_OK');
`;
    fs.writeFileSync(path.join(tmp, 'probe.js'), probe);
    const result = spawnSync(process.execPath, ['probe.js'], {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    assert.equal(result.status, 0, `隔离 require 失败：\\nstdout:\\n${result.stdout}\\nstderr:\\n${result.stderr}`);
    assert.match(result.stdout, /LOAD_OK/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
