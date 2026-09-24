-- 清空 app-manager 管控元数据（不做兼容；可重复执行）
-- 宿主库执行；托管应用业务库为独立库 app-manager-apps

DELETE FROM t_app_manager_app_version;
DELETE FROM t_app_manager_app;
