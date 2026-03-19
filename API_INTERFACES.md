# 漫剧订阅助手 - 前后端对接接口文档 (API Interfaces)

本文档定义了 Bot 前端 (TMA) 和 管理后台 (Admin) 与 后端 (Node.js) 之间的 API 对接规范。

## 1. 基础配置
- **Base URL**: `https://api.yourdomain.com/api` (建议后端独立部署)
- **Content-Type**: `application/json`

---

## 2. Bot 前端接口 (User Facing)

### 2.1 获取剧集列表
用于在首页展示所有可供订阅的剧集。
- **URL**: `GET /series`
- **Response**:
  ```json
  [
    {
      "id": "series_001",
      "title": "重生之我是大魔王",
      "cover": "https://example.com/cover.jpg",
      "status": "连载中",
      "updated_episodes": 24,
      "total_episodes": 50,
      "description": "剧集简介..."
    }
  ]
  ```

### 2.2 获取订阅套餐
获取当前系统的全局定价或特定剧集的定价。
- **URL**: `GET /plans?series_id={id}`
- **Response**:
  ```json
  [
    { "id": "30days", "label": "订阅30天", "price": 29.9, "enabled": true },
    { "id": "full", "label": "全集订阅", "price": 99.9, "enabled": true }
  ]
  ```

### 2.3 试看功能
用户点击试看按钮时调用，生成试看群邀请链接。
- **URL**: `POST /preview`
- **Body**:
  ```json
  {
    "user_id": "tg_user_123",
    "series_id": "series_001"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "试看群邀请链接已生成",
    "group_link": "https://t.me/+invite_link"
  }
  ```

### 2.4 创建支付订单
用户点击支付时调用，生成订单并获取支付参数。
- **URL**: `POST /orders`
- **Body**:
  ```json
  {
    "user_id": "tg_user_123",
    "series_id": "series_001",
    "plan_id": "30days",
    "payment_method": "alipay"
  }
  ```

### 2.5 获取用户订阅状态
在“我的订阅”页面展示。
- **URL**: `GET /user/subscriptions?user_id={tg_user_id}`
- **Response**:
  ```json
  [
    {
      "id": "sub_001",
      "series_title": "重生之我是大魔王",
      "cover": "https://example.com/cover.jpg",
      "plan": "30天订阅",
      "expire_date": "2026-06-14",
      "group_link": "https://t.me/+invite_link",
      "status": "active",
      "remainingDays": 15,
      "progress": 50
    }
  ]
  ```

---

## 3. 管理后台接口 (Admin Facing)

### 3.1 登录验证 (Google OAuth)
前端获取 Google Token 后，发送给后端验证。
- **URL**: `POST /admin/login`
- **Body**: `{ "token": "google_id_token" }`

### 3.2 剧集管理
- `GET /admin/series`: 获取详细管理列表
- `POST /admin/series`: 新增剧集
- `PUT /admin/series/:id`: 修改剧集 (封面、简介、绑定群组 ID)
- `DELETE /admin/series/:id`: 删除剧集

### 3.3 系统配置
- `GET /admin/config`: 获取当前支付配置、文案配置
- `POST /admin/config`: 更新配置

### 3.4 用户统计
- `GET /admin/stats/users`: 获取用户统计数据
- **Response**:
  ```json
  {
    "totalUsers": 1250,
    "activeUsers": 890,
    "newUsers": 120,
    "totalSubscribers": 580,
    "repurchaseRate": "35%",
    "statusStats": {
      "active": 420,
      "expiring": 80,
      "expired": 60,
      "unsubscribed": 670
    }
  }
  ```

### 3.5 财务统计
- `GET /admin/stats/finance`: 获取财务统计数据
- **Response**:
  ```json
  {
    "todayTotal": 12800,
    "todayOrders": 45,
    "totalRevenue": 328000,
    "totalOrders": 1250,
    "paymentMethodStats": {
      "alipay": { "amount": 100000, "orders": 400, "percentage": "30.5%" }
    },
    "seriesStats": [
      { "name": "重生之我是大魔王", "revenue": 120000, "orders": 450 },
      { "name": "校园恋爱物语", "revenue": 100000, "orders": 380 },
      { "name": "星际争霸：破晓", "revenue": 108000, "orders": 420 }
    ],
    "dailyStats": [
      { "date": "3/10", "amount": 8500, "orders": 30 },
      { "date": "3/11", "amount": 9200, "orders": 32 },
      { "date": "3/12", "amount": 10500, "orders": 38 },
      { "date": "3/13", "amount": 7800, "orders": 28 },
      { "date": "3/14", "amount": 11000, "orders": 40 },
      { "date": "3/15", "amount": 12800, "orders": 45 },
      { "date": "3/16", "amount": 9500, "orders": 35 }
    ]
  }
  ```

---

## 4. 后端部署建议 (Separation)

### 前端部署 (Vercel)
- **路径**: `/` -> Bot TMA
- **路径**: `/admin` -> 管理后台
- **环境变量**: `VITE_API_BASE_URL` 指向后端地址。

### 后端部署 (Railway / Render / VPS)
- **环境**: Node.js 18+
- **服务**:
  1. **Telegraf Bot**: 处理 Telegram 指令、回调。
  2. **Express/Fastify**: 提供上述 REST API 供前端调用。
- **数据库**: MongoDB / PostgreSQL (存储剧集、订单、用户订阅信息)。
