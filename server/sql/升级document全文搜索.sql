-- t_document 全文搜索：search_text 列 + GIN 索引（幂等）
ALTER TABLE "t_document" ADD COLUMN IF NOT EXISTS search_text TEXT;

UPDATE "t_document"
SET search_text = trim(coalesce(name, '') || ' ' || coalesce(content, ''))
WHERE search_text IS NULL OR search_text = '';

CREATE INDEX IF NOT EXISTS idx_t_document_search_fts
  ON "t_document" USING GIN (to_tsvector('simple', coalesce(search_text, '')));
