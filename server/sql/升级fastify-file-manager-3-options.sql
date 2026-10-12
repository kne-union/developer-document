-- @kne/fastify-file-manager ^3 文件记录扩展字段（表名：t_file_manager_file_record）
-- sql 脚本先于 sync 执行：新库此时还没有该表，由 sync 按模型建表
DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 't_file_manager_file_record'
    ) THEN
        ALTER TABLE t_file_manager_file_record
            ADD COLUMN IF NOT EXISTS "options" JSONB DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN t_file_manager_file_record."options" IS '扩展字段';
    END IF;
END $$;
