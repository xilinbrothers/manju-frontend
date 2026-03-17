# 版本管理文档

本文档用于约定本项目的版本号规则、发布流程、回滚方法与变更记录口径，便于后续多人协作与线上问题定位。

## 1. 版本号规则

采用语义化版本号：`MAJOR.MINOR.PATCH`

- `MAJOR`：不兼容变更（例如接口字段大改、路由结构变更、数据存储结构大改）
- `MINOR`：向后兼容的新功能（例如新增接口、新增后台页面但不破坏旧用法）
- `PATCH`：向后兼容的修复（例如 bugfix、样式修复、小范围逻辑修正）

## 2. 分支与发布约定

- `main`：可发布分支，保持可构建、可运行
- `release/vX.Y.Z`：可选，发版时从 `main` 拉分支做最终检查
- `hotfix/vX.Y.Z`：线上紧急修复分支

建议在 Git 中使用标签记录每次发布：

- `vX.Y.Z`：指向对应发布提交

## 3. 目录与入口约定

当前项目以单仓（monorepo）形式组织：

- `frontend/`：用户端 TMA（Telegram Mini App）
- `admin/`：后台管理端
- `bot/`：后端（Telegraf Bot + Express API + 本地 JSON 存储）

构建入口：

- 根目录 [index.html](file:///d:/CursorXiangMu/index.html) 作为 Vite 入口，加载 `frontend/src/main.jsx`
- 用户端与后台端通过路由区分：`/` 与 `/admin/*`

## 4. 本地运行与环境变量

### 4.1 前端

根目录执行：

- `npm install`
- `npm run dev`

环境变量（可选）：

- `VITE_API_BASE_URL`：后端地址，默认 `http://localhost:3000`
- `VITE_USE_MOCK`：是否启用前端 mock 数据（`true/false`），默认关闭

### 4.2 后端

进入 `bot/` 执行：

- `npm install`
- `npm run dev`

后端必须配置：

- `BOT_TOKEN`：Telegram Bot Token
- `WEB_APP_URL`：前端地址（本地一般为 `http://localhost:5173`）

支付（可选）：

- Telegram Provider Token（也可以在后台「支付配置」页面写入本地存储）
  - `TG_STARS_PROVIDER_TOKEN`
  - `TG_USDT_PROVIDER_TOKEN`
- 支付宝（也可以在后台「支付配置」页面写入本地存储）
  - `ALIPAY_MERCHANT_NO`
  - `ALIPAY_MERCHANT_KEY`
  - `ALIPAY_API_URL`

本地数据文件：

- `bot/data/store.json`

### 4.3 MongoDB（本地 Docker）

当 `bot/.env` 配置了 `MONGODB_URI` 时，后端会优先使用 MongoDB；未配置时继续使用本地 JSON 存储。

根目录启动 MongoDB：

- `docker compose -f docker-compose.mongo.yml up -d`

默认地址：

- MongoDB：`mongodb://127.0.0.1:27017/manju`
- 管理界面（mongo-express）：`http://127.0.0.1:8081`

从 `store.json` 迁移到 MongoDB：

- 进入 `bot/`：`npm run migrate:store`

## 5. 回滚（回退）方法

### 5.1 回退到某个发布版本

1) 查看标签：

- `git tag --list`

2) 回退到指定版本标签（示例：`v1.1.0`）：

- `git checkout v1.1.0`

如需继续开发（避免处于 detached HEAD），建议基于标签新建分支：

- `git checkout -b hotfix/v1.1.1 v1.1.0`

### 5.2 回滚单次提交

如果线上已发布某个提交但需要撤回：

- `git revert <commit_sha>`

## 6. 变更记录（Changelog 口径）

每次发布至少记录：

- 新增功能
- 重要行为变更
- 修复内容
- 可能的兼容性影响（如接口字段、路由、数据格式）
- 配置项变化（新增/废弃环境变量、存储字段）

## 7. 版本记录

### v1.2.0（当前）

**用户端**

- 新增试看接口联动：点击「免费试看」调用后端生成单次邀请链接并跳转
- 支付入口改为后端统一下单：支付宝由 `/api/orders` 创建订单后跳转支付；USDT 改为联系客服
- 关闭默认 mock 回退：仅在 `VITE_USE_MOCK=true` 时启用
- 清理会覆盖 Tailwind 的样式注入，恢复 Tailwind 样式体系

**后端**

- 引入本地 JSON 存储（`bot/data/store.json`）承载：剧集、套餐、用户、订单、支付配置、系统设置
- 引入 MongoDB（本地 Docker）与 Mongoose：配置 `MONGODB_URI` 后自动切换到 MongoDB
- 新增接口：
  - `POST /api/preview`
  - `POST /api/orders`
  - `GET /api/order/alipay`
  - `POST /api/order/notify`
  - `GET/POST /api/admin/settings`
  - `GET/POST /api/admin/payment`
  - `GET/POST/PUT/DELETE /api/admin/series`
  - `GET /api/admin/stats/users`
  - `GET /api/admin/stats/finance`
- 新增按天聚合统计模型与接口：
  - `GET /api/admin/stats/daily`
  - `POST /api/admin/stats/daily/recompute`
- 新增 4 小时级别的到期检查调度（00/04/08/12/16/20），到期后尝试踢出 VIP 群并通知
- 移除 Telegram Stars 支付链路（下单与回调），USDT 支付改为人工客服处理

**后台**

- 数据总览接入后端统计接口
- 支付配置接入后端配置接口
- 剧集管理列表/编辑/保存/删除接入后端 CRUD
- 新增「系统设置」页面，支持配置即将到期阈值、定时任务开关、客服链接、欢迎文案
- 概览页接入按天统计接口，展示收入趋势与热门剧集占比
