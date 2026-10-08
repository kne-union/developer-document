-- @kne/fastify-app-manager ^0.1.7：应用 name / domain / pm2_name 唯一约束改为只约束未软删除记录（表名：t_app_manager_app）

DO
$$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 't_app_manager_app'
    ) THEN
        ALTER TABLE t_app_manager_app DROP CONSTRAINT IF EXISTS t_app_manager_app_name_key;
        ALTER TABLE t_app_manager_app DROP CONSTRAINT IF EXISTS t_app_manager_app_domain_key;
        ALTER TABLE t_app_manager_app DROP CONSTRAINT IF EXISTS t_app_manager_app_pm2_name_key;

        -- 旧的普通 domain 索引与新的部分唯一索引同名
        IF EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 't_app_manager_app_domain'
              AND indexdef NOT LIKE 'CREATE UNIQUE INDEX%'
        ) THEN
            DROP INDEX t_app_manager_app_domain;
        END IF;

        CREATE UNIQUE INDEX IF NOT EXISTS t_app_manager_app_name
            ON t_app_manager_app ("name") WHERE "deleted_at" IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS t_app_manager_app_domain
            ON t_app_manager_app ("domain") WHERE "deleted_at" IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS t_app_manager_app_pm2_name
            ON t_app_manager_app ("pm2_name") WHERE "deleted_at" IS NULL;
    END IF;
END $$;
