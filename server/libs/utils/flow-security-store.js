/**
 * 放行 checkToken 与写入限流的数据库实现。
 * 不保留进程内 Map，不提供内存 fallback。明文 token 只在签发时返回，库内仅存 SHA-256。
 * 正式消费必须与业务写入共用同一事务，失败回滚后凭证仍可消费。
 */
const { Op, QueryTypes, Transaction } = require('sequelize');

const CHECK_TOKEN_TTL = 5 * 60 * 1000;
const RATE_LIMIT_PER_MINUTE = 60;
const RATE_WINDOW_MS = 60 * 1000;

const quotedTable = (model, sequelize) => {
  const raw = typeof model.getTableName === 'function' ? model.getTableName() : model.tableName;
  const generator = sequelize && sequelize.getQueryInterface && sequelize.getQueryInterface().queryGenerator;
  if (generator && typeof generator.quoteTable === 'function') {
    return generator.quoteTable(typeof raw === 'string' ? raw : raw.tableName);
  }
  const name = typeof raw === 'string' ? raw : raw.tableName;
  return `"${String(name).replace(/"/g, '""')}"`;
};

const formatSqlDate = (sequelize, value) => {
  const date = value instanceof Date ? value : new Date(value);
  const escaped = sequelize.escape(date);
  return String(escaped).replace(/^'|'$/g, '');
};

const isSequelizeTransaction = transaction => !!(transaction && (typeof transaction.commit === 'function' || transaction.sequelize));

const isBusyError = err => /SQLITE_BUSY|SQLITE_LOCKED|database is locked/i.test(String((err && err.parent && err.parent.message) || (err && err.message) || err || ''));

const withBusyRetry = async (fn, attempts = 12) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isBusyError(err) || i === attempts - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 15 + i * 25));
    }
  }
  throw last;
};

const lookupLock = (transaction, sequelize) => {
  if (!isSequelizeTransaction(transaction)) return undefined;
  if (sequelize.getDialect && sequelize.getDialect() === 'sqlite') return undefined;
  return transaction.LOCK ? transaction.LOCK.UPDATE : 'UPDATE';
};

const entryFromRow = row => {
  const data = row && typeof row.get === 'function' ? row.get({ plain: true }) : row;
  return {
    flowId: data.flowId,
    runId: data.runId,
    action: data.action,
    toStage: data.toStage,
    stage: data.stage,
    subject: data.subject,
    actorUserId: data.actorUserId,
    version: data.version,
    previewed: !!data.previewed,
    consumedAt: data.consumedAt || null,
    expiresAt: data.expiresAt
  };
};

const assertNotExpired = (row, now) => {
  const expires = row.expiresAt instanceof Date ? row.expiresAt.getTime() : new Date(row.expiresAt).getTime();
  if (!Number.isFinite(expires) || expires < now) return false;
  if (row.consumedAt) return false;
  return true;
};

const createFlowSecurity = ({ models, sequelize, generateId }) => {
  const { fail, asId, uid, hashToken } = require('./flow-helpers');
  if (!models || !models.flowCheckToken || !models.flowRateLimit) {
    throw new Error('createFlowSecurity 需要 models.flowCheckToken 与 models.flowRateLimit，不再使用进程内存 Map');
  }
  if (!sequelize || typeof sequelize.query !== 'function') {
    throw new Error('createFlowSecurity 需要 Sequelize 实例');
  }
  const nextId = () => {
    if (typeof generateId !== 'function') throw new Error('createFlowSecurity 需要 generateId（项目雪花 ID）');
    return String(generateId());
  };

  let lastCleanupAt = 0;
  const maybeCleanup = async now => {
    if (now - lastCleanupAt < 3000) return;
    lastCleanupAt = now;
    await cleanupExpiredFlowSecurity({ now }).catch(() => {});
  };

  const cleanupExpiredFlowSecurity = async ({ transaction, now = Date.now() } = {}) => {
    const at = new Date(now);
    const opts = { where: { expiresAt: { [Op.lt]: at } } };
    if (isSequelizeTransaction(transaction)) opts.transaction = transaction;
    const tokens = await models.flowCheckToken.destroy(opts);
    const rates = await models.flowRateLimit.destroy(opts);
    return { tokens, rates };
  };

  const issueCheckToken = async (payload = {}, { transaction, now = Date.now() } = {}) => {
    await cleanupExpiredFlowSecurity({ now }).catch(() => {});
    const token = uid('relchk_');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(now + CHECK_TOKEN_TTL);
    const row = {
      id: nextId(),
      tokenHash,
      flowId: asId(payload.flowId),
      runId: payload.runId != null ? asId(payload.runId) : null,
      action: payload.action,
      toStage: payload.toStage != null ? payload.toStage : null,
      stage: payload.stage != null ? payload.stage : null,
      subject: payload.subject != null ? payload.subject : null,
      actorUserId: payload.actorUserId != null ? asId(payload.actorUserId) : null,
      version: payload.version != null ? Number(payload.version) : null,
      previewed: false,
      consumedAt: null,
      expiresAt
    };
    const opts = isSequelizeTransaction(transaction) ? { transaction } : {};
    await models.flowCheckToken.create(row, opts);
    return { checkToken: token, expiresIn: CHECK_TOKEN_TTL / 1000 };
  };

  const findTokenRow = async (token, { transaction, now = Date.now() } = {}) => {
    if (!token) {
      throw fail('CHECK_TOKEN_INVALID', 'checkToken 无效或已过期，请重新调用 flow_release_check');
    }
    const tokenHash = hashToken(String(token));
    const query = { where: { tokenHash } };
    if (isSequelizeTransaction(transaction)) {
      query.transaction = transaction;
      const lock = lookupLock(transaction, sequelize);
      if (lock) query.lock = lock;
    }
    const row = await models.flowCheckToken.findOne(query);
    if (!row || !assertNotExpired(row, now)) {
      throw fail('CHECK_TOKEN_INVALID', 'checkToken 无效或已过期，请重新调用 flow_release_check');
    }
    return row;
  };

  const assertBindings = (entry, expected = {}) => {
    const mismatch = key => {
      const stored = entry[key];
      const wanted = expected[key];
      if (stored === undefined || stored === null || wanted === undefined || wanted === null) return false;
      return asId(stored) !== asId(wanted);
    };
    if (['flowId', 'runId', 'action', 'toStage', 'stage', 'subject', 'actorUserId', 'version'].some(mismatch)) {
      throw fail('CHECK_TOKEN_MISMATCH', 'checkToken 与本次放行动作不匹配，请重新调用 flow_release_check');
    }
  };

  /** dryRun 预览通过后打标记，正式放行必须携带该标记；标记本身不消费 token */
  const markCheckTokenPreviewed = async (token, { transaction, now = Date.now() } = {}) => {
    const work = async tx => {
      const row = await findTokenRow(token, { transaction: tx, now });
      assertBindings(entryFromRow(row), {});
      await row.update({ previewed: true }, { transaction: tx });
      return entryFromRow(row);
    };
    if (isSequelizeTransaction(transaction)) return work(transaction);
    return sequelize.transaction(work);
  };

  /**
   * 校验并（默认）消费 checkToken。
   * 预检写入的 flowId / action / toStage / stage / runId / actorUserId / version 全部逐项绑定。
   * 正式消费（consume=true）须在事务内完成：先要求已 previewed，再一次性写入 consumedAt；事务回滚则未消费。
   */
  const takeCheckToken = async (token, expected = {}, { consume = true, transaction, now = Date.now() } = {}) => {
    const work = async tx => {
      const row = await findTokenRow(token, { transaction: tx, now });
      const entry = entryFromRow(row);
      assertBindings(entry, expected);
      if (consume) {
        if (!entry.previewed) throw fail('DRYRUN_REQUIRED', '正式放行前必须先以 dryRun=true 执行一次预览');
        const [affected] = await models.flowCheckToken.update({ consumedAt: new Date(now) }, { where: { id: row.id, consumedAt: null, previewed: true }, transaction: tx });
        if (affected !== 1) {
          throw fail('CHECK_TOKEN_INVALID', 'checkToken 无效或已过期，请重新调用 flow_release_check');
        }
        entry.consumedAt = new Date(now);
      }
      return entry;
    };
    if (isSequelizeTransaction(transaction)) return work(transaction);
    if (consume) {
      // 正式消费必须有事务，以便与业务写入一同回滚
      return sequelize.transaction(work);
    }
    return work(undefined);
  };

  const assertRateLimit = async (flowId, userId, { transaction, now = Date.now() } = {}) => {
    if (!isSequelizeTransaction(transaction)) await maybeCleanup(now);
    const windowStart = Math.floor(now / RATE_WINDOW_MS);
    const windowKey = `${flowId || '-'}:${userId || '-'}:${windowStart}`;
    const expiresAt = new Date((windowStart + 2) * RATE_WINDOW_MS);
    const table = quotedTable(models.flowRateLimit, sequelize);
    const replacements = {
      id: nextId(),
      windowKey,
      flowId: flowId != null ? String(flowId) : '-',
      userId: userId != null ? String(userId) : '-',
      windowStart,
      expiresAt: formatSqlDate(sequelize, expiresAt),
      createdAt: formatSqlDate(sequelize, new Date(now)),
      updatedAt: formatSqlDate(sequelize, new Date(now))
    };
    // 原子 UPSERT 后在同一事务内读取 count。Postgres 的 ON CONFLICT 会锁行；SQLite 用 IMMEDIATE 事务串行化。
    // 不依赖 RETURNING：Sequelize 6 的 sqlite 驱动对 INSERT 使用 run()，拿不到 RETURNING 行。
    const work = async tx => {
      await sequelize.query(
        `INSERT INTO ${table} (id, window_key, flow_id, user_id, window_start, count, expires_at, created_at, updated_at)
          VALUES (:id, :windowKey, :flowId, :userId, :windowStart, 1, :expiresAt, :createdAt, :updatedAt)
          ON CONFLICT (window_key) DO UPDATE SET count = ${table}.count + 1, updated_at = :updatedAt`,
        { replacements, transaction: tx }
      );
      const rows = await sequelize.query(`SELECT count FROM ${table} WHERE window_key = :windowKey`, {
        replacements: { windowKey },
        transaction: tx,
        type: QueryTypes.SELECT
      });
      const first = Array.isArray(rows) ? rows[0] : rows;
      const count = Number(first && (first.count != null ? first.count : first.COUNT));
      if (!Number.isFinite(count)) {
        throw new Error('限流原子递增未返回 count');
      }
      return count;
    };
    // 先提交递增，再按结果判定：超限抛 RATE_LIMITED，但计数保留（与原 Map 的 increment-then-check 一致）。
    // 若在本事务内抛错，递增会被回滚，窗口永远到不了限额以上。
    let count;
    if (isSequelizeTransaction(transaction)) {
      count = await work(transaction);
    } else {
      const txOpts = sequelize.getDialect && sequelize.getDialect() === 'sqlite' ? { type: Transaction.TYPES.IMMEDIATE } : {};
      count = await withBusyRetry(() => sequelize.transaction(txOpts, work));
    }
    if (count > RATE_LIMIT_PER_MINUTE) {
      throw fail('RATE_LIMITED', '写入过于频繁，请稍后重试');
    }
    return true;
  };

  return {
    issueCheckToken,
    takeCheckToken,
    markCheckTokenPreviewed,
    assertRateLimit,
    cleanupExpiredFlowSecurity,
    CHECK_TOKEN_TTL,
    RATE_LIMIT_PER_MINUTE
  };
};

module.exports = { createFlowSecurity, CHECK_TOKEN_TTL: 5 * 60 * 1000, RATE_LIMIT_PER_MINUTE: 60 };
