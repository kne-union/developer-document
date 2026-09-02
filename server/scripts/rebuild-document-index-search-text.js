/**
 * 给已有 document_index 补 apiSections 并重算 searchText（纯本地转换，不重新拉 README）。
 *
 * 背景：
 * - api 原文是 HTML，表格占 token 极多；新检索按 h 标题切成 markdown 子节后可按 ref 精确取用
 * - 旧 searchText 不含 examples，api 只进前 2000 字，导致示例名与中文场景词搜不到
 *
 * 用法（server 目录，需能连库；环境变量同服务端 DB_* / PG*）：
 *   node ./scripts/rebuild-document-index-search-text.js
 */
const { Sequelize, QueryTypes } = require('sequelize');
const { withApiSections } = require('../libs/utils/api-markdown');
const { buildSearchTextFromIndex } = require('../libs/utils/fts');

// information_schema 的标识符列是 sql_identifier 类型，node-pg 解析后为空串，统一走 pg_catalog 并 ::text
const listColumns = async (sequelize, table) => {
  const rows = await sequelize.query(
    `SELECT a.attname::text AS name
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = :table AND a.attnum > 0 AND NOT a.attisdropped`,
    { type: QueryTypes.SELECT, replacements: { table } }
  );
  return rows.map(row => row.name);
};

const pick = (columns, candidates, label) => {
  const found = candidates.find(candidate => columns.includes(candidate));
  if (!found) {
    throw new Error(`未找到 ${label} 列，候选：${candidates.join(' / ')}`);
  }
  return found;
};

const start = async () => {
  const env = process.env;
  const sequelize = new Sequelize(env.DB_DATABASE || env.PGDATABASE || 'developer_document', env.DB_USERNAME || env.PGUSER || 'postgres', env.DB_PASSWORD || env.PGPASSWORD || '', {
    host: env.DB_HOST || env.PGHOST || '127.0.0.1',
    port: Number(env.DB_PORT || env.PGPORT || 5432),
    dialect: 'postgres',
    logging: false
  });

  const tables = await sequelize.query(
    `SELECT tablename::text AS name FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('document_index', 't_document_index')`,
    { type: QueryTypes.SELECT }
  );
  if (!tables.length) {
    console.log('document_index table not found, skip');
    await sequelize.close();
    return;
  }
  const table = tables[0].name;
  const columns = await listColumns(sequelize, table);

  const docIdCol = pick(columns, ['doc_id', 'docId'], 'docId');
  const indexCol = pick(columns, ['index_data', 'indexData'], 'indexData');
  const componentsCol = pick(columns, ['components_data', 'componentsData'], 'componentsData');
  const searchTextCol = pick(columns, ['search_text', 'searchText'], 'searchText');
  const deletedAtCol = pick(columns, ['deleted_at', 'deletedAt'], 'deletedAt');
  const updatedAtCol = pick(columns, ['updated_at', 'updatedAt'], 'updatedAt');

  const rows = await sequelize.query(
    `SELECT id, "${docIdCol}" AS doc_id, version, "${indexCol}" AS index_data, "${componentsCol}" AS components_data
     FROM ${table}
     WHERE "${deletedAtCol}" IS NULL`,
    { type: QueryTypes.SELECT }
  );

  console.log(`table=${table} scanned=${rows.length}`);
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const index = Array.isArray(row.index_data) ? row.index_data : [];
    const components = row.components_data && typeof row.components_data === 'object' ? row.components_data : {};
    if (!Object.keys(components).length) {
      skipped += 1;
      continue;
    }

    const nextComponents = withApiSections(components);
    const searchText = buildSearchTextFromIndex({ index, components: nextComponents });

    await sequelize.query(`UPDATE ${table} SET "${componentsCol}" = :components, "${searchTextCol}" = :searchText, "${updatedAtCol}" = NOW() WHERE id = :id`, {
      replacements: { components: JSON.stringify(nextComponents), searchText, id: row.id }
    });
    updated += 1;
    console.log(`rebuilt ${row.doc_id}@${row.version} components=${Object.keys(nextComponents).length} searchText=${searchText.length}`);
  }

  console.log(`done. updated=${updated} skipped=${skipped}`);
  await sequelize.close();
};

start().catch(err => {
  console.error(err);
  process.exit(1);
});
