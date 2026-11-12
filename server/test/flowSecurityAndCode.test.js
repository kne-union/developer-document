const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { Snowflake } = require('nodejs-snowflake');
const { hashToken } = require('../libs/utils/flow-helpers');
const { openIsolatedSecurityDb, PROJECT_EPOCH } = require('./helpers/isolatedSecurityDb');
const { createFlowSecurity } = require('../libs/utils/flow-security-store');

const payload = (over = {}) => ({
  flowId: 'F1',
  runId: 'R1',
  action: 'review',
  stage: 'testing',
  version: 3,
  actorUserId: 'u_ai',
  ...over
});

test('createFlowSecurity 在缺少模型时拒绝启动，无内存 fallback', () => {
  assert.throws(() => createFlowSecurity({ models: {}, sequelize: { query() {} }, generateId: () => '1' }), /flowCheckToken/);
});

test('签发只把 token 哈希入库，明文可校验且重启后未过期仍有效', async () => {
  const db = await openIsolatedSecurityDb({ instanceId: 1 });
  try {
    const issued = await db.issueCheckToken(payload());
    assert.match(issued.checkToken, /^relchk_/);
    assert.equal(issued.expiresIn, 300);
    const rows = await db.models.flowCheckToken.findAll();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tokenHash, hashToken(issued.checkToken));
    assert.notEqual(rows[0].tokenHash, issued.checkToken);
    assert.equal(rows[0].previewed, false);
    assert.equal(rows[0].consumedAt, null);
    assert.equal(String(rows[0].flowId), 'F1');

    const storage = db.storage;
    await db.sequelize.close();
    const reopened = await openIsolatedSecurityDb({ filename: storage, instanceId: 1 });
    try {
      const entry = await reopened.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review', actorUserId: 'u_ai', version: 3, runId: 'R1', stage: 'testing' }, { consume: false });
      assert.equal(entry.previewed, false);
      await reopened.markCheckTokenPreviewed(issued.checkToken);
      const after = await reopened.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review' }, { consume: true });
      assert.equal(after.previewed, true);
      assert.ok(after.consumedAt);
    } finally {
      await reopened.close();
    }
  } finally {
    try {
      await db.close();
    } catch (_) {}
  }
});

test('过期凭证视为无效；清理按 expiresAt 删除', async () => {
  const db = await openIsolatedSecurityDb();
  try {
    const issued = await db.issueCheckToken(payload(), { now: Date.now() - 10 * 60 * 1000 });
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1' }, { consume: false }), err => err.code === 'CHECK_TOKEN_INVALID');
    const cleaned = await db.cleanupExpiredFlowSecurity({ now: Date.now() });
    assert.equal(cleaned.tokens, 1);
    assert.equal(await db.models.flowCheckToken.count(), 0);
  } finally {
    await db.close();
  }
});

test('actor / action / version / flow / run / stage 绑定失败不消费', async () => {
  const db = await openIsolatedSecurityDb();
  try {
    const issued = await db.issueCheckToken(payload());
    await db.markCheckTokenPreviewed(issued.checkToken);
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review', actorUserId: 'other' }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'waive', actorUserId: 'u_ai' }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review', actorUserId: 'u_ai', version: 99 }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F2', action: 'review', actorUserId: 'u_ai' }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review', runId: 'R-other', actorUserId: 'u_ai' }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    await assert.rejects(db.takeCheckToken(issued.checkToken, { flowId: 'F1', action: 'review', stage: 'development', actorUserId: 'u_ai' }, { consume: true }), err => err.code === 'CHECK_TOKEN_MISMATCH');
    const row = await db.models.flowCheckToken.findOne();
    assert.equal(row.consumedAt, null);
    const ok = await db.takeCheckToken(issued.checkToken, payload(), { consume: true });
    assert.ok(ok.consumedAt);
  } finally {
    await db.close();
  }
});

test('dryRun 不消费；未预览的正式放行被拒；正式放行一次性消费', async () => {
  const db = await openIsolatedSecurityDb();
  try {
    const issued = await db.issueCheckToken(payload());
    await assert.rejects(db.takeCheckToken(issued.checkToken, payload(), { consume: true }), err => err.code === 'DRYRUN_REQUIRED');
    const peeked = await db.takeCheckToken(issued.checkToken, payload(), { consume: false });
    assert.equal(peeked.previewed, false);
    await db.markCheckTokenPreviewed(issued.checkToken);
    const consumed = await db.takeCheckToken(issued.checkToken, payload(), { consume: true });
    assert.ok(consumed.consumedAt);
    await assert.rejects(db.takeCheckToken(issued.checkToken, payload(), { consume: true }), err => err.code === 'CHECK_TOKEN_INVALID');
    await assert.rejects(db.takeCheckToken(issued.checkToken, payload(), { consume: false }), err => err.code === 'CHECK_TOKEN_INVALID');
  } finally {
    await db.close();
  }
});

test('正式消费与失败回滚在同一事务：回滚后凭证仍可消费', async () => {
  const db = await openIsolatedSecurityDb();
  try {
    const issued = await db.issueCheckToken(payload());
    await db.markCheckTokenPreviewed(issued.checkToken);
    await assert.rejects(
      db.sequelize.transaction(async tx => {
        await db.takeCheckToken(issued.checkToken, payload(), { consume: true, transaction: tx });
        const mid = await db.models.flowCheckToken.findOne({ transaction: tx });
        assert.ok(mid.consumedAt);
        throw new Error('boom');
      }),
      err => err.message === 'boom'
    );
    const after = await db.models.flowCheckToken.findOne();
    assert.equal(after.consumedAt, null);
    const ok = await db.takeCheckToken(issued.checkToken, payload(), { consume: true });
    assert.ok(ok.consumedAt);
  } finally {
    await db.close();
  }
});

test('同一凭证并发正式消费只有一次成功（真实 SQL 事务，双连接）', async () => {
  const shared = path.join(os.tmpdir(), `flow-conc-${process.pid}-${Date.now()}.sqlite`);
  const a = await openIsolatedSecurityDb({ filename: shared, instanceId: 1 });
  const b = await openIsolatedSecurityDb({ filename: shared, instanceId: 2 });
  try {
    const issued = await a.issueCheckToken(payload());
    await a.markCheckTokenPreviewed(issued.checkToken);
    const consume = store =>
      store.sequelize.transaction(async tx => {
        await store.takeCheckToken(issued.checkToken, payload(), { consume: true, transaction: tx });
        return 'consumed';
      });
    const results = await Promise.allSettled([consume(a), consume(b), consume(a), consume(b), consume(a), consume(b)]);
    const fulfilled = results.filter(item => item.status === 'fulfilled');
    const rejected = results.filter(item => item.status === 'rejected');
    const reasons = rejected.map(item => (item.reason && (item.reason.code || item.reason.message)) || String(item.reason)).join(',');
    assert.equal(fulfilled.length, 1, `expected 1 success, got ${fulfilled.length}, rejected=${reasons}`);
    assert.equal(rejected.length, results.length - 1);
    const row = await a.models.flowCheckToken.findOne();
    assert.ok(row.consumedAt);
  } finally {
    await b.close();
    await a.close();
    for (const ext of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(shared + ext);
      } catch (_) {}
    }
  }
});

test('限流原子递增：跨连接共享窗口，超限抛 RATE_LIMITED，窗口过期后重新计数', async () => {
  const shared = path.join(os.tmpdir(), `flow-rate-${process.pid}-${Date.now()}.sqlite`);
  const a = await openIsolatedSecurityDb({ filename: shared, instanceId: 1 });
  const b = await openIsolatedSecurityDb({ filename: shared, instanceId: 2 });
  const now = Date.now();
  try {
    // 每轮两个独立连接各写一次并发行；同一 Sequelize 实例上并行开事务在 sqlite 连接池下会互锁，不能用来模拟多路并发。
    for (let round = 0; round < 5; round += 1) {
      const pair = await Promise.allSettled([a.assertRateLimit('F1', 'u1', { now }), b.assertRateLimit('F1', 'u1', { now })]);
      const failed = pair.filter(item => item.status === 'rejected');
      assert.equal(failed.length, 0, failed.map(item => item.reason && (item.reason.message || item.reason)).join(','));
    }
    const row = await a.models.flowRateLimit.findOne({ where: { windowKey: `F1:u1:${Math.floor(now / 60000)}` } });
    assert.equal(Number(row.count), 10);

    let ok = 0;
    let limited = 0;
    for (let i = 0; i < 60; i += 1) {
      try {
        await a.assertRateLimit('F1', 'u1', { now });
        ok += 1;
      } catch (err) {
        if (!err || err.code !== 'RATE_LIMITED') throw err;
        limited += 1;
      }
    }
    assert.equal(ok, 50);
    assert.equal(limited, 10);
    const after = await a.models.flowRateLimit.findOne({ where: { windowKey: `F1:u1:${Math.floor(now / 60000)}` } });
    assert.equal(Number(after.count), 70);

    const nextWindow = now + 60 * 1000;
    await a.assertRateLimit('F1', 'u1', { now: nextWindow });
    const later = await a.models.flowRateLimit.findOne({ where: { windowKey: `F1:u1:${Math.floor(nextWindow / 60000)}` } });
    assert.equal(Number(later.count), 1);

    const cleaned = await a.cleanupExpiredFlowSecurity({ now: nextWindow + 3 * 60 * 1000 });
    assert.ok(cleaned.rates >= 1);
  } finally {
    await b.close();
    await a.close();
    for (const ext of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(shared + ext);
      } catch (_) {}
    }
  }
});

test('业务编号使用项目雪花 ID 字符串，不用记录数；主键与 code 区分；须防 JS 精度丢失', () => {
  const one = new Snowflake({ instance_id: 1, custom_epoch: PROJECT_EPOCH });
  const two = new Snowflake({ instance_id: 2, custom_epoch: PROJECT_EPOCH });
  const codes = new Set();
  for (let i = 0; i < 20; i += 1) {
    const raw = i % 2 === 0 ? one.getUniqueID() : two.getUniqueID();
    const code = String(raw);
    assert.equal(typeof raw, 'bigint');
    assert.equal(typeof code, 'string');
    assert.match(code, /^\d+$/);
    assert.ok(code.length >= 10 && code.length <= 32);
    assert.doesNotMatch(code, /^FLOW-\d{6}-/);
    // 雪花十进制通常超过 Number.MAX_SAFE_INTEGER，必须用字符串保存（个别值碰巧能被 Number 精确表示，不作为反例）
    assert.ok(BigInt(code) > BigInt(Number.MAX_SAFE_INTEGER), '雪花 ID 超过 MAX_SAFE_INTEGER，须用字符串而非 Number');
    assert.equal(String(BigInt(code)), code);
    codes.add(code);
  }
  assert.equal(codes.size, 20);
});

test('两个 worker 使用不同 instance_id 时编号互不碰撞（同一毫秒批量）', () => {
  const workers = [1, 2, 3].map(instance_id => new Snowflake({ instance_id, custom_epoch: PROJECT_EPOCH }));
  const codes = workers.flatMap(s => Array.from({ length: 50 }, () => String(s.getUniqueID())));
  assert.equal(new Set(codes).size, codes.length);
});
