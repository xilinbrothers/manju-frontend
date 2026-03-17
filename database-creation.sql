-- 数据库创建执行方案
-- 适用于 MongoDB 或 SQL 数据库

-- ====================================
-- 方案 1: MongoDB 数据库创建方案
-- ====================================

-- 1. 连接到 MongoDB
-- mongo

-- 2. 创建数据库
-- use manju_bot

-- 3. 创建集合（相当于 SQL 中的表）
-- 不需要显式创建集合，MongoDB 会在插入数据时自动创建

-- 4. 插入示例数据

-- 插入剧集数据
db.series.insertMany([
  {
    "id": "1",
    "title": "重生之我是大魔王",
    "cover": "https://picsum.photos/seed/cover1/300/450",
    "description": "重生回到过去，成为大魔王的故事",
    "trialGroupId": "-100123456789",
    "vipGroupId": "-100987654321",
    "plans": [
      { "id": "1", "label": "30天", "price": 69.9, "enabled": true, "popular": true },
      { "id": "2", "label": "90天", "price": 169.9, "enabled": true },
      { "id": "3", "label": "180天", "price": 299.9, "enabled": true },
      { "id": "4", "label": "365天", "price": 499.9, "enabled": true }
    ]
  },
  {
    "id": "2",
    "title": "校园恋爱物语",
    "cover": "https://picsum.photos/seed/cover2/300/450",
    "description": "校园里的青春恋爱故事",
    "trialGroupId": "-100123456789",
    "vipGroupId": "-100987654321",
    "plans": [
      { "id": "1", "label": "30天", "price": 69.9, "enabled": true, "popular": true },
      { "id": "2", "label": "90天", "price": 169.9, "enabled": true },
      { "id": "3", "label": "180天", "price": 299.9, "enabled": true },
      { "id": "4", "label": "365天", "price": 499.9, "enabled": true }
    ]
  },
  {
    "id": "3",
    "title": "星际争霸：破晓",
    "cover": "https://picsum.photos/seed/cover3/300/450",
    "description": "星际战争的史诗故事",
    "trialGroupId": "-100123456789",
    "vipGroupId": "-100987654321",
    "plans": [
      { "id": "1", "label": "30天", "price": 69.9, "enabled": true, "popular": true },
      { "id": "2", "label": "90天", "price": 169.9, "enabled": true },
      { "id": "3", "label": "180天", "price": 299.9, "enabled": true },
      { "id": "4", "label": "365天", "price": 499.9, "enabled": true }
    ]
  }
]);

-- 插入用户数据
db.users.insertOne({
  "telegramId": "123456789",
  "username": "test_user",
  "subscriptions": [],
  "groups": []
});

-- ====================================
-- 方案 2: SQL 数据库创建方案
-- ====================================

-- 1. 创建数据库
CREATE DATABASE manju_bot;

-- 2. 使用数据库
USE manju_bot;

-- 3. 创建用户表
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. 创建订阅表
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  series_id VARCHAR(255) NOT NULL,
  series_title VARCHAR(255) NOT NULL,
  expire_date DATETIME NOT NULL,
  status ENUM('active', 'expiring', 'expired') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. 创建群组表
CREATE TABLE user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  group_id VARCHAR(255) NOT NULL,
  group_name VARCHAR(255),
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 6. 创建剧集表
CREATE TABLE series (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  cover VARCHAR(255),
  description TEXT,
  trial_group_id VARCHAR(255),
  vip_group_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. 创建套餐表
CREATE TABLE plans (
  id VARCHAR(255) PRIMARY KEY,
  series_id VARCHAR(255) NOT NULL,
  label VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  daily DECIMAL(10,2) NOT NULL,
  save INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  popular BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (series_id) REFERENCES series(id)
);

-- 8. 创建支付表
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  out_order_no VARCHAR(255) UNIQUE NOT NULL,
  order_no VARCHAR(255),
  merchant_no VARCHAR(255),
  amount INT NOT NULL, -- 金额（分）
  product_id VARCHAR(255),
  user_id VARCHAR(255),
  series_id VARCHAR(255),
  plan_id VARCHAR(255),
  status ENUM('0', '1', '2', '-1') DEFAULT '0', -- 0-初始化, 1-支付中, 2-完成, -1-失败
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. 插入示例数据

-- 插入剧集数据
INSERT INTO series (id, title, cover, description, trial_group_id, vip_group_id) VALUES
('1', '重生之我是大魔王', 'https://picsum.photos/seed/cover1/300/450', '重生回到过去，成为大魔王的故事', '-100123456789', '-100987654321'),
('2', '校园恋爱物语', 'https://picsum.photos/seed/cover2/300/450', '校园里的青春恋爱故事', '-100123456789', '-100987654321'),
('3', '星际争霸：破晓', 'https://picsum.photos/seed/cover3/300/450', '星际战争的史诗故事', '-100123456789', '-100987654321');

-- 插入套餐数据
INSERT INTO plans (id, series_id, label, price, daily, save, enabled, popular) VALUES
('1', '1', '30天', 69.90, 2.33, 0, TRUE, TRUE),
('2', '1', '90天', 169.90, 1.89, 40, TRUE, FALSE),
('3', '1', '180天', 299.90, 1.67, 90, TRUE, FALSE),
('4', '1', '365天', 499.90, 1.37, 220, TRUE, FALSE),
('5', '2', '30天', 69.90, 2.33, 0, TRUE, TRUE),
('6', '2', '90天', 169.90, 1.89, 40, TRUE, FALSE),
('7', '2', '180天', 299.90, 1.67, 90, TRUE, FALSE),
('8', '2', '365天', 499.90, 1.37, 220, TRUE, FALSE),
('9', '3', '30天', 69.90, 2.33, 0, TRUE, TRUE),
('10', '3', '90天', 169.90, 1.89, 40, TRUE, FALSE),
('11', '3', '180天', 299.90, 1.67, 90, TRUE, FALSE),
('12', '3', '365天', 499.90, 1.37, 220, TRUE, FALSE);

-- 插入用户数据
INSERT INTO users (telegram_id, username) VALUES
('123456789', 'test_user');

-- ====================================
-- 本地联调配置
-- ====================================

-- 1. 数据库连接配置
-- 对于 MongoDB:
-- MONGODB_URI=mongodb://localhost:27017/manju_bot

-- 对于 SQL 数据库（以 MySQL 为例）:
-- DATABASE_URL=mysql://root:password@localhost:3306/manju_bot

-- 2. 后端服务配置
-- 创建 .env 文件，包含以下配置：
-- BOT_TOKEN=你的Telegram机器人令牌
-- MONGODB_URI=mongodb://localhost:27017/manju_bot
-- MERCHANT_NO=你的商户编号
-- MERCHANT_KEY=你的商户密钥
-- ALIPAY_API_URL=支付宝API地址
-- PORT=3000

-- 3. 前端配置
-- 创建 .env 文件，包含以下配置：
-- VITE_API_BASE_URL=http://localhost:3000

-- 4. 启动服务
-- 启动数据库服务（MongoDB 或 MySQL）
-- 启动后端服务：node backend-example.js
-- 启动前端服务：npm run dev

-- 5. 测试API
-- 前端访问：http://localhost:5173
-- 后端API：http://localhost:3000/api/series

-- ====================================
-- 数据库索引优化
-- ====================================

-- MongoDB 索引
-- db.users.createIndex({ telegramId: 1 });
-- db.series.createIndex({ id: 1 });
-- db.payments.createIndex({ outOrderNo: 1 });
-- db.payments.createIndex({ userId: 1 });

-- SQL 索引
-- CREATE INDEX idx_users_telegram_id ON users(telegram_id);
-- CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
-- CREATE INDEX idx_payments_out_order_no ON payments(out_order_no);
-- CREATE INDEX idx_payments_user_id ON payments(user_id);
-- CREATE INDEX idx_plans_series_id ON plans(series_id);
