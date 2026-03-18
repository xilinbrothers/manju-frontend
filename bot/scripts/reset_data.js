require('dotenv').config();

const { connectMongo, getMongoUri } = require('../db');
const Config = require('../models/Config');
const Series = require('../models/Series');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const DailyStat = require('../models/DailyStat');
const { loadStore, saveStore } = require('../store');

const nowIso = () => new Date().toISOString();

const defaultConfig = () => ({
  settings: {
    expiringDays: 7,
    schedulerEnabled: true,
    supportLink: 'https://t.me/manjudingyue',
    welcomeMessage:
      '欢迎来到漫剧订阅助手！\n\n📺 浏览并订阅全网热门漫剧\n🎟 付费入群观影\n💎 支持 支付宝\n\n请点击下方按钮进入商城或查看您的订阅。',
  },
  payment: {
    alipay: {
      merchantNo: '',
      merchantKey: '',
      apiUrl: '',
    },
  },
});

const resetMongo = async () => {
  await connectMongo();
  await Promise.all([
    Series.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    DailyStat.deleteMany({}),
  ]);
  const cfg = defaultConfig();
  await Config.updateOne({ key: 'default' }, { $set: { key: 'default', ...cfg } }, { upsert: true });
  process.stdout.write('MongoDB 已清空：series/users/orders/payments/dailystats，并重置 default config\n');
};

const resetStoreJson = async () => {
  const store = loadStore();
  const cfg = defaultConfig();
  const next = {
    ...store,
    settings: cfg.settings,
    payment: cfg.payment,
    series: [],
    users: {},
    orders: {},
    payments: {},
    updatedAt: nowIso(),
  };
  saveStore(next);
  process.stdout.write('store.json 已清空：series/users/orders/payments，并重置配置\n');
};

const run = async () => {
  const uri = getMongoUri();
  if (uri) return resetMongo();
  return resetStoreJson();
};

run().then(() => process.exit(0)).catch((e) => {
  process.stderr.write(`${e?.message || e}\n`);
  process.exit(1);
});

