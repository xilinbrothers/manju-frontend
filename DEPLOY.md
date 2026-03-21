# 部署说明（生产/预发）

本文档描述本项目在不同部署形态下的必备配置、上线检查与常见操作（含后台登录与封面迁移）。

---

## 1. 项目结构与进程

- `bot/`：后端（Telegraf + Express API），对外提供：
  - 用户端 API：`/api/*`
  - 后台 API：`/api/admin/*`
  - 静态上传：`/uploads/*`（封面文件）
- 根目录：前端（Vite 构建产物），包含：
  - 用户端 WebApp（Telegram WebApp）
  - 后台 Admin（同一个 Vite build 输出）

---

## 2. 必备环境变量清单

### 2.1 后端（bot）必配

在运行 `bot/index.js` 的环境中配置：

- `BOT_TOKEN`：Telegram Bot Token（必配）
- `WEB_APP_URL`：Telegram 菜单按钮跳转的 WebApp 地址（必配，通常是你的前端线上域名）
- `MONGO_URI`：MongoDB 连接串（可选；不配则落盘到本地 JSON store）
- `CORS_ORIGINS`：CORS 允许来源列表（可选，逗号分隔；不配则全部放行）

### 2.2 后台鉴权（强烈建议生产必配）

推荐使用 Google 登录 + JWT：

- `GOOGLE_CLIENT_ID`：Google OAuth Client ID（必配，给后端验签使用）
- `ADMIN_JWT_SECRET`：JWT 签名密钥（必配，随机长串）
- `ADMIN_EMAILS`：管理员邮箱白名单（必配，逗号分隔，小写/大写不敏感）
  - 示例：`ADMIN_EMAILS=aaa@gmail.com,bbb@company.com`

可选兜底（不推荐长期只用这个）：

- `ADMIN_TOKEN`：共享管理员 Token（可选，用作兜底登录/紧急访问）

### 2.3 前端（Vite）环境变量

在前端构建环境中配置：

- `VITE_API_BASE_URL`：API 基地址（可选；不配时本地默认 `http://localhost:3000`）
  - 生产建议配置成后端域名，例如 `https://api.example.com`
- `VITE_GOOGLE_CLIENT_ID`：Google OAuth Client ID（必配，给后台前端登录按钮使用；应与后端 `GOOGLE_CLIENT_ID` 相同）

---

## 3. 上传与封面存储（重要）

### 3.1 当前实现

封面不再存 base64，而是存成 URL（如 `/uploads/covers/xxx.webp` 或 `https://cdn.example.com/covers/xxx.webp`）。

后端支持两种存储模式，由 `MEDIA_STORAGE` 控制：

- `MEDIA_STORAGE=local`（默认）：写入 `bot/uploads/covers/` 并通过后端静态路由对外提供 `GET /uploads/covers/<filename>`
- `MEDIA_STORAGE=s3`：上传到 S3/OSS/R2 兼容对象存储并返回公网 URL

可选：

- `MEDIA_CLEANUP=true`：封面替换时尝试清理旧文件（local 生效；s3 需要配合 `S3_DELETE_ENABLED=true`）

### 3.2 对象存储（S3/OSS/R2）配置

当 `MEDIA_STORAGE=s3` 时，后端需要以下环境变量：

- `S3_BUCKET`：bucket 名称
- `S3_ACCESS_KEY_ID`：访问 key
- `S3_SECRET_ACCESS_KEY`：访问 secret
- `S3_PUBLIC_BASE_URL`：用于拼接最终公网访问 URL（建议是自定义域名或 CDN 域名）
- `S3_ENDPOINT`：可选，S3 兼容端点（R2/OSS/MinIO 通常需要）
- `S3_REGION`：可选，默认 `auto`
- `S3_PREFIX`：可选，上传路径前缀（不含前后 `/`）
- `S3_DELETE_ENABLED`：可选，设为 `true` 后允许清理旧封面对象（需要对应的删除权限）

### 3.3 本地磁盘（local）生产环境要求

当 `MEDIA_STORAGE=local` 时，必须满足：`bot/uploads` **可写且持久化**。

- 适合：VPS、常驻进程、Docker + Volume
- 不适合：多数 Serverless（例如 Vercel Serverless Function）默认文件系统不持久化

---

## 4. 后台登录（Google + JWT）

### 4.1 运行方式

- 后台会引导 Google 登录（后端验签成功后返回 JWT，前端存到 `localStorage.admin_token`）
- 如果 Google 未配置，也可以使用 `ADMIN_TOKEN` 兜底登录（同样写入 `localStorage.admin_token`）

### 4.2 常见问题

- 返回 `GOOGLE_CLIENT_ID 未配置`：说明后端缺少 `GOOGLE_CLIENT_ID`
- 返回 `ADMIN_JWT_SECRET 未配置`：说明后端缺少 JWT 签名密钥
- 返回 `ADMIN_EMAILS 未配置`：说明后端未设置管理员白名单
- 返回 `账号未被授权访问后台`：登录邮箱不在 `ADMIN_EMAILS` 白名单里

---

## 5. 历史封面迁移（base64 -> 文件URL）

如果历史数据里仍有 `data:image/...;base64,...`，可以在生产环境执行一次迁移。

### 5.1 迁移前准备

- 确认上传目录持久化（见 3.2）
- 备份：
  - Mongo：至少备份 `Series` 集合
  - JSON store：备份 `bot/data/store.json`

### 5.2 迁移接口

- 路径：`POST /api/admin/migrate/covers`
- Header：`Authorization: Bearer <admin_token>`
- Body：`{"confirm":true}`

PowerShell 示例：

```powershell
$BASE="https://你的后端域名"
$TOKEN="粘贴你的 admin_token 或 ADMIN_TOKEN"
Invoke-RestMethod -Method Post -Uri "$BASE/api/admin/migrate/covers" `
  -Headers @{ Authorization = "Bearer $TOKEN" } `
  -ContentType "application/json" `
  -Body '{"confirm":true}'
```

返回示例字段：

- `seriesCoverConverted`：转换了多少个剧集封面
- `seasonCoverConverted`：转换了多少个分季封面
- `seriesThumbConverted`：转换了多少个剧集缩略图
- `seasonThumbConverted`：转换了多少个分季缩略图

### 5.3 迁移后验收

- 后台：进入“剧集管理”，随机查看几部剧/分季，封面字段应为 `/uploads/covers/...` 或完整 URL
- 用户端：列表页/订阅页/选季页封面应正常加载
- 服务器：`bot/uploads/covers/` 应新增文件

---

## 6. 上线检查清单

### 6.1 后端

- 能启动：`BOT_TOKEN` 已配置
- `/api/admin/auth/me` 在未登录时返回 401（不应 200）
- `/api/admin/settings` 未授权返回 401，授权后 200
- 上传目录权限：`bot/uploads/` 可写
- 存储健康检查：`GET /api/admin/health/storage` 返回 `success: true`

### 6.2 前端

- `VITE_API_BASE_URL` 指向正确后端
- 后台可用 Google 登录（`VITE_GOOGLE_CLIENT_ID` 已配置）
- 用户端在 Telegram WebApp 中能正常请求（会带 `x-telegram-init-data`）

---

## 7. 上线 Runbook（部署选择 + 环境变量 + 自检/验收）

### 7.1 部署选择（必须先定）

- 如果后端运行在 **Serverless** 且文件系统不持久化：选择 `MEDIA_STORAGE=s3`
- 如果后端运行在 **VPS / Docker（带 Volume）/ 常驻进程**：可以用 `MEDIA_STORAGE=local` 或 `MEDIA_STORAGE=s3`

建议生产默认优先选择 `MEDIA_STORAGE=s3`（更不依赖机器与迁移更安全）。

### 7.2 环境变量准备

- 前端示例：根目录 [.env.example](file:///d:/CursorXiangMu/.env.example)
- 后端示例： [bot/.env.example](file:///d:/CursorXiangMu/bot/.env.example)

上线前把对应环境变量配置到你的部署平台（不要把真实密钥提交进仓库）。

### 7.3 自检（部署后立即跑）

准备一个管理员 Token（后台 Google 登录后的 JWT 或 `ADMIN_TOKEN`）。

PowerShell（Windows）：

```powershell
.\scripts\prod-health.ps1 -BaseUrl "https://你的后端域名" -AdminToken "你的admin_token"
```

Bash：

```bash
./scripts/prod-health.sh "https://你的后端域名" "你的admin_token"
```

核心关注点：

- `GET /api/admin/health/storage`：
  - `storage.mode` 与你的预期一致
  - local：`uploadsWritable=true`
  - s3：`hasCredentials=true` 且 `bucketCheck.ok=true`
- `GET /api/admin/migrate/covers/preview`：确认是否需要迁移（`needsMigration`）

### 7.4 封面迁移（强烈建议：存储就绪后再跑）

先预检：

- `GET /api/admin/migrate/covers/preview`

如果返回 `needsMigration=true`，再执行迁移：

- `POST /api/admin/migrate/covers` body：`{"confirm":true}`

PowerShell（Windows）一键执行：

```powershell
.\scripts\prod-migrate-covers.ps1 -BaseUrl "https://你的后端域名" -AdminToken "你的admin_token"
```

Bash 一键执行：

```bash
./scripts/prod-migrate-covers.sh "https://你的后端域名" "你的admin_token"
```

迁移后再次预检应变为 `needsMigration=false`（或相关 dataUrl 计数为 0）。

### 7.5 开启清理（强烈建议）

- local：设置 `MEDIA_CLEANUP=true`
- s3：设置 `MEDIA_CLEANUP=true` 且 `S3_DELETE_ENABLED=true`（并确保有 DeleteObject 权限）

开启后，替换封面/缩略图会尝试删除旧文件/旧对象，避免无限堆积。

### 7.6 验收（人工）

- 后台：
  - 登录成功后可打开「操作日志」，确认能看到最新操作记录
  - 剧集管理上传封面：能同时生成封面与缩略图（列表加载更快）
- 用户端：
  - 剧集列表封面正常显示（优先使用 `coverThumb`）
  - 选季页封面正常显示（优先使用 `coverThumb`）

---

## 8. 安全建议

- `ADMIN_JWT_SECRET` / `ADMIN_TOKEN` 必须足够长且不可复用
- `ADMIN_EMAILS` 建议只包含必要管理员邮箱
- 生产建议禁用 `*` 级别 CORS（按实际域名放行）
