const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectFileRefs } = require('../libs/utils/flow-helpers');
const { registerFileTools } = require('../libs/mcp/file-tools');

const makeServer = fastify => {
  const tools = {};
  registerFileTools({ registerTool: (name, config, handler) => (tools[name] = { config, handler }) }, { fastify, userId: 'u_test' });
  return tools;
};

const makeFileRecord = () => {
  const calls = [];
  return {
    calls,
    uploadToFileSystem: async args => {
      if (args.file && args.file.file && typeof args.file.file.resume === 'function') args.file.file.resume();
      calls.push({ method: 'uploadToFileSystem', args });
      return {
        id: 'uuid-test-1',
        uuid: 'uuid-test-1',
        filename: args.file.filename,
        size: 12,
        mimetype: args.file.mimetype,
        namespace: args.namespace,
        storageType: 'local'
      };
    },
    uploadFromUrl: async args => {
      calls.push({ method: 'uploadFromUrl', args });
      return { id: 'uuid-test-2', uuid: 'uuid-test-2', filename: args.filename, size: 34, mimetype: 'text/markdown', namespace: args.namespace, storageType: 'local' };
    },
    getFileUrl: async ({ id }) => `/api/v1/static/file/abc.md?filename=x.md#${id}`,
    getFileInstance: async ({ id }) => {
      if (id === 'missing') throw new Error('文件不存在');
      return {
        get: () => ({
          uuid: 'uuid-test-1',
          filename: '测试报告.md',
          size: 12,
          mimetype: 'text/markdown',
          namespace: 'flow_deliverable',
          storageType: 'local',
          options: { actorType: 'mcp-ai' }
        })
      };
    },
    getFileBlob: async () => ({ buffer: Buffer.from('# 测试报告\n') })
  };
};

const parse = result => JSON.parse(result.content[0].text);

// ---------- 交付物 fileId 收集（flow_save_deliverables 的校验依据） ----------

test('collectFileRefs 覆盖 file 类型与 jsonb.options 里的 file 项', () => {
  assert.deepEqual(collectFileRefs({ contentType: 'file', payload: { fileId: 'f1', fileName: 'a.md' } }), ['f1']);
  assert.deepEqual(
    collectFileRefs({
      contentType: 'jsonb',
      payload: {
        options: [
          { type: 'file', fileId: 'f1', fileName: 'a.md' },
          { type: 'file', fileId: 'f2', fileName: 'b.png' },
          { type: 'url', url: 'https://example.com' },
          { type: 'text', content: 'x' }
        ]
      }
    }),
    ['f1', 'f2']
  );
});

test('collectFileRefs 收集测试步骤与回归记录中嵌套的截图 fileId', () => {
  assert.deepEqual(
    collectFileRefs({
      contentType: 'jsonb',
      payload: {
        options: [
          { type: 'test_case', caseId: 'c1', label: '登录', steps: [{ stepId: 's1', name: '打开', screenshots: [{ fileId: 'shot-1', fileName: 'a.png' }] }] },
          { type: 'file', fileId: 'shot-2', fileName: 'b.png', stepId: 's1' },
          { type: 'regression_run', runId: 'r1', content: '回归', screenshots: [{ fileId: 'shot-3', fileName: 'c.png' }] }
        ]
      }
    }).sort(),
    ['shot-1', 'shot-2', 'shot-3']
  );
});

test('collectFileRefs 去重并对非文件类型返回空', () => {
  assert.deepEqual(
    collectFileRefs({
      contentType: 'jsonb',
      payload: {
        options: [
          { type: 'file', fileId: 'f1' },
          { type: 'file', fileId: 'f1' }
        ]
      }
    }),
    ['f1']
  );
  assert.deepEqual(collectFileRefs({ contentType: 'text', payload: { content: 'x' } }), []);
  assert.deepEqual(collectFileRefs({ contentType: 'url', payload: { url: 'https://example.com' } }), []);
  assert.deepEqual(collectFileRefs({ contentType: 'file', payload: {} }), []);
});

// ---------- 工具注册 ----------

test('未挂载 fileManager 时不注册文件工具', () => {
  assert.deepEqual(Object.keys(makeServer({})), []);
  assert.deepEqual(Object.keys(makeServer({ fileManager: { services: {} } })), []);
});

test('注册 file_upload 与 file_get 两个工具', () => {
  const tools = makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } });
  assert.deepEqual(Object.keys(tools).sort(), ['file_get', 'file_upload']);
});

// ---------- file_upload ----------

test('file_upload 三种输入必须且只能传一个', async () => {
  const { handler } = makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } }).file_upload;
  const none = parse(await handler({ fileName: 'a.md' }));
  assert.equal(none.error, 'FILE_UPLOAD_FAILED');
  assert.match(none.message, /必须且只能传一个/);
  const two = parse(await handler({ fileName: 'a.md', contentBase64: Buffer.from('x').toString('base64'), sourceUrl: 'https://example.com/a.md' }));
  assert.equal(two.error, 'FILE_UPLOAD_FAILED');
  assert.match(two.message, /必须且只能传一个/);
});

test('file_upload 同机 localPath 上传：返回 fileId、审计元数据写进 options', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-file-channel-'));
  const prev = process.env.FLOW_ARTIFACT_ROOT;
  process.env.FLOW_ARTIFACT_ROOT = root;
  try {
    const target = path.join(root, '测试报告.md');
    fs.writeFileSync(target, '# 测试报告\n');
    const fileRecord = makeFileRecord();
    const { handler } = makeServer({ fileManager: { services: { fileRecord } } }).file_upload;
    const result = parse(await handler({ fileName: '测试报告.md', localPath: target, flowId: 'FLOW-1', runId: 'RUN-1', templateCode: 'test_report' }));
    assert.equal(result.fileId, 'uuid-test-1');
    assert.equal(result.fileName, '测试报告.md');
    assert.equal(result.uploadedBy, 'mcp-ai');
    assert.equal(result.source, 'localPath');
    assert.equal(result.namespace, 'flow_deliverable');
    assert.match(result.sha256, /^[0-9a-f]{64}$/);
    assert.match(result.url, /\/api\/v1\/static\/file\//);
    const saved = fileRecord.calls[0].args;
    assert.equal(saved.namespace, 'flow_deliverable');
    assert.equal(saved.options.actorType, 'mcp-ai');
    assert.equal(saved.options.userId, 'u_test');
    assert.equal(saved.options.flowId, 'FLOW-1');
    assert.equal(saved.options.runId, 'RUN-1');
    assert.equal(saved.options.templateCode, 'test_report');
  } finally {
    if (prev === undefined) delete process.env.FLOW_ARTIFACT_ROOT;
    else process.env.FLOW_ARTIFACT_ROOT = prev;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('file_upload 拒绝越界 localPath、非法 namespace 与非 http(s) sourceUrl', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-file-channel-'));
  const prev = process.env.FLOW_ARTIFACT_ROOT;
  process.env.FLOW_ARTIFACT_ROOT = root;
  try {
    const { handler } = makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } }).file_upload;
    const outside = parse(await handler({ fileName: 'hosts', localPath: '/etc/hosts' }));
    assert.equal(outside.error, 'FILE_UPLOAD_FAILED');
    assert.match(outside.message, /只允许指向产物目录/);
    const badNs = parse(await handler({ fileName: 'a.md', namespace: 'flow/deliverable', contentBase64: Buffer.from('x').toString('base64') }));
    assert.match(badNs.message, /只允许字母、数字、下划线/);
    const badUrl = parse(await handler({ fileName: 'a.md', sourceUrl: 'file:///etc/passwd' }));
    assert.match(badUrl.message, /只支持 http\(s\)/);
  } finally {
    if (prev === undefined) delete process.env.FLOW_ARTIFACT_ROOT;
    else process.env.FLOW_ARTIFACT_ROOT = prev;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('file_upload contentBase64 默认上限 1MB：超过拒绝，正常大小可上传并支持覆盖', async () => {
  const fileRecord = makeFileRecord();
  const { handler } = makeServer({ fileManager: { services: { fileRecord } } }).file_upload;
  const tooBig = parse(await handler({ fileName: 'big.png', contentBase64: Buffer.alloc(1 * 1024 * 1024 + 1).toString('base64') }));
  assert.equal(tooBig.error, 'FILE_UPLOAD_FAILED');
  assert.match(tooBig.message, /内联内容超过/);
  assert.match(tooBig.message, /1048576/);

  const ok = parse(await handler({ fileName: '用例.md', contentBase64: `data:text/markdown;base64,${Buffer.from('# 用例').toString('base64')}` }));
  assert.equal(ok.fileId, 'uuid-test-1');
  assert.equal(ok.source, 'contentBase64');
  assert.equal(fileRecord.calls[0].args.file.mimetype, 'text/markdown');

  const overwrite = parse(await handler({ fileName: '用例.md', contentBase64: Buffer.from('# v2').toString('base64'), fileId: 'uuid-test-1' }));
  assert.equal(overwrite.fileId, 'uuid-test-1');
  assert.equal(fileRecord.calls[1].args.id, 'uuid-test-1');

  const atLimit = parse(await handler({ fileName: 'limit.bin', contentBase64: Buffer.alloc(1 * 1024 * 1024).toString('base64') }));
  assert.equal(atLimit.error, undefined);
  assert.equal(atLimit.source, 'contentBase64');
});

test('file_upload sourceUrl 走服务端抓取，fileName 覆盖 URL 里的文件名', async () => {
  const fileRecord = makeFileRecord();
  const { handler } = makeServer({ fileManager: { services: { fileRecord } } }).file_upload;
  const result = parse(await handler({ fileName: '测试报告.md', sourceUrl: 'https://example.com/report?id=1' }));
  assert.equal(result.fileId, 'uuid-test-2');
  assert.equal(result.source, 'sourceUrl');
  assert.equal(fileRecord.calls[0].method, 'uploadFromUrl');
  assert.equal(fileRecord.calls[0].args.filename, '测试报告.md');
});

// ---------- file_get ----------

test('file_get 返回元信息与 URL，不回传二进制', async () => {
  const { handler } = makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } }).file_get;
  const result = parse(await handler({ fileId: 'uuid-test-1' }));
  assert.equal(result.fileId, 'uuid-test-1');
  assert.equal(result.fileName, '测试报告.md');
  assert.equal(result.size, 12);
  assert.equal(result.options.actorType, 'mcp-ai');
  assert.equal(result.text, undefined);
  assert.equal(result.buffer, undefined);
  assert.match(result.url, /\/api\/v1\/static\/file\//);
});

test('file_get includeText 时内联文本；文件不存在返回 isError', async () => {
  const tools = makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } });
  const result = parse(await tools.file_get.handler({ fileId: 'uuid-test-1', includeText: true }));
  assert.equal(result.text, '# 测试报告\n');
  const missing = await tools.file_get.handler({ fileId: 'missing' });
  assert.equal(missing.isError, true);
  assert.equal(parse(missing).error, 'FILE_NOT_FOUND');
});

// ---------- 返回给 AI 的 URL 必须是完整地址 ----------

test('file_upload / file_get 返回的 url 含 origin，AI 可直接访问', async () => {
  const fastify = { config: { ORIGIN: 'https://doc.example.com/' }, fileManager: { services: { fileRecord: makeFileRecord() } } };
  const expected = 'https://doc.example.com/api/v1/static/file/abc.md?filename=x.md#uuid-test-1';
  const upload = parse(await makeServer(fastify).file_upload.handler({ fileName: 'a.md', contentBase64: Buffer.from('# a').toString('base64') }));
  assert.equal(upload.url, expected);
  const get = parse(await makeServer(fastify).file_get.handler({ fileId: 'uuid-test-1' }));
  assert.equal(get.url, expected);
});

test('已是绝对地址的 OSS URL 原样返回；未配置 ORIGIN 时保留原相对路径', async () => {
  const fileRecord = makeFileRecord();
  fileRecord.getFileUrl = async () => 'https://oss.example.com/file/a.md?sign=1';
  const tools = makeServer({ config: { ORIGIN: 'https://doc.example.com' }, fileManager: { services: { fileRecord } } });
  const result = parse(await tools.file_upload.handler({ fileName: 'a.md', contentBase64: Buffer.from('# a').toString('base64') }));
  assert.equal(result.url, 'https://oss.example.com/file/a.md?sign=1');

  const prev = process.env.ORIGIN;
  delete process.env.ORIGIN;
  try {
    const fallback = parse(await makeServer({ fileManager: { services: { fileRecord: makeFileRecord() } } }).file_upload.handler({ fileName: 'a.md', contentBase64: Buffer.from('# a').toString('base64') }));
    assert.match(fallback.url, /^\/api\/v1\/static\/file\//);
  } finally {
    if (prev === undefined) delete process.env.ORIGIN;
    else process.env.ORIGIN = prev;
  }
});
