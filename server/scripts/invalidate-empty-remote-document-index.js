/**
 * 失效 source=remote 且 indexData 为空的 document_index（清 meta.builtAt），便于 ensure 重建。
 *
 * 用法（server 目录，需能连库；环境变量同服务端 DB_* / PG*）：
 *   node ./scripts/invalidate-empty-remote-document-index.js
 */
const { Sequelize, QueryTypes } = require('sequelize');

const start = async () => {
  const env = process.env;
  const sequelize = new Sequelize(env.DB_DATABASE || env.PGDATABASE || 'developer_document', env.DB_USERNAME || env.PGUSER || 'postgres', env.DB_PASSWORD || env.PGPASSWORD || '', {
    host: env.DB_HOST || env.PGHOST || '127.0.0.1',
    port: Number(env.DB_PORT || env.PGPORT || 5432),
    dialect: 'postgres',
    logging: false
  });

  const tables = await sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('document_index', 't_document_index')`,
    { type: QueryTypes.SELECT }
  );
  if (!tables.length) {
    console.log('document_index table not found, skip');
    await sequelize.close();
    return;
  }
  const table = tables[0].table_name;

  const rows = await sequelize.query(
    `SELECT id, "docId" AS doc_id, version, meta, "indexData" AS index_data
     FROM ${table}
     WHERE "deletedAt" IS NULL
       AND source = 'remote'`,
    { type: QueryTypes.SELECT }
  );

  const empty = rows.filter(row => {
    const indexData = row.index_data;
    return !Array.isArray(indexData) || indexData.length === 0;
  });

  console.log(`scanned=${rows.length} empty_remote=${empty.length}`);
  if (!empty.length) {
    await sequelize.close();
    return;
  }

  for (const row of empty) {
    const meta = row.meta && typeof row.meta === 'object' ? { ...row.meta } : {};
    delete meta.builtAt;
    await sequelize.query(`UPDATE ${table} SET meta = :meta, "updatedAt" = NOW() WHERE id = :id`, {
      replacements: { meta: JSON.stringify(meta), id: row.id }
    });
    console.log(`invalidated ${row.doc_id}@${row.version}`);
  }

  console.log('done. remotes to rebuild:', [...new Set(empty.map(r => r.doc_id))].join(', '));
  await sequelize.close();
};

start().catch(err => {
  console.error(err);
  process.exit(1);
});
