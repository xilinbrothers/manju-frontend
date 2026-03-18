const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'store.json');

const ensureDir = (p) => {
  fs.mkdirSync(p, { recursive: true });
};

const nowIso = () => new Date().toISOString();

const defaultStore = () => ({
  version: 1,
  createdAt: nowIso(),
  updatedAt: nowIso(),
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
  series: [],
  users: {},
  orders: {},
  payments: {},
});

const loadStore = () => {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultStore();
    return parsed;
  } catch {
    const dir = path.dirname(STORE_PATH);
    ensureDir(dir);
    const s = defaultStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), 'utf-8');
    return s;
  }
};

const saveStore = (store) => {
  const dir = path.dirname(STORE_PATH);
  ensureDir(dir);
  const next = { ...store, updatedAt: nowIso() };
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(next, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
  return next;
};

const upsertUser = (store, tgUser) => {
  if (!tgUser?.id) return store;
  const id = String(tgUser.id);
  const prev = store.users?.[id] || {};
  const createdAt = prev.createdAt || nowIso();
  const nextUser = {
    telegramId: id,
    username: tgUser.username || prev.username || '',
    firstName: tgUser.first_name || prev.firstName || '',
    lastName: tgUser.last_name || prev.lastName || '',
    language: tgUser.language_code || prev.language || '',
    createdAt,
    lastSeenAt: nowIso(),
    subscriptions: prev.subscriptions || {},
  };
  return {
    ...store,
    users: {
      ...(store.users || {}),
      [id]: nextUser,
    },
  };
};

module.exports = { loadStore, saveStore, upsertUser, STORE_PATH };
