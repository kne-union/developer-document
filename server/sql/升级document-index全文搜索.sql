-- t_document_index：全文 GIN + 排除软删的唯一约束（表由 Sequelize sync 创建）
DROP INDEX IF EXISTS "t_document_index_doc_id_version";
DROP INDEX IF EXISTS "t_document_index_docId_version";

CREATE UNIQUE INDEX IF NOT EXISTS idx_t_document_index_doc_id_version_active
  ON "t_document_index" (doc_id, version)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_t_document_index_search_fts
  ON "t_document_index" USING GIN (to_tsvector('simple', coalesce(search_text, '')));
