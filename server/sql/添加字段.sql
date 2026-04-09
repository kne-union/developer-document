-- 修改 blog 表 groups 字段类型为 JSONB
ALTER TABLE "t_blog" ALTER COLUMN "groups" TYPE JSONB USING "groups"::jsonb;

-- 修改 document 表 groups 字段类型为 JSONB
ALTER TABLE "t_document" ALTER COLUMN "groups" TYPE JSONB USING "groups"::jsonb;

-- 为 document 表添加 content 字段
ALTER TABLE "t_document" ADD COLUMN IF NOT EXISTS "content" TEXT;