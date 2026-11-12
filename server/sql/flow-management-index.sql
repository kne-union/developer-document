-- 流程管理补充索引（幂等，可重复执行）。
-- 新表与模型内声明的索引由 sequelize.sync() 创建，本脚本只补派单/暂停/准出扫描用的索引。
-- 同时兼容无前缀表名（t_*）与带 DB_TABLE_PREFIX 的表名（p_*）：
-- 先判断表是否真实存在再建索引，避免「另一种前缀的表不存在」导致服务启动失败。
-- 不使用 LIKE 模糊匹配表名。

DO
$$
DECLARE
    tbl TEXT;
    names TEXT[] := ARRAY[
        't_flow', 'p_flow',
        't_flow_ai_run', 'p_flow_ai_run',
        't_flow_confirmation', 'p_flow_confirmation',
        't_flow_deliverable', 'p_flow_deliverable',
        't_flow_release', 'p_flow_release'
    ];
BEGIN
    FOREACH tbl IN ARRAY names LOOP
        IF to_regclass(tbl) IS NULL THEN
            CONTINUE;
        END IF;

        IF tbl LIKE '%flow_ai_run' THEN
            -- 租约唯一约束由模型内的 unique(work_item_key, active) 建；此处只补派单扫描用的普通索引
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (work_item_key, active)', 'idx_' || tbl || '_lease', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (lease_expires_at, status)', 'idx_' || tbl || '_expire', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (flow_id, started_at)', 'idx_' || tbl || '_flow_started', tbl);
        ELSIF tbl LIKE '%flow_confirmation' THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (node_id, status, expires_at)', 'idx_' || tbl || '_pending', tbl);
        ELSIF tbl LIKE '%flow_deliverable' THEN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (flow_id, stage, status)', 'idx_' || tbl || '_exit', tbl);
        ELSIF tbl LIKE '%flow_release' THEN
            -- 打回意见扫描与放行记录分页
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (flow_id, feedback_status)', 'idx_' || tbl || '_feedback', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (release_id)', 'idx_' || tbl || '_release', tbl);
        ELSE
            -- t_flow / p_flow：暂停节点 path 扫描与树查询
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (paused_at)', 'idx_' || tbl || '_paused', tbl);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (root_id, path)', 'idx_' || tbl || '_tree', tbl);
        END IF;
    END LOOP;
END $$;
