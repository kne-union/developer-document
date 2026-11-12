/**
 * 本地隔离的真实 SQL 库，专供 checkToken / 限流测试。
 * 使用 sqlite 文件（WAL），不连生产。本环境无可用 PostgreSQL 服务端，并发测试在 sqlite 上验证原子 SQL 与事务回滚；
 * 跨进程级 Postgres 锁表现需在有独立 PG 时再测，见测试说明。
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Sequelize, DataTypes } = require('sequelize');
const { Snowflake } = require('nodejs-snowflake');
const { createFlowSecurity } = require('../../libs/utils/flow-security-store');

const PROJECT_EPOCH = new Date('2024-01-01').getTime();

const definePrimaryType = (name, props) =>
  Object.assign(
    {
      type: DataTypes.STRING,
      get() {
        const value = this.getDataValue(name);
        return value && String(value);
      }
    },
    props
  );

const openIsolatedSecurityDb = async ({ filename, instanceId = 1 } = {}) => {
  const ephemeral = !filename;
  const storage = filename || path.join(os.tmpdir(), `flow-sec-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    pool: { max: 3, min: 0, idle: 5000, acquire: 12000 },
    retry: { max: 8, match: [/SQLITE_BUSY/, /SQLITE_LOCKED/, 'SQLITE_BUSY'] }
  });
  await sequelize.query('PRAGMA foreign_keys = ON');
  await sequelize.query('PRAGMA journal_mode = WAL');
  await sequelize.query('PRAGMA busy_timeout = 30000');

  const snowflake = new Snowflake({ instance_id: instanceId, custom_epoch: PROJECT_EPOCH });
  const generateId = () => String(snowflake.getUniqueID());

  const checkDef = require('../../libs/models/flow-check-token')({ DataTypes, definePrimaryType });
  const rateDef = require('../../libs/models/flow-rate-limit')({ DataTypes, definePrimaryType });
  const common = { underscored: true, paranoid: false, timestamps: true };

  const flowCheckToken = sequelize.define(
    'flowCheckToken',
    Object.assign({ id: { type: DataTypes.STRING, primaryKey: true } }, checkDef.model),
    Object.assign({ tableName: 't_flow_check_token' }, common, { indexes: checkDef.options.indexes })
  );
  const flowRateLimit = sequelize.define('flowRateLimit', Object.assign({ id: { type: DataTypes.STRING, primaryKey: true } }, rateDef.model), Object.assign({ tableName: 't_flow_rate_limit' }, common, { indexes: rateDef.options.indexes }));

  const assignId = info => {
    if (info.id == null) info.id = generateId();
  };
  flowCheckToken.beforeCreate(assignId);
  flowRateLimit.beforeCreate(assignId);

  await sequelize.sync();
  const models = { flowCheckToken, flowRateLimit };
  const security = createFlowSecurity({ models, sequelize, generateId });

  const close = async () => {
    await sequelize.close();
    if (ephemeral) {
      for (const ext of ['', '-wal', '-shm']) {
        try {
          fs.unlinkSync(storage + ext);
        } catch (err) {
          if (err && err.code !== 'ENOENT') throw err;
        }
      }
    }
  };

  return { sequelize, models, generateId, storage, close, snowflake, ...security };
};

module.exports = { openIsolatedSecurityDb, PROJECT_EPOCH };
