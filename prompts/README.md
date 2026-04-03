# Prompts 文档集合索引

本仓库包含多个 AI 辅助开发提示词文档集合，覆盖后端开发、前端开发、组件库开发等场景，帮助开发者快速完成各类开发任务。

## 文档集合列表

### 1. prompts-fastify-libs

**版本**: 1.0.0

**功能**: Fastify 业务插件开发提示词集合，涵盖用户认证、消息管理、数据库集成、多租户等核心功能模块。

**适用场景**:
- Fastify 后端服务开发
- 构建企业级 API 服务
- SaaS 多租户系统开发
- 编写可复用的业务插件

**核心内容**:
- 用户账号管理（注册、登录、JWT认证）
- 多渠道消息发送（邮件、短信）
- 数据库 ORM 集成（Sequelize）
- 多租户系统构建
- 单元测试编写

**详细文档**: [prompts-fastify-libs/README.md](./prompts-fastify-libs/README.md)

---

### 2. prompts-node-libs

**版本**: 1.0.1

**功能**: Node.js 库开发辅助提示词，专注于文档生成和 package.json 元数据完善。

**适用场景**:
- 为项目生成规范化文档
- 完善 npm 包描述信息
- 提升包的可搜索性

**核心内容**:
- 项目概述与 API 文档生成
- package.json 描述与关键词优化
- 文档格式规范

**详细文档**: [prompts-node-libs/README.md](./prompts-node-libs/README.md)

---

### 3. prompts-projects

**版本**: 1.0.0

**功能**: 前端项目开发提示词集合，支持国际化改造和业务模块快速生成。

**适用场景**:
- React 组件国际化改造
- 快速创建 CRUD 业务模块
- 前端项目工程化

**核心内容**:
- 组件国际化（多语言支持）
- BizUnit 业务模块生成
- 列表、表单、详情页开发

**详细文档**: [prompts-projects/README.md](./prompts-projects/README.md)

---

### 4. prompts-remote-components

**版本**: 1.0.2

**功能**: 远程组件库开发提示词集合，支持微前端架构、表单组件库、国际化等场景。

**适用场景**:
- 微前端架构开发
- 远程模块动态加载
- 企业级表单开发
- 组件文档与示例编写

**核心内容**:
- BizUnit 业务模块架构
- RemoteLoader 远程加载
- FormInfo 表单组件库
- 组件国际化与文档生成

**详细文档**: [prompts-remote-components/README.md](./prompts-remote-components/README.md)

---

## 快速选择指南

| 需求 | 推荐文档 | 所属集合 |
|------|----------|----------|
| 用户注册登录功能 | Fastify-Account 使用指南 | prompts-fastify-libs |
| 发送邮件/短信通知 | Fastify-Message 使用指南 | prompts-fastify-libs |
| 数据库模型定义 | Fastify-Sequelize 使用指南 | prompts-fastify-libs |
| 多租户 SaaS 系统 | Fastify-Tenant 使用指南 | prompts-fastify-libs |
| 开发新 Fastify 插件 | Fastify 业务插件开发指南 | prompts-fastify-libs |
| 编写单元测试 | 单元测试编写指南 | prompts-fastify-libs |
| 生成项目文档 | 生成文档 | prompts-node-libs |
| 完善 package.json | 完善 package.json 描述和关键词 | prompts-node-libs |
| 组件国际化改造 | 业务组件国际化 | prompts-projects |
| 创建业务模块 | 创建业务模块 | prompts-projects |
| 微前端远程加载 | RemoteLoader 使用指南 | prompts-remote-components |
| 构建复杂表单 | FormInfo 使用指南 | prompts-remote-components |
| 生成业务模块（完整 CRUD） | BizUnit 使用指南 | prompts-remote-components |
| 编写组件示例 | 组件示例编写提示词 | prompts-remote-components |
