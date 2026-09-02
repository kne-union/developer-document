# Developer Document

一个功能完善的开发者文档系统，用于展示组件库、API文档和开发指南。为开发团队提供统一的文档平台，提高开发效率和协作质量。

## 功能特点

- 📚 **组件库展示**：展示和记录组件库的使用方法和示例，支持代码预览和在线调试
- 🔍 **API文档**：提供详细的API接口文档，包括请求参数、响应格式和示例代码
- 👤 **用户系统**：支持用户注册、登录、权限管理和个性化设置
- 🛠️ **管理后台**：提供组件管理、文档管理、用户管理和系统配置功能
- 📁 **文件管理**：支持文件上传、存储、版本控制和权限管理
- 📧 **消息通知**：支持邮件通知、站内消息和更新提醒功能

## 主要功能模块

### 组件库展示

- **组件分类**：按功能、类型等多维度对组件进行分类展示
- **组件详情**：展示组件的属性、事件、方法和使用示例
- **在线预览**：支持组件的在线预览和交互式调试
- **代码示例**：提供多种使用场景的代码示例
- **版本历史**：展示组件的版本历史和更新日志

### API文档管理

- **接口分组**：支持按模块、功能等对API接口进行分组管理
- **接口详情**：展示接口的URL、方法、参数、响应和状态码等信息
- **在线测试**：支持在线发送API请求并查看响应结果
- **文档导出**：支持将API文档导出为PDF、Markdown等格式
- **版本控制**：支持API文档的版本控制和历史查看

### 用户和权限管理

- **用户认证**：支持多种登录方式，包括账号密码、第三方登录等
- **权限控制**：基于角色的权限控制系统，精细化管理用户权限
- **个人中心**：用户可以管理个人信息、收藏内容和通知设置
- **操作日志**：记录用户的关键操作，支持审计和追溯

### 管理后台

- **内容管理**：管理组件、文档、博客等内容
- **用户管理**：管理用户账号、角色和权限
- **系统配置**：配置系统参数、主题和功能模块
- **数据统计**：提供访问统计、使用情况分析等数据报表

## Open API / MCP / 搜索统计

### Open API（CI 发布触发，签名认证）

管理员登录后可在 `/api/v1/signature/create` 创建 Open API 密钥，CI 侧使用 `generateSignature.js` 生成请求头：

- `x-openapi-appid`
- `x-openapi-timestamp`
- `x-openapi-expire`
- `x-openapi-signature`

触发同步（**后台无记录时会自动创建**，再异步拉 npm / 部署）：

```bash
# NPM 包同步（不存在则 create；type 可回填；version 传入同步任务）
curl -X POST http://localhost:8061/api/v1/open-api/sync/npm-package \
  -H 'Content-Type: application/json' \
  -H 'x-openapi-appid: ...' \
  -H 'x-openapi-timestamp: ...' \
  -H 'x-openapi-expire: ...' \
  -H 'x-openapi-signature: ...' \
  -d '{"packageName":"@kne/xxx","type":"frontend","version":"1.2.3"}'

# 远程组件部署（不存在则 create；无 url 时索引回退 npm README）
curl -X POST http://localhost:8061/api/v1/open-api/sync/remote-component \
  ... \
  -d '{"remote":"components-core","packageName":"@kne-components/components-core"}'
```

搜索 `document-index`：已登记包会自动建索引；`@kne/` / `@kne-components/` 无记录时校验 npm 存在后自动创建再建索引；FTS 未命中会回退到本次 ensure 的文档。

### HTTP MCP（用户登录 token）

1. 登录获取 token：`POST /api/v1/account/login`
2. 运行初始化命令（写入 `~/.kne_document/config.json` 并安装 MCP）：

```bash
npx @kne/npm-tools initDevDocumentMcp \
  --target cursor \
  --sync-url http://localhost:8061/api/v1 \
  --mcp-url http://localhost:8061/api/v1/mcp \
  --token "<登录 token>"
```

`--target` 目前支持 `cursor`（合并到 `~/.cursor/mcp.json`）；省略时可交互选择。

MCP 服务配置示例：

```json
{
  "mcpServers": {
    "developer-document": {
      "url": "http://localhost:8061/api/v1/mcp",
      "headers": {
        "x-user-token": "<登录 token>"
      }
    }
  }
}
```

可用 tools：`check_worklog_exists`、`check_experience_exists`、`upload_experience`、`upload_worklog`（支持 `skipIfExists` 用于迁移）、`search_experience`、`search_document_index`、`search_document`。

### 本地与服务端双写同步

初始化后 `~/.kne_document/config.json` 已包含 `remote.syncUrl`、`remote.mcpUrl` 与 `token`；`initDevDocumentMcp` 会自动检查并上传待同步的本地 JSON。**本地文件始终保留**；通过 `sync-registry.json` 记录已同步到的服务地址。

```bash
# 全量同步（未同步 / 换服务 / 本地有改动）
cd server && npm run sync:kne-document -- \
  --sync-url http://localhost:8061/api/v1 \
  --token "<登录 token>"

# 单条同步（每次本地写入后）
npm run sync:kne-document -- --file "worklog/project/2026-01-01-12-00-00/title.json"

# 换服务后强制全量重传
npm run sync:kne-document -- --sync-url <新地址> --token "<token>" --force
```

`config.json` 示例：

```json
{
  "remote": {
    "syncUrl": "http://localhost:8061/api/v1",
    "mcpUrl": "http://localhost:8061/api/v1/mcp",
    "apiUrl": "http://localhost:8061/api/v1",
    "token": "<登录 token>"
  }
}
```

同步列表 `~/.kne_document/sync-registry.json` 由脚本维护；条目含 `apiUrl`，换服务后须重传。

### REST 调试接口（登录 token）

| 接口 | 说明 |
|------|------|
| `POST /api/v1/experience/upload` | 上传经验 |
| `POST /api/v1/worklog/upload` | 上传工作日志（body 可选 `skipIfExists`） |
| `GET /api/v1/worklog/exists?relativePath=...` | 检查工作日志是否已存在 |
| `GET /api/v1/experience/search` | 搜索经验 |
| `GET /api/v1/experience/exists?relativePath=...` | 检查经验是否已存在 |
| `GET /api/v1/document-index/search` | PG 全文搜文档索引；若指定 `docId` 且尚无索引，会先拉取 README 并建索引（与本地 `@kne/npm-tools` 逻辑一致） |
| `GET /api/v1/document/search` | PG 全文搜全部后台 document |

### PostgreSQL 全文搜索迁移

```bash
psql $DATABASE_URL -f server/sql/升级document全文搜索.sql
psql $DATABASE_URL -f server/sql/升级document-index全文搜索.sql
psql $DATABASE_URL -f server/sql/升级fastify-task-2-started-at.sql
```

可选环境变量 `DOCUMENT_INDEX_DIR`：同步任务额外写入 npm-tools 索引文件目录。

### 管理后台

- `/admin/dev-management/install` — 安装说明（MCP 配置与本地同步流程）
- `/admin/dev-management/experience` — 经验管理（关闭/启用/删除）
- `/admin/dev-management/worklog` — 工作日志（可按用户筛选查看）
- `/admin/dev-management/search-analytics` — 搜索记录与统计

**ZIP 导出 / 导入**（经验、工作日志管理页）：

- 导出：按当前列表筛选条件打包为 ZIP（含 `manifest.json` + 各条目 JSON，路径与 `relativePath` 一致）
- 导入：上传 ZIP 解析入库；「导入 ZIP」默认覆盖同路径；「导入（跳过重复）」遇重复 `relativePath` 跳过

管理 API：

| 接口 | 说明 |
|------|------|
| `GET /api/v1/experience/manage/export` | 导出经验 ZIP |
| `POST /api/v1/experience/manage/import?skipIfExists=&overwrite=` | 导入经验 ZIP（multipart 字段 `file`） |
| `GET /api/v1/worklog/manage/export` | 导出工作日志 ZIP |
| `POST /api/v1/worklog/manage/import?skipIfExists=&overwrite=` | 导入工作日志 ZIP |

## 环境变量配置

创建一个`.env`文件在server目录下：

```
DB_DIALECT=sqlite           # 数据库类型：sqlite, mysql, postgres
DB_HOST=data.db             # 数据库主机/文件路径
DB_USERNAME=                # 数据库用户名（如果使用mysql/postgres）
DB_PASSWORD=                # 数据库密码（如果使用mysql/postgres）
DB_DATABASE=                # 数据库名称（如果使用mysql/postgres）
ENV=local                   # 环境：local, staging, prod
PORT=8061                   # 服务器端口
DOCUMENT_INDEX_DIR=         # 可选，文档索引文件输出目录
```

## 许可证

[MIT](LICENSE)

<!--START_SECTION:DOC_MD-->

| 组件 | 简介 |
|------|------|
| [About](docs/About.md) | 关于我们 |
| [AdminBlog](docs/AdminBlog.md) | 博客管理模块 |
| [HomePage](docs/HomePage.md) | 首页 |
| [IconSelect](docs/IconSelect.md) | 选择Icon图标 |
| [Setting](docs/Setting.md) | 系统设置 |

<!--END_SECTION:DOC_MD-->
