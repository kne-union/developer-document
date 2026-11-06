#!/usr/bin/env bash
# 流程管理（flow-management）本地启动与验收脚本
# 不修改 server/.env、不注入任何额外环境变量、不执行 git 操作。
# 短链地址复用 server/.env 已有的 ORIGIN，短码由 @kne/fastify-shorten 管理，无需签名密钥。
#
# 用法：
#   ./start-flow.sh            预检 + 启动前后端（前台，Ctrl+C 停止）
#   ./start-flow.sh server     只启动后端（nodemon 热重载）
#   ./start-flow.sh check      服务已启动后，做接口 / 前端 / 数据表 / 工具数冒烟检查
#   ./start-flow.sh sql        手动补跑 flow 索引 SQL（幂等，仅旧库补索引时需要）
#   ./start-flow.sh env        打印当前生效的站点地址与端口（不启动服务）

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/server/.env"
SQL_FILE="${ROOT_DIR}/server/sql/flow-management-index.sql"
# 注意：不要 export PORT，否则会覆盖后端从 server/.env 读取的 8061
BACKEND_PORT="${BACKEND_PORT:-8061}"
FRONTEND_PORT="${FRONTEND_PORT:-3040}"

info() { printf '\033[32m[flow]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[flow]\033[0m %s\n' "$*"; }
die() {
  printf '\033[31m[flow]\033[0m %s\n' "$*" >&2
  exit 1
}

# 纯 bash 判断 .env 是否声明了某个键，避免把密码读进 shell 环境
env_has() {
  local key="$1" line
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*${key}[[:space:]]*= ]] && return 0
  done < "$ENV_FILE"
  return 1
}

preflight() {
  [[ -f "$ENV_FILE" ]] || die "缺少 ${ENV_FILE}，请先按 README 配置数据库"
  [[ -d "$ROOT_DIR/node_modules" ]] || die '缺少前端依赖，先在仓库根目录执行 npm install'
  [[ -d "$ROOT_DIR/server/node_modules" ]] || die '缺少后端依赖，先执行 npm run init-server'
  [[ -d "$ROOT_DIR/server/node_modules/@kne/fastify-shorten" ]] || die '缺少 @kne/fastify-shorten，先执行 npm run init-server'
  local missing=()
  for key in DB_DIALECT DB_HOST DB_PORT DB_USERNAME DB_DATABASE DB_PASSWORD; do
    env_has "$key" || missing+=("$key")
  done
  (( ${#missing[@]} == 0 )) || die "server/.env 缺少：${missing[*]}"
}

# 只读展示：ORIGIN 是 OIDC 已有的对外站点地址，也是短链前缀，不需要新增配置
resolve_origin() {
  SITE_ORIGIN=$(node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");const m=s.match(/^\s*ORIGIN\s*=\s*(.+?)\s*$/m);process.stdout.write(m?m[1].trim():"")' "$ENV_FILE")
  SITE_ORIGIN="${SITE_ORIGIN:-http://localhost:${FRONTEND_PORT}}"
}

port_busy() {
  command -v lsof >/dev/null 2>&1 || return 1
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

print_access() {
  info '----------------------------------------------------------'
  info "后台流程管理：http://localhost:${FRONTEND_PORT}/admin/dev-management/flow"
  info "后端接口前缀：http://localhost:${BACKEND_PORT}/api/v1/flow"
  info "MCP 端点：    http://localhost:${BACKEND_PORT}/api/v1/mcp"
  info "一次性确认页：${SITE_ORIGIN}/flow-confirm/<短码>（前缀来自 ORIGIN）"
  info '另开终端执行 ./start-flow.sh check 可做冒烟检查'
  info '----------------------------------------------------------'
}

# 读取 server/.env 并连库执行一段 SQL / 查询，密码不出进程
run_db() {
  local mode="$1"
  MODE="$mode" ENV_FILE="$ENV_FILE" SQL_FILE="$SQL_FILE" node <<'NODE'
const fs = require('fs');
const path = require('path');
const envFile = process.env.ENV_FILE;
const env = {};
for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!m) continue;
  let value = m[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[m[1]] = value;
}
const pg = require(path.join(path.dirname(envFile), 'node_modules', 'pg'));
const client = new pg.Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 5432),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  connectionTimeoutMillis: 3000
});
(async () => {
  await client.connect();
  try {
    if (process.env.MODE === 'sql') {
      const sql = fs.readFileSync(process.env.SQL_FILE, 'utf8');
      await client.query(sql);
      console.log('索引 SQL 执行完成（幂等，重复执行无副作用）');
      return;
    }
    // 只按候选表名精确查，避免把库里其它业务表（如 t_ai_command_flow）误判成流程表
    const prefixes = [...new Set(['t_', 'p_', env.DB_TABLE_PREFIX].filter(Boolean))];
    const flowNames = ['flow', 'flow_stage_record', 'flow_deliverable', 'flow_ai_run', 'flow_confirmation'];
    const candidates = flowNames.flatMap(name => prefixes.map(prefix => prefix + name));
    const tables = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2::text[]) ORDER BY table_name', ['public', candidates]);
    const names = tables.rows.map(r => r.table_name);
    const shortenTables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name LIKE '%shorten%' ORDER BY table_name", ['public']);
    const indexes = await client.query('SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname = $1 AND tablename = ANY($2::text[])', ['public', candidates]);
    console.log('flow 表：' + (names.length ? names.join(', ') : '(未创建)'));
    console.log('shorten 表：' + (shortenTables.rows.length ? shortenTables.rows.map(r => r.table_name).join(', ') : '(未创建)'));
    console.log('flow 索引数：' + indexes.rows[0].n);
    const missing = flowNames.filter(name => !prefixes.some(prefix => names.includes(prefix + name)));
    if (missing.length) {
      console.log('缺失表：' + missing.join(', ') + '（服务首次启动 sync 后应自动创建）');
    }
    if (!shortenTables.rows.length) {
      console.log('缺失 shorten 表（服务首次启动 sync 后应自动创建）');
    }
  } finally {
    await client.end();
  }
})().catch(e => {
  console.error('数据库检查失败：' + e.message);
  process.exit(1);
});
NODE
}

check() {
  info "检查后端 http://localhost:${BACKEND_PORT} ..."
  local code
  # 环境里可能设了 HTTP_PROXY，localhost 必须直连，否则 502 会被误判成「端口被占用」
  code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' --max-time 3 "http://localhost:${BACKEND_PORT}/api/v1/flow/stages" || true)
  case "$code" in
    000) warn '后端未启动（连接失败）' ;;
    401 | 403) info "后端已就绪，/flow/stages 返回 ${code}（未登录，符合预期）" ;;
    200) info '后端已就绪，/flow/stages 返回 200' ;;
    404) warn '后端已启动但 /flow/stages 未注册，检查 flow controller 是否被加载' ;;
    502 | 503) warn "端口 ${BACKEND_PORT} 返回 ${code}：可能被网关占用，也可能后端仍在启动中" ;;
    *) info "后端已响应，/flow/stages 返回 ${code}" ;;
  esac

  code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' --max-time 3 "http://localhost:${FRONTEND_PORT}" || true)
  [[ "$code" == "000" ]] && warn "前端未启动（http://localhost:${FRONTEND_PORT} 连接失败）" || info "前端已响应，HTTP ${code}"

  local tools
  tools=$(cd "$ROOT_DIR" && node -e "
const fs=require('fs');let n=0;
for(const f of ['server/libs/mcp/flow-tools.js','server/libs/mcp/flow-claim-tools.js','server/libs/mcp/flow-release-tools.js']){
  const m=fs.readFileSync(f,'utf8').match(/register\(\s*'flow_[a-z_]+'/g);n+=m?m.length:0;
}
console.log(n);
")
  info "注册的 flow MCP 工具数：${tools}（设计 29）"
  [[ "$tools" == "29" ]] || warn '工具数与 v0.3.4 设计不一致'

  info '检查数据库表与索引 ...'
  (cd "$ROOT_DIR/server" && run_db check) || warn '数据库检查未通过（确认 PostgreSQL 已启动、server/.env 连接信息正确）'
}

case "${1:-start}" in
  start | '')
    preflight
    resolve_origin
    port_busy "$BACKEND_PORT" && warn "端口 ${BACKEND_PORT} 已被占用，若已有服务在跑请先停止"
    port_busy "$FRONTEND_PORT" && warn "端口 ${FRONTEND_PORT} 已被占用，前端可能启动到别的端口"
    print_access
    cd "$ROOT_DIR"
    exec npm start
    ;;
  server)
    preflight
    resolve_origin
    info "只启动后端（nodemon）：http://localhost:${BACKEND_PORT}/api/v1/flow"
    info "短链前缀：${SITE_ORIGIN}"
    cd "$ROOT_DIR/server"
    exec npm run dev
    ;;
  check)
    check
    ;;
  sql)
    [[ -f "$SQL_FILE" ]] || die "找不到 ${SQL_FILE}"
    (cd "$ROOT_DIR/server" && run_db sql)
    ;;
  env)
    preflight
    resolve_origin
    info "ORIGIN=${SITE_ORIGIN}（短链前缀，取自 server/.env）"
    info "后端端口 ${BACKEND_PORT} / 前端端口 ${FRONTEND_PORT}（脚本不覆盖，不注入任何额外环境变量）"
    ;;
  *)
    die "未知参数：${1}（可用：start / server / check / sql / env）"
    ;;
esac
