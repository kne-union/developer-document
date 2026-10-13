# Graph Report - developer-document  (2026-09-24)

## Corpus Check
- 297 files · ~91,198 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1767 nodes · 1976 edges · 207 communities (135 shown, 72 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d6b6b8e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Open API / MCP / 搜索统计
- 开发者文档系统使用指南：探索你的团队知识宝库
- server/package.json
- Fastify 业务插件开发指南
- 文档列表
- ExperienceDetail.js
- App.js
- devDependencies
- remote-loader 使用指南
- AppManager/Actions/index.js
- 组件示例编写提示词
- Fastify-Shorten 使用指南
- 单元测试编写指南
- Fastify-Sequelize 使用指南
- dependencies
- kne-document-sync-lib.js
- createAdminListCards.js
- Fastify-Message 使用指南
- 三、国际化的关键模式
- 三、国际化的关键模式
- services/worklog.js
- BizUnit 使用指南
- 完善 package.json 描述和关键词
- AdminBlog/Actions/index.js
- Actions.js
- BizUnit前端业务模块生成提示词
- AdminDocument/Actions/index.js
- doc-retrieval.js
- services/document-index.js
- 任务：生成项目文档
- fts.js
- AdminNpmPackage/Actions/index.js
- AdminRemoteComponent/Actions/index.js
- doc-sections.js
- scripts
- fastify-namespace 使用指南
- services/blog-lead.js
- Setting.js
- 核心功能模块
- InstallGuide/index.js
- package.json
- Fastify-Account 使用指南
- FormInfo 组件完整使用指南
- 账号相关接口
- Fastify-Tenant 使用指南
- 生成流程
- AdminExperience/Actions/index.js
- 管理员接口
- api-markdown.js
- dependencies
- development
- controllers/experience.js
- services/remote-component.js
- rebuild-document-index-search-text.js
- components/About/index.js
- 四、字段类型
- manifest.json
- services/npm-package.js
- Dashboard/index.js
- AppListPage/index.js
- MainLayout.js
- 数据模型
- npmPackageSync/index.js
- AdminBlog/index.js
- IconSelect.js
- kneDocumentListFilters.js
- 最佳实践
- mcp/index.js
- services/open-api.js
- About
- AdminBlog
- Blog
- Document
- HomePage/index.js
- HomePage
- IconSelect
- NpmPackage
- RemoteComponent
- Setting
- craco.config.js
- moduleNameMapper
- 完整使用示例
- 常见问题
- 权限系统
- 六、列表组件
- 九、表单上下文与API
- 七、弹窗与抽屉
- 五、校验规则
- services/search-analytics.js
- services/setting.js
- KneDocumentZipActions/index.js
- extends
- {src/**/*,server/**/*}.{js,jsx,ts,tsx,json,css,scss}
- 服务层方法
- API 接口
- 数据模型
- 扩展开发
- 文档生成说明
- 八、分步表单
- 十一、最佳实践
- app-manager-env-secret.js
- AdminDocument/index.js
- AdminExperience/index.js
- AdminNpmPackage/index.js
- AdminRemoteComponent/index.js
- AdminWorklog/index.js
- AdminWorklog/List/index.js
- getApis
- CatalogPage/index.js
- goAdminDetail.js
- Header.js
- setupProxy.js
- husky
- repository
- 十、多语言支持
- services/blog.js
- services/search-record.js
- invalidate-empty-remote-document-index.js
- IconSelect/doc/base.js
- Admin/index.js
- pages/index.js
- docker-run.sh
- fastify
- fastify-cron
- @fastify/env
- @fastify/multipart
- fastify-plugin
- @fastify/static
- fs-extra
- @kne/fastify-account
- @kne/fastify-aliyun
- @kne/fastify-app-manager
- @kne/fastify-file-manager
- @kne/fastify-group
- @kne/fastify-message
- @kne/fastify-namespace
- @kne/fastify-response-data-format
- @kne/fastify-sequelize
- @kne/fastify-signature
- @kne/fastify-task
- @kne/load-npm-info
- @kne/md-doc
- @kne/npm-tools
- @modelcontextprotocol/fastify
- @modelcontextprotocol/server
- pg
- controllers/blog.js
- controllers/blog-lead.js
- controllers/document.js
- controllers/document-index.js
- controllers/main.js
- controllers/npm-package.js
- controllers/open-api.js
- controllers/remote-component.js
- controllers/search-analytics.js
- controllers/setting.js
- controllers/task.js
- services/main.js
- services/task.js
- lodash
- turndown
- turndown-plugin-gfm
- zod
- detail.js
- form-inner.js
- list.js
- tab-detail.js
- AdminNpmPackage/Detail/index.js
- AdminRemoteComponent/TabDetail/index.js
- AdminWorklog/TabDetail/index.js
- DetailPageHeaderTitle.js
- pages/About/index.js
- Account/index.js
- Home/index.js

## God Nodes (most connected - your core abstractions)
1. `scripts` - 15 edges
2. `createAdminListCards()` - 14 edges
3. `Fastify 业务插件开发指南` - 14 edges
4. `FormInfo 组件完整使用指南` - 14 edges
5. `开发者文档系统使用指南：探索你的团队知识宝库` - 13 edges
6. `Fastify-Sequelize 使用指南` - 12 edges
7. `Fastify-Shorten 使用指南` - 12 edges
8. `Fastify-Tenant 使用指南` - 12 edges
9. `BizUnit前端业务模块生成提示词` - 12 edges
10. `remote-loader 使用指南` - 12 edges

## Surprising Connections (you probably didn't know these)
- `formatDay()` --calls--> `shanghaiYmd()`  [EXTRACTED]
  server/libs/services/worklog.js → server/libs/utils/worklog-range.js
- `buildSearchTextFromIndex()` --calls--> `stripHtml()`  [EXTRACTED]
  server/libs/utils/fts.js → server/libs/utils/api-markdown.js
- `componentSections()` --calls--> `htmlToMarkdown()`  [EXTRACTED]
  server/libs/utils/doc-sections.js → server/libs/utils/api-markdown.js
- `componentSections()` --calls--> `apiSectionsOf()`  [EXTRACTED]
  server/libs/utils/doc-sections.js → server/libs/utils/api-markdown.js
- `buildSearchTextFromIndex()` --calls--> `apiMarkdownOf()`  [EXTRACTED]
  server/libs/utils/fts.js → server/libs/utils/api-markdown.js

## Import Cycles
- None detected.

## Communities (207 total, 72 thin omitted)

### Community 0 - "Open API / MCP / 搜索统计"
Cohesion: 0.04
Nodes (41): About, API, 概述, 示例, 示例代码, AdminBlog, API, 概述 (+33 more)

### Community 1 - "开发者文档系统使用指南：探索你的团队知识宝库"
Cohesion: 0.04
Nodes (44): 🚪 一楼大厅：普通访客区, 🗝️ 三楼管理区：管理员专属, 🏢 二楼办公区：团队成员区, 👥 人工帮助, 🛠️ 使用功能问题, 先从首页说起, ⚙️ 其他管理功能：系统的“运维中心”, 🔗 分享与协作：让知识流动起来 (+36 more)

### Community 2 - "server/package.json"
Cohesion: 0.05
Nodes (39): jest, nodemon, index.js, libs, server, author, bugs, url (+31 more)

### Community 3 - "Fastify 业务插件开发指南"
Cohesion: 0.05
Nodes (42): 1. package.json 配置, 1. 业务错误定义, 1. 依赖注入, 1. 关联关系定义, 1. 多层认证中间件, 1. 插件化架构, 1. 服务模块化, 1. 路由标准化 (+34 more)

### Community 4 - "文档列表"
Cohesion: 0.05
Nodes (37): 1. Fastify-Account 使用指南, 2. Fastify-Message 使用指南, 3. Fastify-Namespace 使用指南, 4. Fastify-Sequelize 使用指南, 5. Fastify-Shorten 使用指南, 6. Fastify-Tenant 使用指南, 7. Fastify 业务插件开发指南, 8. 单元测试编写指南 (+29 more)

### Community 5 - "ExperienceDetail.js"
Cohesion: 0.11
Nodes (26): buildKneDocumentPageHeaderMeta(), categoryLabelMap(), ExperienceDetail(), ArticleBlock(), AsideMetaList(), AsidePanel(), CautionList(), KeypointList() (+18 more)

### Community 6 - "App.js"
Cohesion: 0.06
Nodes (22): AdminBlog, AdminDevManagement, AdminDocument, AdminNpmPackage, AdminRemoteComponent, App, AppInner, AppManager (+14 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (39): antd, axios, classnames, @craco/craco, cross-env, http-proxy-middleware, @kne/modules-dev, @kne/react-fetch (+31 more)

### Community 8 - "remote-loader 使用指南"
Cohesion: 0.05
Nodes (38): 1. 使用 preset 集中管理配置, 1. 全局配置, 2. 组件封装, 3. 类型安全（TypeScript）, 4. 性能优化, API 参考, getOrLoadRemote(remote, shareScope, remoteFallbackUrl), getPublicPath(name, options) (+30 more)

### Community 9 - "AppManager/Actions/index.js"
Cohesion: 0.07
Nodes (24): Deploy, Actions, getActionList(), Restart, Start, Stop, Remove, Save (+16 more)

### Community 10 - "组件示例编写提示词"
Cohesion: 0.06
Nodes (32): 1. 文件结构规范, 2. example.json 配置结构, 3. 示例代码规范, 4. scope 依赖声明规则, 5. 数据准备, 6. 组件开发要求, 7. 示例内容设计原则, 8. 示例完整性检查 (+24 more)

### Community 11 - "Fastify-Shorten 使用指南"
Cohesion: 0.06
Nodes (31): 1. 短链接服务, 1. 设置合理的过期时间, 2. 使用后及时删除, 2. 邀请码生成, 3. 临时访问凭证, 3. 错误处理, 4. 分享链接管理, 4. 监控短编码生成 (+23 more)

### Community 12 - "单元测试编写指南"
Cohesion: 0.06
Nodes (31): 10. 注意事项, 1. 测试框架配置, 2. 测试结构设计, 3.1 基本测试模式, 3.2 测试用例命名规范, 3. 测试用例编写原则, 4.1 插件注册测试, 4.2 功能行为测试 (+23 more)

### Community 13 - "Fastify-Sequelize 使用指南"
Cohesion: 0.07
Nodes (29): 1. 环境配置分离, 2. 错误处理, 3. 性能优化, CRUD操作示例, Fastify-Sequelize 使用指南, ID生成器, SQL脚本执行, 事务处理 (+21 more)

### Community 14 - "dependencies"
Cohesion: 0.07
Nodes (29): @ant-design/icons, dayjs, @kne/antd-icon-select, @kne/app-children-router, @kne/axios-fetch, @kne/ensure-slash, @kne/json-view, @kne/markdown-components-render (+21 more)

### Community 15 - "kne-document-sync-lib.js"
Cohesion: 0.13
Nodes (27): apiRequest(), CONFIG_PATH, crypto, emptyRegistry(), fs, fsp, hashContent(), KNE_ROOT (+19 more)

### Community 16 - "createAdminListCards.js"
Cohesion: 0.07
Nodes (34): hasUserToken(), BlogDetailView, NPM_PACKAGE_TYPE_COLORS, NPM_PACKAGE_TYPE_LABELS, NPM_PACKAGE_TYPE_OPTIONS, NPM_PACKAGE_TYPE_ORDER, REMOTE_COMPONENT_GROUP_COLORS, REMOTE_COMPONENT_GROUP_LABELS (+26 more)

### Community 17 - "Fastify-Message 使用指南"
Cohesion: 0.07
Nodes (27): Email 配置, Fastify-Message 使用指南, includeTemplate, messageTemplate, parseTemplate, Record（消息记录）, sendMessage, Template（消息模板） (+19 more)

### Community 18 - "三、国际化的关键模式"
Cohesion: 0.07
Nodes (26): 1. useIntl Hook 使用, 1. 创建国际化文件, 2. withLocale 包裹普通组件, 2. 修改组件文件, 3. createWithRemoteLoader 组件（推荐格式）, 3. 语言包 key 命名规范, 4. getColumns 等工具函数（formatMessage 从父组件传入）, 4. 检查要点 (+18 more)

### Community 19 - "三、国际化的关键模式"
Cohesion: 0.07
Nodes (26): 1. useIntl Hook 使用, 1. 创建国际化文件, 2. withLocale 包裹普通组件, 2. 修改组件文件, 3. createWithRemoteLoader 组件（推荐格式）, 3. 语言包 key 命名规范, 4. getColumns 等工具函数（formatMessage 从父组件传入）, 4. 检查要点 (+18 more)

### Community 20 - "services/worklog.js"
Cohesion: 0.13
Nodes (21): { buildPathTree }, { createZipBuffer, parseZipBuffer }, fp, { Op, fn, col, where: sequelizeWhere, cast }, { buildPathTree }, { createZipBuffer, parseZipBuffer }, formatDay(), fp (+13 more)

### Community 21 - "BizUnit 使用指南"
Cohesion: 0.08
Nodes (24): 10. 各个Action按钮, 1. 主入口文件 (index.js), 2. 根组件 ([ModuleName].js), 3. 国际化封装 (withLocale.js), 4. 列表页 (List/index.js), 5. 列配置 (List/getColumns.js), 6. 表单组件 (FormInner/index.js), 7. 详情页 (Detail/index.js) (+16 more)

### Community 22 - "完善 package.json 描述和关键词"
Cohesion: 0.09
Nodes (22): 1.1 分析文档目录, 1.2 分析源码结构, 1.3 分析依赖关系, 1. 收集信息, 2.1 描述结构, 2.2 撰写原则, 2.3 描述模板, 2. 撰写 description (+14 more)

### Community 23 - "AdminBlog/Actions/index.js"
Cohesion: 0.12
Nodes (14): Create, Actions, getActionList(), Remove, Save, SetStatus, FormInner, getColumns() (+6 more)

### Community 24 - "Actions.js"
Cohesion: 0.12
Nodes (13): Actions, getActionList(), ContentFormInner, EditContent, getColumns(), Leads, List, renderAdminListCards (+5 more)

### Community 25 - "BizUnit前端业务模块生成提示词"
Cohesion: 0.09
Nodes (21): 1. 主入口文件 (index.js), 2. 根组件 ([ModuleName].js) - 核心, 3. 列配置 (getColumns.js), 4. 表单组件 (FormInner/index.js 或 BaseFormInner.js), 5. 详情页 (Detail/index.js) - 可选, BizUnit前端业务模块生成提示词, doc/api.md - API文档, doc/base.js - 主组件示例 (+13 more)

### Community 26 - "AdminDocument/Actions/index.js"
Cohesion: 0.13
Nodes (14): Create, Actions, getActionList(), Remove, Save, SetStatus, FormInner, getColumns() (+6 more)

### Community 27 - "doc-retrieval.js"
Cohesion: 0.15
Nodes (17): fp, { parseRef, formatExperienceRef, experiencePathCandidates, formatDocumentRef }, { renderSearchMarkdown, renderFetchMarkdown, DEFAULT_MAX_CHARS }, experiencePathCandidates(), formatDocumentRef(), formatExperienceRef(), parseDocIndexRef(), parseRef() (+9 more)

### Community 28 - "services/document-index.js"
Cohesion: 0.12
Nodes (12): { buildCatalogFromReadme, getRemoteModuleDocument, getRemoteComponentReadmeFromTarball }, { buildSearchTextFromIndex, ftsWhere, ftsOrder, hasCJK, bigrams, likeWhere }, { formatDocIndexRef }, fp, FULL_ATTRIBUTES, LIGHT_ATTRIBUTES, loadNpmInfo, parseTokenDocId() (+4 more)

### Community 29 - "任务：生成项目文档"
Cohesion: 0.12
Nodes (16): 1. 分析代码结构, 2. 提取 API 信息, 3. 编写文档内容, API 文档要点, doc/api.md - API 文档, doc/summary.md - 项目概述, 严格注意事项, 任务：生成项目文档 (+8 more)

### Community 30 - "fts.js"
Cohesion: 0.18
Nodes (14): fp, { ftsWhere, ftsOrder, ftsHeadline, hasCJK, bigrams, likeWhere }, { Op, literal }, bigrams(), escapeLike(), ftsHeadline(), ftsMatchSql(), ftsOrder() (+6 more)

### Community 31 - "AdminNpmPackage/Actions/index.js"
Cohesion: 0.17
Nodes (10): Create, Actions, getActionList(), Remove, Save, Sync, FormInner, getColumns() (+2 more)

### Community 32 - "AdminRemoteComponent/Actions/index.js"
Cohesion: 0.17
Nodes (10): Create, Deploy, Actions, getActionList(), Remove, Save, FormInner, getColumns() (+2 more)

### Community 33 - "doc-sections.js"
Cohesion: 0.23
Nodes (15): formatDocIndexRef(), buildTerms(), componentSections(), equalsAny(), exampleContent(), { formatDocIndexRef }, { htmlToMarkdown, apiSectionsOf, PREAMBLE_SECTION_NAME }, includesAny() (+7 more)

### Community 34 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, create, create-biz, deploy, deploy-prod, eject, init (+7 more)

### Community 35 - "fastify-namespace 使用指南"
Cohesion: 0.13
Nodes (14): 1. 数组形式 - 简单值, 2. 数组形式 - 文件路径, 3. 对象形式, 4. 函数形式, fastify-namespace 使用指南, 全局配置合并, 基本用法, 完整示例 (+6 more)

### Community 36 - "services/blog-lead.js"
Cohesion: 0.22
Nodes (10): DEFAULT_SETTINGS, fp, { Op }, { searchZhihu, fetchHotList, clamp }, clamp(), fetchHotList(), normalizeHotItems(), normalizeSearchItems() (+2 more)

### Community 37 - "Setting.js"
Cohesion: 0.21
Nodes (7): About, Advanced, languageOptions, LanguageCheckList, Menu, Profile, Setting

### Community 38 - "核心功能模块"
Cohesion: 0.15
Nodes (13): 1. 租户管理, 2. 租户用户管理, 3. 用户加入租户, 4. 组织架构管理, 5. 角色权限管理, 6. 公司信息管理, 7. 租户设置管理, 权限管理 (+5 more)

### Community 39 - "InstallGuide/index.js"
Cohesion: 0.18
Nodes (3): InstallGuide, MCP_TARGETS, Menu

### Community 40 - "package.json"
Cohesion: 0.17
Nodes (11): author, bugs, url, description, files, homepage, keywords, license (+3 more)

### Community 41 - "Fastify-Account 使用指南"
Cohesion: 0.17
Nodes (11): admin 认证, Fastify-Account 使用指南, JWT Token 提取配置, sendMessage 回调, user 认证, 基本注册, 快速开始, 概述 (+3 more)

### Community 42 - "FormInfo 组件完整使用指南"
Cohesion: 0.17
Nodes (12): 1. Form 组件, 1. 使用 createWithRemoteLoader（推荐）, 2. FormInfo 组件, 2. 可用的 FormInfo 导出, FormInfo 组件完整使用指南, 一、概述, 三、核心组件, 二、导入方式 (+4 more)

### Community 43 - "账号相关接口"
Cohesion: 0.18
Nodes (11): 修改密码, 发送短信验证码, 发送邮箱验证码, 忘记密码, 检查账号是否存在, 注册账号, 登录, 解析重置密码 Token (+3 more)

### Community 44 - "Fastify-Tenant 使用指南"
Cohesion: 0.18
Nodes (10): Fastify-Tenant 使用指南, tenantUser 认证, 使用示例, 基本注册, 完整的租户应用示例, 总结, 概述, 用户加入租户流程 (+2 more)

### Community 45 - "生成流程"
Cohesion: 0.18
Nodes (10): 扩展建议, 文档索引生成指南, 概述, 生成流程, 第一步：扫描源目录, 第三步：设计索引结构, 第二步：分析子目录结构, 第五步：添加导航辅助 (+2 more)

### Community 46 - "AdminExperience/Actions/index.js"
Cohesion: 0.23
Nodes (7): ActionButton, Actions, getActionList(), getColumns(), List, renderAdminListCards, TabDetail

### Community 47 - "管理员接口"
Cohesion: 0.20
Nodes (10): 修改用户信息（管理员）, 关闭用户, 初始化超级管理员, 恢复用户正常状态, 添加用户（管理员）, 管理员接口, 获取用户列表, 获取管理员信息 (+2 more)

### Community 48 - "api-markdown.js"
Cohesion: 0.38
Nodes (9): apiMarkdownOf(), apiSectionsOf(), getTurndown(), htmlToMarkdown(), splitApiSections(), stripHtml(), { tables }, topHeadingLevel() (+1 more)

### Community 49 - "dependencies"
Cohesion: 0.22
Nodes (9): adm-zip, @kne/fastify-statistics, @modelcontextprotocol/node, qs, dependencies, adm-zip, @kne/fastify-statistics, @modelcontextprotocol/node (+1 more)

### Community 50 - "development"
Cohesion: 0.22
Nodes (9): browserslist, development, production, >0.2%, last 1 chrome version, last 1 firefox version, last 1 safari version, not dead (+1 more)

### Community 51 - "controllers/experience.js"
Cohesion: 0.33
Nodes (6): fp, { readZipUploadBuffer, sendZipDownload }, fp, { readZipUploadBuffer, sendZipDownload }, readZipUploadBuffer(), sendZipDownload()

### Community 52 - "services/remote-component.js"
Cohesion: 0.22
Nodes (7): { deployPackage }, fp, fs, GROUP_LABELS, loadNpmInfo, outputPath, path

### Community 53 - "rebuild-document-index-search-text.js"
Cohesion: 0.33
Nodes (8): withApiSections(), buildSearchTextFromIndex(), { buildSearchTextFromIndex }, listColumns(), pick(), { Sequelize, QueryTypes }, start(), { withApiSections }

### Community 54 - "components/About/index.js"
Cohesion: 0.22
Nodes (6): About, CompanyCultureSection, HistorySection, StatisticSection, TeamMemberSection, ValueSection

### Community 55 - "四、字段类型"
Cohesion: 0.25
Nodes (8): 1. 基础输入类, 2. 选择器类, 3. 高级选择器, 4. 日期时间类, 5. 业务专用类, 6. 上传类, 7. 其他, 四、字段类型

### Community 56 - "manifest.json"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 57 - "services/npm-package.js"
Cohesion: 0.25
Nodes (7): { deployPackage }, fp, fs, loadNpmInfo, outputPath, PACKAGE_TYPES, path

### Community 58 - "Dashboard/index.js"
Cohesion: 0.22
Nodes (6): Dashboard, RecordsTab, renderAdminListCards, SEARCH_TYPE_LABELS, StatsTab, AdminSearchAnalytics()

### Community 59 - "AppListPage/index.js"
Cohesion: 0.32
Nodes (4): getApis(), AppListPage(), Detail, List

### Community 60 - "MainLayout.js"
Cohesion: 0.25
Nodes (5): AfterAdminUserLoginLayout, AfterTenantUserLoginLayout, AfterUserLoginLayout, Global, GlobalLayout

### Community 61 - "数据模型"
Cohesion: 0.29
Nodes (7): Company (公司信息), Org (组织), Role (角色), Setting (租户设置), Tenant (租户), User (租户用户), 数据模型

### Community 62 - "npmPackageSync/index.js"
Cohesion: 0.48
Nodes (5): loadNpmInfo, runner(), { withRetry }, sleep(), withRetry()

### Community 63 - "AdminBlog/index.js"
Cohesion: 0.33
Nodes (4): Leads, List, TabDetail, Menu

### Community 65 - "kneDocumentListFilters.js"
Cohesion: 0.38
Nodes (3): mapKneDocumentListFilterValue(), pickSelectValue(), SELECT_FILTER_KEYS

### Community 66 - "最佳实践"
Cohesion: 0.33
Nodes (6): 1. 租户隔离, 2. 权限检查, 3. 租户配置管理, 4. 用户数量限制, 5. 多租户数据迁移, 最佳实践

### Community 67 - "mcp/index.js"
Cohesion: 0.40
Nodes (5): fp, { McpServer }, { NodeStreamableHTTPServerTransport }, registerTools(), z

### Community 69 - "About"
Cohesion: 0.33
Nodes (5): About, API, 概述, 示例, 示例代码

### Community 70 - "AdminBlog"
Cohesion: 0.33
Nodes (5): AdminBlog, API, 概述, 示例(全屏), 示例代码

### Community 71 - "Blog"
Cohesion: 0.33
Nodes (3): BlogDetail, Blog(), BlogList

### Community 72 - "Document"
Cohesion: 0.33
Nodes (3): DocumentDetail, Document(), DocumentList

### Community 73 - "HomePage/index.js"
Cohesion: 0.33
Nodes (4): FeatureSection, HomePage, ResourceCard, toneStyleMap

### Community 74 - "HomePage"
Cohesion: 0.33
Nodes (5): API, HomePage, 概述, 示例, 示例代码

### Community 75 - "IconSelect"
Cohesion: 0.33
Nodes (5): API, IconSelect, 概述, 示例, 示例代码

### Community 76 - "NpmPackage"
Cohesion: 0.33
Nodes (3): Detail, NpmPackage(), List

### Community 77 - "RemoteComponent"
Cohesion: 0.33
Nodes (3): Detail, RemoteComponent(), List

### Community 78 - "Setting"
Cohesion: 0.33
Nodes (5): API, Setting, 概述, 示例(全屏), 示例代码

### Community 79 - "craco.config.js"
Cohesion: 0.40
Nodes (3): aliasConfig, {CracoRemoteComponentsPlugin}, path

### Community 80 - "moduleNameMapper"
Cohesion: 0.40
Nodes (5): jest, moduleNameMapper, ^@common/(.*), ^@components/(.*), ^@utils/(.*)

### Community 81 - "完整使用示例"
Cohesion: 0.40
Nodes (5): 完整使用示例, 完整应用配置, 忘记密码流程, 用户注册流程, 用户登录流程

### Community 82 - "常见问题"
Cohesion: 0.40
Nodes (5): Q: 如何处理用户加入多个租户的场景?, Q: 如何实现租户数据隔离?, Q: 如何扩展租户用户字段?, Q: 如何自定义权限系统?, 常见问题

### Community 83 - "权限系统"
Cohesion: 0.40
Nodes (5): 权限系统, 权限结构, 权限验证, 系统角色, 自定义权限配置

### Community 84 - "六、列表组件"
Cohesion: 0.40
Nodes (5): 1. List（卡片式列表）, 2. TableList（表格列表）, 3. MultiField（多字段）, 4. 嵌套列表, 六、列表组件

### Community 85 - "九、表单上下文与API"
Cohesion: 0.40
Nodes (5): 1. useFormContext, 2. openApi 方法, 3. FormApiButton, 4. 字段关联（associations）, 九、表单上下文与API

### Community 86 - "七、弹窗与抽屉"
Cohesion: 0.40
Nodes (5): 1. useFormModal（表单弹窗 Hook）, 2. useFormDrawer（抽屉表单 Hook）, 3. FormModal 组件, 4. FormDrawer 组件, 七、弹窗与抽屉

### Community 87 - "五、校验规则"
Cohesion: 0.40
Nodes (5): 1. 内置规则, 2. 组合使用, 3. 自定义规则, 4. 字段通用属性, 五、校验规则

### Community 89 - "services/setting.js"
Cohesion: 0.40
Nodes (4): fp, fs, path, transform

### Community 91 - "extends"
Cohesion: 0.50
Nodes (4): eslintConfig, extends, react-app, react-app/jest

### Community 92 - "{src/**/*,server/**/*}.{js,jsx,ts,tsx,json,css,scss}"
Cohesion: 0.50
Nodes (4): lint-staged, {src/**/*,server/**/*}.{js,jsx,ts,tsx,json,css,scss}, git add, prettier --config .prettierrc --write

### Community 93 - "服务层方法"
Cohesion: 0.50
Nodes (4): account 服务, admin 服务, user 服务, 服务层方法

### Community 94 - "API 接口"
Cohesion: 0.50
Nodes (4): API 接口, 更新用户信息, 用户接口, 获取用户信息

### Community 95 - "数据模型"
Cohesion: 0.50
Nodes (4): User（用户表）, UserAccount（账号表）, VerificationCode（验证码表）, 数据模型

### Community 96 - "扩展开发"
Cohesion: 0.50
Nodes (4): 扩展开发, 添加自定义控制器, 添加自定义服务, 添加自定义模型

### Community 97 - "文档生成说明"
Cohesion: 0.50
Nodes (3): 文档生成说明, 文档结构, 文档要求

### Community 98 - "八、分步表单"
Cohesion: 0.50
Nodes (4): 1. FormSteps（步骤表单）, 2. FormStepsModal（模态框步骤表单）, 3. useFormStepModal（Hook 方式）, 八、分步表单

### Community 99 - "十一、最佳实践"
Cohesion: 0.50
Nodes (4): 十一、最佳实践, ✅ 推荐做法, ✅ 正确示例, ❌ 错误示例

### Community 100 - "app-manager-env-secret.js"
Cohesion: 0.27
Nodes (12): applyEnvPatchWithSecrets(), collectSecretKeys(), enhanceAppManagerEnvSecrets(), isSecretKey(), maskEnvForResponseWithSecrets(), normalizeSecretKeys(), remaskPublicApp(), {
  SECRET_MASK,
  isSecretKey: isPatternSecretKey
} (+4 more)

### Community 106 - "AdminWorklog/List/index.js"
Cohesion: 0.50
Nodes (3): getColumns(), List, renderAdminListCards

### Community 111 - "setupProxy.js"
Cohesion: 0.67
Nodes (3): { createProxyMiddleware }, isSseRequest(), proxyReq()

### Community 112 - "husky"
Cohesion: 0.67
Nodes (3): pre-commit, husky, hooks

### Community 113 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 114 - "十、多语言支持"
Cohesion: 0.67
Nodes (3): 1. Form 多语言配置, 2. lang 配置项, 十、多语言支持

## Knowledge Gaps
- **897 isolated node(s):** `{CracoRemoteComponentsPlugin}`, `aliasConfig`, `docker-run.sh script`, `name`, `version` (+892 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `fs-extra`, `@kne/fastify-account`, `server/package.json`, `@kne/fastify-aliyun`, `@kne/fastify-app-manager`, `@kne/fastify-file-manager`, `@kne/fastify-group`, `@kne/fastify-message`, `@kne/fastify-namespace`, `@kne/fastify-response-data-format`, `@kne/fastify-sequelize`, `@kne/fastify-signature`, `@kne/fastify-task`, `@kne/load-npm-info`, `@kne/md-doc`, `@kne/npm-tools`, `@modelcontextprotocol/fastify`, `@modelcontextprotocol/server`, `pg`, `lodash`, `turndown`, `turndown-plugin-gfm`, `zod`, `fastify`, `fastify-cron`, `@fastify/env`, `@fastify/multipart`, `fastify-plugin`, `@fastify/static`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `browserslist` connect `development` to `package.json`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `{CracoRemoteComponentsPlugin}`, `aliasConfig`, `docker-run.sh script` to the rest of the system?**
  _897 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Open API / MCP / 搜索统计` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `开发者文档系统使用指南：探索你的团队知识宝库` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `server/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._