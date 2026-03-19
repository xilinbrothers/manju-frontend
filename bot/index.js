require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verifyTelegramWebAppData, parseTelegramInitData } = require('./utils');
const { loadStore, saveStore, upsertUser } = require('./store');
const { connectMongo, getMongoUri } = require('./db');
const Config = require('./models/Config');
const Series = require('./models/Series');
const User = require('./models/User');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const DailyStat = require('./models/DailyStat');

// 检查必要的环境变量
if (!process.env.BOT_TOKEN) {
  console.error('错误: 未在 .env 文件中设置 BOT_TOKEN');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';
const HAS_MONGO_URI = Boolean(getMongoUri());
let mongoReady = false;
let mongoInitLogged = false;
const DEFAULT_PLANS = [
  { id: 'plan_30d', label: '30天', days: 30, priceCny: 9.9, enabled: true },
  { id: 'plan_90d', label: '90天', days: 90, priceCny: 25.9, enabled: true },
  { id: 'plan_365d', label: '年度', days: 365, priceCny: 88.9, enabled: true },
  { id: 'plan_lifetime', label: '整部剧', days: 0, priceCny: 128.0, enabled: true },
];
const buildRenewUrl = (seriesId) => `${WEB_APP_URL}/?page=plans&series_id=${encodeURIComponent(String(seriesId || ''))}`;

const initMongo = async () => {
  try {
    const uri = getMongoUri();
    if (!uri) return;
    await connectMongo();
    mongoReady = true;

    const existingConfig = await Config.findOne({ key: 'default' }).lean();
    if (!existingConfig) {
      await Config.create({ key: 'default' });
    } else if (!Array.isArray(existingConfig.plans) || existingConfig.plans.length === 0) {
      await Config.updateOne({ key: 'default' }, { $set: { plans: DEFAULT_PLANS } }, { upsert: true });
    }
  } catch (e) {
    mongoReady = false;
    if (!mongoInitLogged) {
      mongoInitLogged = true;
      console.error('❌ MongoDB 连接失败：请检查 MONGODB_URI / Atlas 用户密码 / IP 白名单', e?.message || e);
    }
  }
};

initMongo();

const getDateKey = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
};

const computeDailyStats = async (dateKey) => {
  if (!mongoReady) return null;
  const date = dateKey || getDateKey(new Date());
  if (!date) return null;
  const startIso = `${date}T00:00:00.000Z`;
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const endIso = end.toISOString();

  const newUsers = await User.countDocuments({ createdAt: { $gte: startIso, $lt: endIso } });
  const activeUsers = await User.countDocuments({ lastSeenAt: { $gte: startIso, $lt: endIso } });
  const subAgg = await User.aggregate([
    { $project: { n: { $size: { $objectToArray: '$subscriptions' } } } },
    { $match: { n: { $gt: 0 } } },
    { $count: 'c' },
  ]);
  const subscribedUsers = Number(subAgg?.[0]?.c || 0);

  const paidOrders = await Order.find({ status: 'paid', paidAtIso: { $gte: startIso, $lt: endIso } }).lean();
  const revenueCny = paidOrders.reduce((sum, o) => sum + (Number(o.amountCny || 0) || 0), 0);
  const byMethod = {};
  const bySeries = {};
  for (const o of paidOrders) {
    const m = o.paymentMethod || 'unknown';
    byMethod[m] = byMethod[m] || { amountCny: 0, orders: 0 };
    byMethod[m].amountCny += Number(o.amountCny || 0) || 0;
    byMethod[m].orders += 1;

    const s = o.seriesId || 'unknown';
    bySeries[s] = bySeries[s] || { amountCny: 0, orders: 0 };
    bySeries[s].amountCny += Number(o.amountCny || 0) || 0;
    bySeries[s].orders += 1;
  }

  const doc = {
    date,
    users: { newUsers, activeUsers, subscribedUsers },
    finance: { revenueCny, ordersPaid: paidOrders.length, byMethod, bySeries },
    computedAtIso: dateNowIso(),
  };

  await DailyStat.updateOne({ date }, { $set: doc }, { upsert: true });
  return doc;
};

const getConfig = async () => {
  if (mongoReady) {
    const doc = await Config.findOne({ key: 'default' }).lean();
    if (doc) return { ...doc, plans: Array.isArray(doc.plans) ? doc.plans : DEFAULT_PLANS };
    const created = await Config.create({ key: 'default' });
    return created.toObject();
  }
  const store = loadStore();
  return {
    key: 'default',
    settings: store.settings || {},
    payment: store.payment || {},
    plans: store.plans || DEFAULT_PLANS,
  };
};

const upsertUserFromTg = async (tgUser) => {
  if (!tgUser?.id) return null;
  const id = String(tgUser.id);
  const now = dateNowIso();
  if (mongoReady) {
    await User.updateOne(
      { telegramId: id },
      {
        $setOnInsert: { telegramId: id, createdAt: now },
        $set: {
          username: tgUser.username || '',
          firstName: tgUser.first_name || '',
          lastName: tgUser.last_name || '',
          language: tgUser.language_code || '',
          lastSeenAt: now,
        },
      },
      { upsert: true }
    );
    return User.findOne({ telegramId: id }).lean();
  }
  const store = loadStore();
  const next = saveStore(upsertUser(store, tgUser));
  return next.users?.[id] || null;
};

/**
 * Express 服务器部分 (处理 API 请求)
 */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {}
app.use('/uploads', express.static(UPLOADS_DIR));

const dateNowIso = () => new Date().toISOString();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

app.post('/api/admin/upload/cover', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const okTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!okTypes.has(file.mimetype)) return res.status(400).json({ success: false, message: '仅支持 JPG/PNG/WEBP' });

    const coverDir = path.join(UPLOADS_DIR, 'covers');
    fs.mkdirSync(coverDir, { recursive: true });
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const name = `cover_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(coverDir, name);
    fs.writeFileSync(filePath, file.buffer);

    res.json({ success: true, url: `/uploads/covers/${name}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || '上传失败' });
  }
});

const formatDateZh = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return '';
  }
};

const computeStatus = (expireAtIso, expiringDays) => {
  const now = Date.now();
  const expireAt = new Date(expireAtIso).getTime();
  if (!expireAt || Number.isNaN(expireAt)) return 'expired';
  if (expireAt <= now) return 'expired';
  const diffDays = Math.ceil((expireAt - now) / (24 * 60 * 60 * 1000));
  if (diffDays <= expiringDays) return 'expiring';
  return 'active';
};

const generateAlipaySign = (params, merchantKey) => {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const stringSignTemp = `${filtered}&key=${merchantKey}`;
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
};

const verifyAlipaySign = (params, merchantKey) => {
  const sign = params.sign;
  if (!sign) return false;
  const copy = { ...params };
  delete copy.sign;
  const generated = generateAlipaySign(copy, merchantKey);
  return String(sign).toUpperCase() === generated;
};

const createSingleUseInviteLink = async (groupId) => {
  if (!groupId) throw new Error('未配置群组 ID');
  const expireDate = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
  const result = await bot.telegram.createChatInviteLink(groupId, {
    expire_date: expireDate,
    member_limit: 1,
  });
  return result.invite_link;
};

const createJoinRequestInviteLink = async (groupId) => {
  if (!groupId) throw new Error('未配置群组 ID');
  const expireDate = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000);
  const result = await bot.telegram.createChatInviteLink(groupId, {
    expire_date: expireDate,
    creates_join_request: true,
  });
  return result.invite_link;
};

// API 身份验证中间件 (基于 Telegram initData)
const telegramAuth = (req, res, next) => {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData || !verifyTelegramWebAppData(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: '无效的身份验证数据 (Unauthorized)' });
  }
  req.tg = parseTelegramInitData(initData);
  next();
};

app.get('/api/series', (req, res) => {
  (async () => {
    if (mongoReady) {
      const list = await Series.find({ enabled: { $ne: false } })
        .select('id title description cover status total category')
        .lean();
      return res.json(list.map((s) => ({ ...s, _id: undefined })));
    }
    const store = loadStore();
    const list = Array.isArray(store.series) ? store.series : [];
    const result = list
      .filter((s) => s && s.enabled !== false)
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        cover: s.cover,
        status: s.status,
        total: s.total,
        category: s.category,
      }));
    return res.json(result);
  })().catch(() => res.status(500).json({ error: 'server_error' }));
});

app.get('/api/plans', (req, res) => {
  (async () => {
    const seriesId = req.query.series_id;
    let series = null;
    let globalPlans = [];
    if (mongoReady) {
      series = seriesId ? await Series.findOne({ id: seriesId }).lean() : await Series.findOne({}).lean();
      const cfg = await getConfig();
      globalPlans = Array.isArray(cfg.plans) ? cfg.plans : [];
    } else {
      const store = loadStore();
      series = (store.series || []).find((s) => s.id === seriesId) || (store.series || [])[0] || null;
      const cfg = await getConfig();
      globalPlans = Array.isArray(cfg.plans) ? cfg.plans : [];
    }
    let plans = [];
    if (series && series.planOverride && Array.isArray(series.plans) && series.plans.length > 0) {
      plans = series.plans;
    } else {
      plans = globalPlans;
    }

    const mapped = plans.map((p) => {
      const days = Number(p.days || 0) || 0;
      const price = Number(p.priceCny || 0) || 0;
      const daily = days ? (price / days).toFixed(2) : '';
      return {
        id: p.id,
        label: p.label,
        price: String(price),
        daily,
        save: p.save ? String(p.save) : undefined,
        popular: Boolean(p.popular),
        enabled: p.enabled !== false,
        note: p.note || undefined,
        days,
      };
    });
    return res.json(mapped);
  })().catch(() => res.status(500).json({ error: 'server_error' }));
});

app.post('/api/preview', telegramAuth, async (req, res) => {
  try {
    const tgUser = req.tg?.user;
    const seriesId = req.body?.series_id;
    await upsertUserFromTg(tgUser);
    let series = null;
    if (mongoReady) series = await Series.findOne({ id: seriesId }).lean();
    else {
      const store = loadStore();
      series = (store.series || []).find((s) => s.id === seriesId) || null;
    }
    if (!series) return res.status(404).json({ success: false, message: '剧集不存在' });
    if (!series.trialGroupId) return res.status(400).json({ success: false, message: '未配置试看群' });
    const raw = String(series.trialGroupId || '').trim();
    let inviteLink = '';
    if (/^https?:\/\//i.test(raw)) {
      inviteLink = raw;
    } else if (/^(t\.me|telegram\.me)\//i.test(raw)) {
      inviteLink = `https://${raw}`;
    } else if (/^@\w+/i.test(raw)) {
      inviteLink = `https://t.me/${raw.slice(1)}`;
    } else if (/^\+\w+/i.test(raw)) {
      inviteLink = `https://t.me/${raw}`;
    } else {
      inviteLink = await createSingleUseInviteLink(raw);
    }
    res.json({ success: true, invite_link: inviteLink, userId: String(tgUser.id) });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || '生成邀请链接失败' });
  }
});

app.get('/api/user/subscriptions', telegramAuth, (req, res) => {
  (async () => {
    const tgUser = req.tg?.user;
    const user = await upsertUserFromTg(tgUser);
    const cfg = await getConfig();
    const expiringDays = Number(cfg.settings?.expiringDays || 7);
    const subs = user?.subscriptions || {};

    const activeSubs = [];
    const expiredSubs = [];

    const seriesIds = Object.keys(subs || {});
    const seriesList = mongoReady
      ? await Series.find({ id: { $in: seriesIds } }).lean()
      : (() => {
          const store = loadStore();
          return Array.isArray(store.series) ? store.series : [];
        })();

    for (const seriesId of seriesIds) {
      const sub = subs[seriesId];
      const series = (seriesList || []).find((s) => s.id === seriesId);
      if (!series) continue;
      const expireAtIso = sub.expireAt;
      const status = computeStatus(expireAtIso, expiringDays);
      const remainDays = Math.max(0, Math.ceil((new Date(expireAtIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      const planDays = Number(sub.planDays || 0);
      const isLifetime = planDays === 0;
      const totalDays = isLifetime ? 1 : (planDays || Math.max(remainDays, 1));
      const progress = isLifetime ? 0 : (totalDays ? Math.min(100, Math.max(0, Math.round(((totalDays - remainDays) / totalDays) * 100))) : 0);
      const planLabel = sub.planLabel || '';
      const payload = {
        id: `sub_${tgUser.id}_${seriesId}`,
        seriesId,
        title: series.title,
        plan: planLabel,
        remainingDays: isLifetime ? 99999 : remainDays,
        progress,
        status,
        cover: series.cover,
        groupLink: sub.vipInviteLink || '',
        expireDate: isLifetime ? '永久有效' : formatDateZh(expireAtIso),
      };
      if (status === 'expired') expiredSubs.push(payload);
      else activeSubs.push(payload);
    }

    return res.json({ activeSubs, expiredSubs, userId: String(tgUser.id) });
  })().catch(() => res.status(500).json({ error: 'server_error' }));
});

app.get('/api/admin/series', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    if (mongoReady) {
      const items = await Series.find({}).lean();
      return res.json({ items, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    return res.json({ items: store.series || [], updatedAt: store.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/series', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const body = req.body || {};
    const id = body.id || `series_${Date.now()}`;
    const item = {
      id,
      title: body.title || '未命名剧集',
      description: body.description || '',
      cover: body.cover || '',
      status: body.status || '连载中',
      total: Number(body.total || 0) || 0,
      category: body.category || '',
      enabled: body.enabled !== false,
      trialGroupId: body.trialGroupId || '',
      vipGroupId: body.vipGroupId || '',
      planOverride: Boolean(body.planOverride),
      plans: Array.isArray(body.plans) ? body.plans : [],
    };

    if (mongoReady) {
      const exists = await Series.findOne({ id }).lean();
      if (exists) return res.status(400).json({ success: false, message: 'ID 已存在' });
      const created = await Series.create(item);
      return res.json({ success: true, item: created.toObject(), updatedAt: dateNowIso() });
    }

    const store = loadStore();
    if ((store.series || []).some((s) => s.id === id)) return res.status(400).json({ success: false, message: 'ID 已存在' });
    const next = saveStore({ ...store, series: [...(store.series || []), item] });
    return res.json({ success: true, item, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.put('/api/admin/series/:id', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = req.params.id;
    const body = req.body || {};

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      const nextItem = {
        ...prev,
        title: body.title !== undefined ? body.title : prev.title,
        description: body.description !== undefined ? body.description : prev.description,
        cover: body.cover !== undefined ? body.cover : prev.cover,
        status: body.status !== undefined ? body.status : prev.status,
        total: body.total !== undefined ? Number(body.total || 0) : prev.total,
        category: body.category !== undefined ? body.category : prev.category,
        enabled: body.enabled !== undefined ? body.enabled !== false : prev.enabled,
        trialGroupId: body.trialGroupId !== undefined ? body.trialGroupId : prev.trialGroupId,
        vipGroupId: body.vipGroupId !== undefined ? body.vipGroupId : prev.vipGroupId,
        planOverride: body.planOverride !== undefined ? Boolean(body.planOverride) : prev.planOverride,
        plans: Array.isArray(body.plans) ? body.plans : prev.plans,
      };
      await Series.updateOne({ id }, { $set: nextItem });
      const updated = await Series.findOne({ id }).lean();
      return res.json({ success: true, item: updated, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => s.id === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prev = store.series[idx];
    const nextItem = {
      ...prev,
      title: body.title !== undefined ? body.title : prev.title,
      description: body.description !== undefined ? body.description : prev.description,
      cover: body.cover !== undefined ? body.cover : prev.cover,
      status: body.status !== undefined ? body.status : prev.status,
      total: body.total !== undefined ? Number(body.total || 0) : prev.total,
      category: body.category !== undefined ? body.category : prev.category,
      enabled: body.enabled !== undefined ? body.enabled !== false : prev.enabled,
      trialGroupId: body.trialGroupId !== undefined ? body.trialGroupId : prev.trialGroupId,
      vipGroupId: body.vipGroupId !== undefined ? body.vipGroupId : prev.vipGroupId,
      planOverride: body.planOverride !== undefined ? Boolean(body.planOverride) : prev.planOverride,
      plans: Array.isArray(body.plans) ? body.plans : prev.plans,
    };
    const nextSeries = [...store.series];
    nextSeries[idx] = nextItem;
    const next = saveStore({ ...store, series: nextSeries });
    return res.json({ success: true, item: nextItem, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.delete('/api/admin/series/:id', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = req.params.id;
    if (mongoReady) {
      await Series.deleteOne({ id });
      return res.json({ success: true, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const nextSeries = (store.series || []).filter((s) => s.id !== id);
    const next = saveStore({ ...store, series: nextSeries });
    return res.json({ success: true, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/settings', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const cfg = await getConfig();
    return res.json({ settings: cfg.settings || {}, plans: cfg.plans || [], updatedAt: dateNowIso() });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/settings', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const body = req.body || {};
    if (mongoReady) {
      const prev = await getConfig();
      const nextSettings = {
        ...(prev.settings || {}),
        expiringDays: body.expiringDays !== undefined ? Number(body.expiringDays || 0) : prev.settings?.expiringDays,
        schedulerEnabled: body.schedulerEnabled !== undefined ? Boolean(body.schedulerEnabled) : prev.settings?.schedulerEnabled,
        supportLink: body.supportLink !== undefined ? String(body.supportLink || '') : prev.settings?.supportLink,
        welcomeMessage: body.welcomeMessage !== undefined ? String(body.welcomeMessage || '') : prev.settings?.welcomeMessage,
      };
      const updateData = { settings: nextSettings };
      if (Array.isArray(body.plans)) {
        updateData.plans = body.plans;
      }
      await Config.updateOne({ key: 'default' }, { $set: updateData }, { upsert: true });
      return res.json({ success: true, settings: nextSettings, plans: updateData.plans || prev.plans, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const nextSettings = {
      ...(store.settings || {}),
      expiringDays: body.expiringDays !== undefined ? Number(body.expiringDays || 0) : store.settings?.expiringDays,
      schedulerEnabled: body.schedulerEnabled !== undefined ? Boolean(body.schedulerEnabled) : store.settings?.schedulerEnabled,
      supportLink: body.supportLink !== undefined ? String(body.supportLink || '') : store.settings?.supportLink,
      welcomeMessage: body.welcomeMessage !== undefined ? String(body.welcomeMessage || '') : store.settings?.welcomeMessage,
    };
    const nextStore = { ...store, settings: nextSettings };
    if (Array.isArray(body.plans)) {
      nextStore.plans = body.plans;
    }
    const next = saveStore(nextStore);
    return res.json({ success: true, settings: nextSettings, plans: nextStore.plans || store.plans, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/payment', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const cfg = await getConfig();
    return res.json({ payment: cfg.payment || {}, updatedAt: dateNowIso() });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/payment', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const body = req.body || {};
    if (mongoReady) {
      const prev = await getConfig();
      const nextPayment = {
        alipay: {
          ...(prev.payment?.alipay || {}),
          merchantNo: body?.alipay?.merchantNo !== undefined ? String(body.alipay.merchantNo || '') : prev.payment?.alipay?.merchantNo || '',
          merchantKey: body?.alipay?.merchantKey !== undefined ? String(body.alipay.merchantKey || '') : prev.payment?.alipay?.merchantKey || '',
          apiUrl: body?.alipay?.apiUrl !== undefined ? String(body.alipay.apiUrl || '') : prev.payment?.alipay?.apiUrl || '',
          productId: body?.alipay?.productId !== undefined ? String(body.alipay.productId || '') : prev.payment?.alipay?.productId || '',
        },
      };
      await Config.updateOne({ key: 'default' }, { $set: { payment: nextPayment } }, { upsert: true });
      return res.json({ success: true, payment: nextPayment, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const nextPayment = {
      alipay: {
        ...(store.payment?.alipay || {}),
        merchantNo: body?.alipay?.merchantNo !== undefined ? String(body.alipay.merchantNo || '') : store.payment?.alipay?.merchantNo || '',
        merchantKey: body?.alipay?.merchantKey !== undefined ? String(body.alipay.merchantKey || '') : store.payment?.alipay?.merchantKey || '',
        apiUrl: body?.alipay?.apiUrl !== undefined ? String(body.alipay.apiUrl || '') : store.payment?.alipay?.apiUrl || '',
        productId: body?.alipay?.productId !== undefined ? String(body.alipay.productId || '') : store.payment?.alipay?.productId || '',
      },
    };
    const next = saveStore({ ...store, payment: nextPayment });
    return res.json({ success: true, payment: nextPayment, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/telegram/menu-button', (req, res) => {
  (async () => {
    const menuButton = await bot.telegram.callApi('getChatMenuButton', {});
    return res.json({ menu_button: menuButton?.menu_button || menuButton || null, updatedAt: dateNowIso() });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/telegram/menu-button', (req, res) => {
  (async () => {
    const body = req.body || {};
    const action = String(body.action || '');
    if (action === 'reset') {
      const r = await bot.telegram.callApi('setChatMenuButton', { menu_button: { type: 'default' } });
      return res.json({ success: true, result: r, updatedAt: dateNowIso() });
    }
    if (action === 'web_app') {
      const text = String(body.text || '').trim();
      const url = String(body.url || '').trim();
      if (!text || !url) return res.status(400).json({ success: false, message: '参数缺失' });
      const r = await bot.telegram.callApi('setChatMenuButton', { menu_button: { type: 'web_app', text, web_app: { url } } });
      return res.json({ success: true, result: r, updatedAt: dateNowIso() });
    }
    return res.status(400).json({ success: false, message: '不支持的操作' });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/stats/users', (req, res) => {
  (async () => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    if (mongoReady) {
      const totalUsers = await User.countDocuments();
      const activeUsers7d = await User.countDocuments({ lastSeenAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() } });
      const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfDay.toISOString() } });
      const subAgg = await User.aggregate([
        { $project: { n: { $size: { $objectToArray: '$subscriptions' } } } },
        { $match: { n: { $gt: 0 } } },
        { $count: 'c' },
      ]);
      const subscribedUsers = Number(subAgg?.[0]?.c || 0);
      return res.json({ totalUsers, activeUsers7d, newUsersToday, subscribedUsers, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const users = Object.values(store.users || {});
    const totalUsers = users.length;
    const activeUsers7d = users.filter((u) => u?.lastSeenAt && now - new Date(u.lastSeenAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
    const newUsersToday = users.filter((u) => u?.createdAt && new Date(u.createdAt).getTime() >= startOfDay.getTime()).length;
    const subscribedUsers = users.filter((u) => Object.keys(u.subscriptions || {}).length > 0).length;
    return res.json({ totalUsers, activeUsers7d, newUsersToday, subscribedUsers, updatedAt: store.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/stats/finance', (req, res) => {
  (async () => {
    if (mongoReady) {
      const paid = await Order.find({ status: 'paid' }).lean();
      const totalRevenueCny = paid.reduce((sum, o) => sum + (Number(o.amountCny || 0) || 0), 0);
      const byMethod = {};
      for (const o of paid) {
        const m = o.paymentMethod || 'unknown';
        byMethod[m] = byMethod[m] || { amountCny: 0, orders: 0 };
        byMethod[m].amountCny += Number(o.amountCny || 0) || 0;
        byMethod[m].orders += 1;
      }
      return res.json({ totalRevenueCny, totalOrders: paid.length, byMethod, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const orders = Object.values(store.orders || {});
    const paid = orders.filter((o) => o?.status === 'paid');
    const totalRevenueCny = paid.reduce((sum, o) => sum + (Number(o.amountCny || 0) || 0), 0);
    const byMethod = {};
    for (const o of paid) {
      const m = o.paymentMethod || 'unknown';
      byMethod[m] = byMethod[m] || { amountCny: 0, orders: 0 };
      byMethod[m].amountCny += Number(o.amountCny || 0) || 0;
      byMethod[m].orders += 1;
    }
    return res.json({ totalRevenueCny, totalOrders: paid.length, byMethod, updatedAt: store.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/stats/daily', (req, res) => {
  (async () => {
    if (!mongoReady) return res.status(400).json({ success: false, message: 'MongoDB 未启用' });
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    const limit = Math.min(366, Math.max(1, Number(req.query.limit || 60)));

    if (from && to) {
      const items = await DailyStat.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean();
      return res.json({ items });
    }

    const items = await DailyStat.find({}).sort({ date: -1 }).limit(limit).lean();
    return res.json({ items: items.reverse() });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/stats/daily/recompute', (req, res) => {
  (async () => {
    if (!mongoReady) return res.status(400).json({ success: false, message: 'MongoDB 未启用' });
    const date = req.body?.date ? String(req.body.date) : getDateKey(new Date());
    const doc = await computeDailyStats(date);
    return res.json({ success: true, item: doc });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

const activateSubscription = async ({ orderId, telegramId }) => {
  if (mongoReady) {
    const order = await Order.findOne({ id: orderId }).lean();
    if (!order) throw new Error('订单不存在');
    const series = await Series.findOne({ id: order.seriesId }).lean();
    if (!series) throw new Error('剧集不存在');
    const plan = (series.plans || []).find((p) => p.id === order.planId);
    if (!plan) throw new Error('套餐不存在');

    const cfg = await getConfig();
    const expiringDays = Number(cfg.settings?.expiringDays || 7);
    const userId = String(telegramId);

    await upsertUserFromTg({ id: userId });
    const user = await User.findOne({ telegramId: userId }).lean();
    const prevSub = user?.subscriptions?.[series.id] || null;
    const now = Date.now();
    const prevExpire = prevSub?.expireAt ? new Date(prevSub.expireAt).getTime() : 0;
    const base = Math.max(now, prevExpire || 0);
    const planDays = Number(plan.days || 0);
    const expireAt = planDays === 0 
      ? new Date(base + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString();
    const status = computeStatus(expireAt, expiringDays);

    let vipInviteLink = prevSub?.vipInviteLink || '';
    if (series.vipGroupId) {
      try {
        vipInviteLink = await createJoinRequestInviteLink(series.vipGroupId);
      } catch {}
    }

    const updatedSub = {
      seriesId: series.id,
      planId: plan.id,
      planLabel: plan.label,
      planDays: plan.days,
      expireAt,
      status,
      vipInviteLink,
      expiringNotifiedAtIso: '',
      expiredHandledAtIso: '',
      updatedAt: dateNowIso(),
    };

    await User.updateOne(
      { telegramId: userId },
      {
        $set: {
          [`subscriptions.${series.id}`]: updatedSub,
          lastSeenAt: dateNowIso(),
        },
      }
    );

    await Order.updateOne({ id: orderId }, { $set: { status: 'paid', paidAtIso: dateNowIso() } });

    try {
      if (vipInviteLink) await bot.telegram.sendMessage(userId, `🎉 支付成功！《${series.title}》订阅已激活。\n\n进群链接：${vipInviteLink}`);
      else await bot.telegram.sendMessage(userId, `🎉 支付成功！《${series.title}》订阅已激活。\n\n请前往“我的订阅”查看。`);
    } catch {}

    return true;
  }

  const store = loadStore();
  const order = store.orders?.[orderId];
  if (!order) throw new Error('订单不存在');
  const series = (store.series || []).find((s) => s.id === order.seriesId);
  if (!series) throw new Error('剧集不存在');
  const plan = (series.plans || []).find((p) => p.id === order.planId);
  if (!plan) throw new Error('套餐不存在');

  const userId = String(telegramId);
  let next = upsertUser(store, { id: userId });
  const user = next.users?.[userId] || { telegramId: userId, subscriptions: {} };
  const prevSub = user.subscriptions?.[series.id] || {};
  const now = Date.now();
  const prevExpire = prevSub.expireAt ? new Date(prevSub.expireAt).getTime() : 0;
  const base = Math.max(now, prevExpire || 0);
  const planDays = Number(plan.days || 0);
  const expireAt = planDays === 0 
    ? new Date(base + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString();
  const expiringDays = Number(next.settings?.expiringDays || 7);
  const status = computeStatus(expireAt, expiringDays);

  let vipInviteLink = prevSub.vipInviteLink || '';
  if (series.vipGroupId) {
    try {
      vipInviteLink = await createJoinRequestInviteLink(series.vipGroupId);
    } catch {}
  }

  const updatedSub = {
    seriesId: series.id,
    planId: plan.id,
    planLabel: plan.label,
    planDays: plan.days,
    expireAt,
    status,
    vipInviteLink,
    expiringNotifiedAtIso: '',
    expiredHandledAtIso: '',
    updatedAt: dateNowIso(),
  };

  const nextUsers = {
    ...(next.users || {}),
    [userId]: {
      ...user,
      lastSeenAt: dateNowIso(),
      subscriptions: {
        ...(user.subscriptions || {}),
        [series.id]: updatedSub,
      },
    },
  };

  const nextOrders = {
    ...(next.orders || {}),
    [orderId]: {
      ...order,
      status: 'paid',
      paidAt: dateNowIso(),
    },
  };

  next = saveStore({ ...next, users: nextUsers, orders: nextOrders });

  try {
    if (vipInviteLink) await bot.telegram.sendMessage(userId, `🎉 支付成功！《${series.title}》订阅已激活。\n\n进群链接：${vipInviteLink}`);
    else await bot.telegram.sendMessage(userId, `🎉 支付成功！《${series.title}》订阅已激活。\n\n请前往“我的订阅”查看。`);
  } catch {}

  return next;
};

app.post('/api/orders', telegramAuth, async (req, res) => {
  try {
    const tgUser = req.tg?.user;
    const { series_id, plan_id, payment_method } = req.body || {};
    if (!series_id || !plan_id || !payment_method) {
      return res.status(400).json({ success: false, message: '参数缺失' });
    }

    await upsertUserFromTg(tgUser);

    let series = null;
    if (mongoReady) series = await Series.findOne({ id: series_id }).lean();
    else {
      const store = loadStore();
      series = (store.series || []).find((s) => s.id === series_id) || null;
    }
    if (!series) return res.status(404).json({ success: false, message: '剧集不存在' });
    const plan = (series.plans || []).find((p) => p.id === plan_id);
    if (!plan || plan.enabled === false) return res.status(400).json({ success: false, message: '套餐不可用' });

    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const amountCny = Number(plan.priceCny || 0) || 0;
    const order = {
      id: orderId,
      telegramId: String(tgUser.id),
      seriesId: series.id,
      planId: plan.id,
      planLabel: plan.label,
      planDays: plan.days,
      amountCny,
      paymentMethod: String(payment_method),
      status: 'created',
      createdAtIso: dateNowIso(),
    };
    if (mongoReady) {
      await Order.create(order);
    } else {
      let store = loadStore();
      store = saveStore({
        ...store,
        orders: {
          ...(store.orders || {}),
          [orderId]: { ...order, createdAt: order.createdAtIso },
        },
      });
    }

    if (payment_method === 'alipay') {
      return res.json({
        success: true,
        order_id: orderId,
        pay: { type: 'alipay', url: `${getApiBaseUrlForBrowser(req)}/api/order/alipay?order_id=${encodeURIComponent(orderId)}` },
      });
    }

    if (payment_method === 'stars') {
      return res.status(400).json({ success: false, message: 'Telegram Stars 支付已下线' });
    }

    return res.status(400).json({ success: false, message: '仅支持支付宝支付' });
  } catch (e) {
    res.status(500).json({ success: false, message: e?.message || '创建订单失败' });
  }
});

const getApiBaseUrlForBrowser = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

app.get('/api/order/alipay', async (req, res) => {
  try {
    const orderId = req.query.order_id;
    const cfg = await getConfig();
    const order = mongoReady ? await Order.findOne({ id: orderId }).lean() : (() => {
      const store = loadStore();
      return store.orders?.[orderId] || null;
    })();
    if (!order) return res.status(404).send('订单不存在');

    const merchantNo = cfg.payment?.alipay?.merchantNo || process.env.ALIPAY_MERCHANT_NO || '';
    const merchantKey = cfg.payment?.alipay?.merchantKey || process.env.ALIPAY_MERCHANT_KEY || '';
    const apiUrl = cfg.payment?.alipay?.apiUrl || process.env.ALIPAY_API_URL || '';
    if (!merchantNo || !merchantKey || !apiUrl) return res.status(400).send('支付宝参数未配置');

    const notifyUrl = `${getApiBaseUrlForBrowser(req)}/api/order/notify`;
    const productId = cfg.payment?.alipay?.productId ? String(cfg.payment.alipay.productId) : String(order.seriesId || '');
    const params = {
      merchant_no: merchantNo,
      out_order_no: orderId,
      notify_url: notifyUrl,
      amount: Math.round(Number(order.amountCny || 0) * 100),
      product_id: productId,
    };
    const sign = generateAlipaySign(params, merchantKey);
    const body = new URLSearchParams({ ...params, sign }).toString();
    const resp = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/order/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = await resp.json().catch(() => null);
    if (!json?.success || !json?.result?.url) return res.status(502).send('支付宝下单失败');
    res.redirect(json.result.url);
  } catch {
    res.status(500).send('支付宝下单失败');
  }
});

app.post('/api/order/notify', async (req, res) => {
  try {
    const cfg = await getConfig();
    const merchantKey = cfg.payment?.alipay?.merchantKey || process.env.ALIPAY_MERCHANT_KEY || '';
    if (!merchantKey) return res.status(400).send('配置缺失');
    const params = req.body || {};
    if (!verifyAlipaySign(params, merchantKey)) return res.status(400).send('签名错误');
    const outOrderNo = params.out_order_no;
    const status = params.status;
    if (!outOrderNo) return res.status(400).send('缺少订单号');

    const order = mongoReady ? await Order.findOne({ id: outOrderNo }).lean() : (() => {
      const store = loadStore();
      return store.orders?.[outOrderNo] || null;
    })();
    if (!order) return res.status(404).send('订单不存在');

    if (mongoReady) {
      await Payment.updateOne(
        { id: `pay_${outOrderNo}` },
        { $set: { id: `pay_${outOrderNo}`, orderId: outOrderNo, method: 'alipay', raw: params, updatedAtIso: dateNowIso() } },
        { upsert: true }
      );
    } else {
      const store = loadStore();
      let next = store;
      next.payments = {
        ...(next.payments || {}),
        [`pay_${outOrderNo}`]: {
          id: `pay_${outOrderNo}`,
          orderId: outOrderNo,
          method: 'alipay',
          raw: params,
          updatedAt: dateNowIso(),
        },
      };
      saveStore(next);
    }

    if (status === 'success' || status === 'paid') {
      await activateSubscription({ orderId: outOrderNo, telegramId: order.telegramId });
    } else {
      if (mongoReady) {
        await Order.updateOne({ id: outOrderNo }, { $set: { status: 'failed' } });
      } else {
        const store = loadStore();
        const nextOrders = {
          ...(store.orders || {}),
          [outOrderNo]: { ...order, status: 'failed', updatedAt: dateNowIso() },
        };
        saveStore({ ...store, orders: nextOrders });
      }
    }

    res.send('success');
  } catch {
    res.status(500).send('处理失败');
  }
});

/**
 * Telegraf Bot 部分 (处理 Bot 指令)
 */
const getWelcomeMessage = async (username) => {
  const cfg = await getConfig();
  const msg = cfg.settings?.welcomeMessage || '';
  return `你好 ${username}！ 👋\n\n${msg}`;
};

bot.start(async (ctx) => {
  const username = ctx.from.first_name || '朋友';
  const cfg = await getConfig();
  const support = cfg.settings?.supportLink || 'https://t.me/manjudingyue';
  return ctx.reply(
    await getWelcomeMessage(username),
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎬 进入漫剧商城', WEB_APP_URL)],
      [Markup.button.webApp('💎 我的订阅', `${WEB_APP_URL}/my-subs`)],
      [Markup.button.url('📞 联系客服', support)],
    ])
  );
});

bot.hears(['联系客服', '联系 客服', '联系人工客服', '客服'], async (ctx) => {
  try {
    const cfg = await getConfig();
    const support = cfg.settings?.supportLink || 'https://t.me/manjudingyue';
    return ctx.reply(
      `联系客服：${support}`,
      Markup.inlineKeyboard([[Markup.button.url('打开客服', support)]])
    );
  } catch {
    return ctx.reply('联系客服：https://t.me/manjudingyue');
  }
});

bot.on('chat_join_request', async (ctx) => {
  try {
    const req = ctx.update?.chat_join_request;
    const chatId = String(req?.chat?.id || '');
    const userId = String(req?.from?.id || '');
    if (!chatId || !userId) return;

    let series = null;
    if (mongoReady) {
      series = await Series.findOne({ vipGroupId: chatId }).lean();
    } else {
      const store = loadStore();
      series = (store.series || []).find((s) => String(s?.vipGroupId || '') === chatId) || null;
    }
    if (!series?.id) {
      try {
        await bot.telegram.declineChatJoinRequest(chatId, userId);
      } catch {}
      return;
    }

    let sub = null;
    if (mongoReady) {
      const user = await User.findOne({ telegramId: userId }).lean();
      sub = user?.subscriptions?.[series.id] || null;
    } else {
      const store = loadStore();
      sub = store.users?.[userId]?.subscriptions?.[series.id] || null;
    }

    const planDays = Number(sub?.planDays || 0);
    const expireAt = sub?.expireAt ? new Date(sub.expireAt).getTime() : 0;
    const ok = planDays === 0 || (expireAt && expireAt > Date.now());
    if (!ok) {
      try {
        await bot.telegram.declineChatJoinRequest(chatId, userId);
      } catch {}
      try {
        await bot.telegram.sendMessage(
          userId,
          `⏰ 您的《${series?.title || ''}》订阅未激活或已到期。请续费后再申请入群。`,
          Markup.inlineKeyboard([[Markup.button.webApp('立即续费', buildRenewUrl(series.id))]])
        );
      } catch {}
      return;
    }

    try {
      await bot.telegram.approveChatJoinRequest(chatId, userId);
    } catch {}
    try {
      await bot.telegram.sendMessage(userId, `✅ 已通过《${series?.title || ''}》VIP群入群申请。`);
    } catch {}
  } catch {}
});

bot.catch((err, ctx) => {
  console.error(`Ooops, 发生了错误: ${ctx.update_type}`, err);
});

// 启动 Bot 和 Express 服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API 服务器已在端口 ${PORT} 启动`);
});

const startBot = async (attempt = 1) => {
  try {
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    } catch {}
    await bot.launch();
    console.log('✅ Bot 已成功启动！');
    try {
      await bot.telegram.setMyCommands(
        [
          { command: 'start', description: '开始 / 打开主菜单' },
        ],
        { scope: { type: 'default' } }
      );
    } catch {}
  } catch (e) {
    const msg = e?.message || e;
    console.error(`❌ Bot 启动失败（第${attempt}次）：${msg}`);
    setTimeout(() => startBot(attempt + 1), 15000);
  }
};

startBot();

let lastSchedulerKey = '';
setInterval(async () => {
  try {
    const cfg = await getConfig();
    if (!cfg.settings?.schedulerEnabled) return;
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const hours = new Set([0, 4, 8, 12, 16, 20]);
    if (!hours.has(hour) || minute !== 0) return;
    const key = `${now.toISOString().slice(0, 10)}_${hour}`;
    if (key === lastSchedulerKey) return;
    lastSchedulerKey = key;

    const expiringDays = Number(cfg.settings?.expiringDays || 7);
    if (mongoReady) {
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const thresholdDate = new Date(nowDate.getTime() + expiringDays * 24 * 60 * 60 * 1000);

      const seriesList = await Series.find({}).select('id title vipGroupId').lean();
      const seriesMap = new Map((seriesList || []).map((s) => [String(s.id), s]));

      const basePipeline = [
        { $project: { telegramId: 1, subs: { $objectToArray: '$subscriptions' } } },
        { $unwind: '$subs' },
        {
          $addFields: {
            seriesId: '$subs.k',
            sub: '$subs.v',
            expireDate: {
              $dateFromString: {
                dateString: '$subs.v.expireAt',
                onError: null,
                onNull: null,
              },
            },
          },
        },
        { $match: { expireDate: { $ne: null } } },
      ];

      const expiringSubs = await User.aggregate([
        ...basePipeline,
        {
          $match: {
            'sub.planDays': { $gt: 0 },
            expireDate: { $gt: nowDate, $lte: thresholdDate },
            $or: [{ 'sub.expiringNotifiedAtIso': { $exists: false } }, { 'sub.expiringNotifiedAtIso': '' }],
          },
        },
        { $project: { telegramId: 1, seriesId: 1, expireAt: '$sub.expireAt' } },
      ]);

      for (const item of expiringSubs || []) {
        const seriesId = String(item.seriesId);
        const series = seriesMap.get(seriesId);
        const remainDays = Math.max(0, Math.ceil((new Date(item.expireAt).getTime() - nowDate.getTime()) / (24 * 60 * 60 * 1000)));
        try {
          await bot.telegram.sendMessage(
            String(item.telegramId),
            `⏰ 您的《${series?.title || ''}》订阅将在 ${remainDays} 天后到期。\n\n点击下方按钮续费：`,
            Markup.inlineKeyboard([[Markup.button.webApp('立即续费', buildRenewUrl(seriesId))]])
          );
          await User.updateOne(
            { telegramId: String(item.telegramId) },
            {
              $set: {
                [`subscriptions.${seriesId}.expiringNotifiedAtIso`]: nowIso,
                [`subscriptions.${seriesId}.status`]: 'expiring',
              },
            }
          );
        } catch {}
      }

      const expiredSubs = await User.aggregate([
        ...basePipeline,
        {
          $match: {
            'sub.planDays': { $gt: 0 },
            expireDate: { $lte: nowDate },
            $or: [{ 'sub.expiredHandledAtIso': { $exists: false } }, { 'sub.expiredHandledAtIso': '' }],
          },
        },
        { $project: { telegramId: 1, seriesId: 1 } },
      ]);

      for (const item of expiredSubs || []) {
        const seriesId = String(item.seriesId);
        const series = seriesMap.get(seriesId);
        try {
          if (series?.vipGroupId) {
            try {
              await bot.telegram.kickChatMember(series.vipGroupId, String(item.telegramId));
            } catch {}
          }
          try {
            await bot.telegram.sendMessage(
              String(item.telegramId),
              `⏰ 您的《${series?.title || ''}》订阅已到期。请续费后继续观看。`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', buildRenewUrl(seriesId))]])
            );
          } catch {}
          await User.updateOne(
            { telegramId: String(item.telegramId) },
            {
              $set: {
                [`subscriptions.${seriesId}.expiredHandledAtIso`]: nowIso,
                [`subscriptions.${seriesId}.status`]: 'expired',
              },
            }
          );
        } catch {}
      }
      try {
        const today = getDateKey(new Date());
        const yesterdayDate = new Date();
        yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
        const yesterday = getDateKey(yesterdayDate);
        await computeDailyStats(yesterday);
        await computeDailyStats(today);
      } catch {}
      return;
    }

    const store = loadStore();
    const users = store.users || {};
    for (const uid of Object.keys(users)) {
      const u = users[uid];
      const subs = u.subscriptions || {};
      for (const seriesId of Object.keys(subs)) {
        const sub = subs[seriesId];
        const status = computeStatus(sub.expireAt, expiringDays);
        if (Number(sub.planDays || 0) === 0) continue;
        let nextSub = { ...sub, status };
        if (status === 'expiring' && !sub.expiringNotifiedAtIso) {
          const series = (store.series || []).find((s) => s.id === seriesId);
          const remainDays = Math.max(0, Math.ceil((new Date(sub.expireAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          try {
            await bot.telegram.sendMessage(
              uid,
              `⏰ 您的《${series?.title || ''}》订阅将在 ${remainDays} 天后到期。\n\n点击下方按钮续费：`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', buildRenewUrl(seriesId))]])
            );
            nextSub = { ...nextSub, expiringNotifiedAtIso: dateNowIso() };
          } catch {}
        }
        if (status === 'expired' && !sub.expiredHandledAtIso) {
          const series = (store.series || []).find((s) => s.id === seriesId);
          if (series?.vipGroupId) {
            try {
              await bot.telegram.kickChatMember(series.vipGroupId, uid);
            } catch {}
          }
          try {
            await bot.telegram.sendMessage(
              uid,
              `⏰ 您的《${(store.series || []).find((s) => s.id === seriesId)?.title || ''}》订阅已到期。请续费后继续观看。`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', buildRenewUrl(seriesId))]])
            );
          } catch {}
          nextSub = { ...nextSub, expiredHandledAtIso: dateNowIso() };
        }
        subs[seriesId] = nextSub;
      }
      users[uid] = { ...u, subscriptions: subs };
    }
    saveStore({ ...store, users });
  } catch {}
}, 30 * 1000);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
