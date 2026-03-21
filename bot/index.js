require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { verifyTelegramWebAppData, parseTelegramInitData } = require('./utils');
const { loadStore, saveStore, upsertUser } = require('./store');
const { connectMongo, getMongoUri } = require('./db');
const Config = require('./models/Config');
const Series = require('./models/Series');
const User = require('./models/User');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const DailyStat = require('./models/DailyStat');
const AdminAudit = require('./models/AdminAudit');
const {
  getUploadsDir,
  getStorageMode,
  getS3Config,
  checkS3Bucket,
  maybeDeleteByUrl,
  saveImageBuffer,
  normalizeCoverValueForStorage,
} = require('./mediaStorage');

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
let cachedMenuButton = { at: 0, value: null };
const MENU_BUTTON_CACHE_MS = 60 * 1000;
const DEFAULT_PLANS = [
  { id: 'plan_30d', label: '30天', days: 30, priceCny: 9.9, enabled: true },
  { id: 'plan_90d', label: '90天', days: 90, priceCny: 25.9, enabled: true },
  { id: 'plan_365d', label: '年度', days: 365, priceCny: 88.9, enabled: true },
  { id: 'plan_lifetime', label: '整部剧', days: 0, priceCny: 128.0, enabled: true },
];
const getTelegramMenuButton = async () => {
  const now = Date.now();
  if (cachedMenuButton.value && now - cachedMenuButton.at < MENU_BUTTON_CACHE_MS) return cachedMenuButton.value;
  const resp = await bot.telegram.callApi('getChatMenuButton', {});
  const btn = resp?.menu_button || resp || null;
  cachedMenuButton = { at: now, value: btn };
  return btn;
};

const getEffectiveWebAppUrl = async () => {
  try {
    const btn = await getTelegramMenuButton();
    if (btn?.type === 'web_app' && btn?.web_app?.url) return String(btn.web_app.url);
  } catch {}
  return WEB_APP_URL;
};

const buildRenewUrl = async (seriesId) => `${await getEffectiveWebAppUrl()}/?page=season-select&series_id=${encodeURIComponent(String(seriesId || ''))}`;

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
    telegramOverrides: store.telegramOverrides || {},
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
const corsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((x) => String(x || '').trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsOrigins.length === 0) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Payload Too Large：图片过大或分季过多，请压缩图片或减少一次保存的分季数量' });
  }
  if (err && String(err.message || '') === 'CORS blocked') {
    return res.status(403).json({ success: false, message: 'CORS blocked：请配置 CORS_ORIGINS 放行当前来源' });
  }
  return next(err);
});

const UPLOADS_DIR = getUploadsDir();
if (getStorageMode() === 'local') {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {}
  app.use('/uploads', express.static(UPLOADS_DIR));
}

const dateNowIso = () => new Date().toISOString();

const appendAdminAudit = async (req, action, target, meta, overrideAdmin) => {
  try {
    const nowIso = dateNowIso();
    const a = overrideAdmin || req?.admin || {};
    const ip = String(req?.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim() || String(req?.ip || '');
    const userAgent = String(req?.headers?.['user-agent'] || '');
    const entry = {
      atIso: nowIso,
      adminType: String(a?.typ || ''),
      adminEmail: String(a?.email || ''),
      adminName: String(a?.name || ''),
      ip,
      userAgent,
      action: String(action || ''),
      target: String(target || ''),
      meta: meta && typeof meta === 'object' ? meta : null,
    };

    if (mongoReady) {
      await AdminAudit.create(entry);
      return entry;
    }

    const dir = path.join(__dirname, 'data');
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
    const filePath = path.join(dir, 'admin_audit.log');
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`);
    return entry;
  } catch {
    return null;
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const getAllowedAdminEmails = () => {
  const raw = String(process.env.ADMIN_EMAILS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((x) => String(x || '').trim().toLowerCase())
    .filter(Boolean);
};

const verifyAdminJwt = (token) => {
  const secret = String(process.env.ADMIN_JWT_SECRET || '').trim();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || payload.typ !== 'admin') return null;
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) return null;
    const allow = getAllowedAdminEmails();
    if (allow.length > 0 && !allow.includes(email)) return null;
    return payload;
  } catch {
    return null;
  }
};

const adminAuth = (req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const token = bearer || String(req.headers['x-admin-token'] || '').trim();
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const expected = String(process.env.ADMIN_TOKEN || '').trim();
  if (expected && token === expected) {
    req.admin = { typ: 'token' };
    return next();
  }

  const payload = verifyAdminJwt(token);
  if (payload) {
    req.admin = { typ: 'jwt', email: payload.email || '', name: payload.name || '', picture: payload.picture || '' };
    return next();
  }

  const hasAnyAuthConfigured = Boolean(expected) || Boolean(String(process.env.ADMIN_JWT_SECRET || '').trim());
  if (!hasAnyAuthConfigured) return res.status(500).json({ success: false, message: '未配置后台鉴权（ADMIN_TOKEN 或 ADMIN_JWT_SECRET）' });
  return res.status(401).json({ success: false, message: 'Unauthorized' });
};

app.use('/api/admin', (req, res, next) => {
  if (req.path && req.path.startsWith('/auth/')) return next();
  return adminAuth(req, res, next);
});

app.post('/api/admin/auth/google', (req, res) => {
  (async () => {
    const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const jwtSecret = String(process.env.ADMIN_JWT_SECRET || '').trim();
    if (!googleClientId) return res.status(500).json({ success: false, message: 'GOOGLE_CLIENT_ID 未配置' });
    if (!jwtSecret) return res.status(500).json({ success: false, message: 'ADMIN_JWT_SECRET 未配置' });

    const allow = getAllowedAdminEmails();
    if (allow.length === 0) return res.status(500).json({ success: false, message: 'ADMIN_EMAILS 未配置' });

    const credential = String(req.body?.credential || '').trim();
    if (!credential) return res.status(400).json({ success: false, message: '缺少 credential' });

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: googleClientId });
    const payload = ticket.getPayload();

    const email = String(payload?.email || '').trim().toLowerCase();
    const emailVerified = payload?.email_verified === true;
    if (!email || !emailVerified) return res.status(401).json({ success: false, message: 'Google 邮箱未验证或缺少邮箱' });
    if (!allow.includes(email)) return res.status(403).json({ success: false, message: '账号未被授权访问后台' });

    const token = jwt.sign(
      { typ: 'admin', email, name: payload?.name || '', picture: payload?.picture || '' },
      jwtSecret,
      { expiresIn: '7d' }
    );
    await appendAdminAudit(
      req,
      'admin_login_google',
      email,
      { emailVerified: true },
      { typ: 'google', email, name: payload?.name || '', picture: payload?.picture || '' }
    );
    return res.json({
      success: true,
      token,
      admin: { email, name: payload?.name || '', picture: payload?.picture || '' },
      updatedAt: dateNowIso(),
    });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/auth/me', adminAuth, (req, res) => {
  return res.json({ success: true, admin: req.admin || null, updatedAt: dateNowIso() });
});

app.get('/api/admin/health/storage', async (req, res) => {
  try {
    const mode = getStorageMode();
    const s3 = getS3Config();
    let uploadsWritable = null;
    if (mode === 'local') {
      try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
        uploadsWritable = true;
      } catch {
        uploadsWritable = false;
      }
    }
    const s3BucketCheck = mode === 's3' ? await checkS3Bucket() : { ok: true, skipped: true };
    return res.json({
      success: true,
      storage: {
        mode,
        local: { enabled: mode === 'local', uploadsDir: UPLOADS_DIR, uploadsWritable },
        s3: {
          enabled: mode === 's3',
          bucket: s3.bucket || '',
          publicBaseUrl: s3.publicBaseUrl || '',
          endpoint: s3.endpoint || '',
          region: s3.region || '',
          keyPrefix: s3.keyPrefix || '',
          hasCredentials: Boolean(s3.hasCredentials),
          deleteEnabled: String(process.env.S3_DELETE_ENABLED || '').trim().toLowerCase() === 'true',
          bucketCheck: s3BucketCheck,
        },
      },
      updatedAt: dateNowIso(),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'server_error' });
  }
});

app.get('/api/admin/audit', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 50) || 50));
    if (mongoReady) {
      const items = await AdminAudit.find({}).sort({ createdAt: -1 }).limit(limit).lean();
      return res.json({ success: true, items, updatedAt: dateNowIso() });
    }
    const filePath = path.join(__dirname, 'data', 'admin_audit.log');
    if (!fs.existsSync(filePath)) return res.json({ success: true, items: [], updatedAt: dateNowIso() });
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const picked = lines.slice(Math.max(0, lines.length - limit));
    const items = picked
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
    return res.json({ success: true, items, updatedAt: dateNowIso() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'server_error' });
  }
});

app.post('/api/admin/upload/cover', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const url = await saveImageBuffer(file.buffer, file.mimetype, 'upload_cover');
    await appendAdminAudit(req, 'upload_cover', url, { mime: String(file.mimetype || ''), size: Number(file.size || 0) || 0 });
    res.json({ success: true, url });
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

const normalizeTargetType = (v) => {
  const x = String(v || '').trim().toLowerCase();
  if (x === 'super') return 'super';
  if (x === 'season') return 'season';
  if (x === 'series') return 'series';
  return '';
};

const normalizeSeasonId = (targetType, seasonId) => {
  if (targetType === 'super') return 'all';
  if (targetType === 'series') return '';
  return String(seasonId || '').trim();
};

const buildSubscriptionKey = (seriesId, targetType, seasonId) => {
  const t = normalizeTargetType(targetType) || 'season';
  const s = normalizeSeasonId(t, seasonId);
  const sid = String(seriesId || '').trim();
  if (t === 'series') return sid;
  return `${sid}:${t}:${s}`;
};

const parseSubscriptionKey = (key) => {
  const parts = String(key || '').split(':');
  if (parts.length < 2) {
    const seriesId = String(key || '').trim();
    if (!seriesId) return null;
    return { seriesId, targetType: 'series', seasonId: '' };
  }
  const seriesId = parts[0] || '';
  const targetType = normalizeTargetType(parts[1]) || '';
  const seasonId = parts.slice(2).join(':') || '';
  if (!seriesId || !targetType) return null;
  return { seriesId, targetType, seasonId };
};

const isSubscriptionOk = (sub) => {
  if (!sub) return false;
  const planDays = Number(sub.planDays || 0);
  const expireAt = sub?.expireAt ? new Date(sub.expireAt).getTime() : 0;
  return planDays === 0 || (expireAt && expireAt > Date.now());
};

const validateSeriesConfig = (body) => {
  const seasons = Array.isArray(body?.seasons) ? body.seasons : [];
  const superVip = body?.superVip && typeof body.superVip === 'object' ? body.superVip : {};

  if (!Array.isArray(seasons) || seasons.length === 0) return { ok: false, message: '请至少配置 1 个分季' };
  const seen = new Set();
  for (const s of seasons) {
    if (!s || typeof s !== 'object') return { ok: false, message: '分季配置不合法' };
    const enabled = s.enabled !== false;
    const seasonId = String(s.seasonId || '').trim();
    if (!seasonId) return { ok: false, message: '分季 seasonId 不能为空' };
    if (seen.has(seasonId)) return { ok: false, message: `分季 seasonId 重复：${seasonId}` };
    seen.add(seasonId);

    if (enabled) {
      const vipGroupId = String(s.vipGroupId || '').trim();
      if (!vipGroupId) return { ok: false, message: `分季 ${seasonId} 未配置 VIP 群 chat_id` };
    }

    const planOverride = Boolean(s.planOverride);
    const plans = Array.isArray(s.plans) ? s.plans : [];
    if (planOverride && plans.length === 0) return { ok: false, message: `分季 ${seasonId} 已开启套餐覆盖但未配置套餐` };
  }

  if (superVip?.enabled) {
    const gid = String(superVip.groupId || '').trim();
    if (!gid) return { ok: false, message: '已启用土豪专区但未配置土豪群 chat_id' };
    const planOverride = Boolean(superVip.planOverride);
    const plans = Array.isArray(superVip.plans) ? superVip.plans : [];
    if (planOverride && plans.length === 0) return { ok: false, message: '土豪专区已开启套餐覆盖但未配置套餐' };
    const minPayFen = Number(superVip?.pricing?.minPayFen ?? 100);
    if (!Number.isFinite(minPayFen) || minPayFen < 0) return { ok: false, message: '土豪专区最低应付金额不合法' };
  }

  return { ok: true };
};

const mergeSeasonsPreserveCover = (prevSeasons, nextSeasons) => {
  const prev = Array.isArray(prevSeasons) ? prevSeasons : [];
  const incoming = Array.isArray(nextSeasons) ? nextSeasons : [];
  const prevMap = new Map(prev.map((s) => [String(s?.seasonId || ''), s]));
  const merged = [];
  for (const s of incoming) {
    if (!s || typeof s !== 'object') continue;
    const sid = String(s.seasonId || '');
    const ps = prevMap.get(sid) || {};
    const cover = s.cover !== undefined ? s.cover : ps.cover;
    const coverThumb = s.coverThumb !== undefined ? s.coverThumb : ps.coverThumb;
    merged.push({
      ...ps,
      ...s,
      ...(cover !== undefined ? { cover } : {}),
      ...(coverThumb !== undefined ? { coverThumb } : {}),
    });
  }
  return merged;
};

const generateAlipaySign = (params, merchantKey) => {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
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

const createJoinRequestInviteLink = async (groupId, ttlSeconds = 15 * 60) => {
  if (!groupId) throw new Error('未配置群组 ID');
  const expireDate = Math.floor((Date.now() + Number(ttlSeconds || 0) * 1000) / 1000);
  const result = await bot.telegram.createChatInviteLink(groupId, {
    expire_date: expireDate,
    creates_join_request: true,
    member_limit: 1,
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
        .select('id title description cover coverThumb status total category')
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
        coverThumb: s.coverThumb || '',
        status: s.status,
        total: s.total,
        category: s.category,
      }));
    return res.json(result);
  })().catch(() => res.status(500).json({ error: 'server_error' }));
});

app.get('/api/series/:id', (req, res) => {
  (async () => {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: '参数缺失' });
    const series = mongoReady ? await Series.findOne({ id, enabled: { $ne: false } }).lean() : (() => {
      const store = loadStore();
      return (store.series || []).find((s) => String(s?.id || '') === id && s?.enabled !== false) || null;
    })();
    if (!series) return res.status(404).json({ success: false, message: '剧集不存在' });

    const seasons = Array.isArray(series.seasons) ? series.seasons : [];
    const mappedSeasons = seasons
      .filter((s) => s && s.enabled !== false)
      .sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0))
      .map((s) => ({
        seasonId: String(s.seasonId || ''),
        title: String(s.title || ''),
        cover: String(s.cover || ''),
        coverThumb: String(s.coverThumb || ''),
        introTitle: String(s.introTitle || ''),
        introText: String(s.introText || ''),
        enabled: s.enabled !== false,
        sort: Number(s.sort || 0) || 0,
      }));

    const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
    const superVipEnabled = Boolean(superVip.enabled) && Boolean(superVip.groupId);

    return res.json({
      success: true,
      item: {
        id: series.id,
        title: series.title,
        description: series.description,
        cover: series.cover,
        coverThumb: series.coverThumb || '',
        status: series.status,
        total: series.total,
        category: series.category,
        seasons: mappedSeasons,
        superVip: superVipEnabled
          ? {
              enabled: true,
              title: String(superVip.title || ''),
              desc: String(superVip.desc || ''),
              buttonText: String(superVip.buttonText || ''),
              pricing: {
                minPayFen: Number(superVip?.pricing?.minPayFen || 100) || 100,
                upgradeEnabled: superVip?.pricing?.upgradeEnabled !== false,
              },
            }
          : { enabled: false },
      },
      updatedAt: dateNowIso(),
    });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/series/:id/cover', upload.single('file'), (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: '参数缺失' });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const url = await saveImageBuffer(file.buffer, file.mimetype, `series_${id}_cover`);
    const cleanupEnabled = String(process.env.MEDIA_CLEANUP || '').trim().toLowerCase() === 'true';

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      await Series.updateOne({ id }, { $set: { cover: url } });
      await appendAdminAudit(req, 'series_cover_upload', id, { url });
      if (cleanupEnabled && prev.cover && prev.cover !== url) await maybeDeleteByUrl(prev.cover);
      return res.json({ success: true, url, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => String(s?.id || '') === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prevUrl = String(store.series?.[idx]?.cover || '');
    const nextSeries = [...(store.series || [])];
    nextSeries[idx] = { ...(nextSeries[idx] || {}), cover: url };
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'series_cover_upload', id, { url });
    if (cleanupEnabled && prevUrl && prevUrl !== url) await maybeDeleteByUrl(prevUrl);
    return res.json({ success: true, url, updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/series/:id/seasons/:seasonId/cover', upload.single('file'), (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = String(req.params.id || '').trim();
    const seasonId = String(req.params.seasonId || '').trim();
    if (!id || !seasonId) return res.status(400).json({ success: false, message: '参数缺失' });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const url = await saveImageBuffer(file.buffer, file.mimetype, `series_${id}_season_${seasonId}_cover`);
    const cleanupEnabled = String(process.env.MEDIA_CLEANUP || '').trim().toLowerCase() === 'true';

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      const exists = Array.isArray(prev.seasons) && prev.seasons.some((s) => String(s?.seasonId || '') === seasonId);
      if (!exists) {
        await Series.updateOne(
          { id },
          {
            $push: {
              seasons: {
                seasonId,
                enabled: false,
                title: '',
                introTitle: '',
                introText: '',
                vipGroupId: '',
                sort: 0,
                planOverride: false,
                plans: [],
                cover: url,
              },
            },
          }
        );
        await appendAdminAudit(req, 'season_cover_upload', `${id}:${seasonId}`, { url, created: true });
        return res.json({ success: true, url, updatedAt: dateNowIso() });
      }
      const prevSeason = (prev.seasons || []).find((s) => String(s?.seasonId || '') === seasonId) || {};
      await Series.updateOne({ id, 'seasons.seasonId': seasonId }, { $set: { 'seasons.$.cover': url } });
      await appendAdminAudit(req, 'season_cover_upload', `${id}:${seasonId}`, { url, created: false });
      if (cleanupEnabled && prevSeason.cover && prevSeason.cover !== url) await maybeDeleteByUrl(prevSeason.cover);
      return res.json({ success: true, url, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => String(s?.id || '') === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prev = store.series[idx] || {};
    const seasons = Array.isArray(prev.seasons) ? prev.seasons : [];
    const sidx = seasons.findIndex((s) => String(s?.seasonId || '') === seasonId);
    if (sidx < 0) {
      const nextSeasons = [...seasons, { seasonId, enabled: false, title: '', introTitle: '', introText: '', vipGroupId: '', sort: 0, planOverride: false, plans: [], cover: url }];
      const nextSeries = [...(store.series || [])];
      nextSeries[idx] = { ...prev, seasons: nextSeasons };
      const next = saveStore({ ...store, series: nextSeries });
      await appendAdminAudit(req, 'season_cover_upload', `${id}:${seasonId}`, { url, created: true });
      return res.json({ success: true, url, updatedAt: next.updatedAt });
    }
    const prevUrl = String(seasons?.[sidx]?.cover || '');
    const nextSeasons = [...seasons];
    nextSeasons[sidx] = { ...(nextSeasons[sidx] || {}), cover: url };
    const nextSeries = [...(store.series || [])];
    nextSeries[idx] = { ...prev, seasons: nextSeasons };
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'season_cover_upload', `${id}:${seasonId}`, { url, created: false });
    if (cleanupEnabled && prevUrl && prevUrl !== url) await maybeDeleteByUrl(prevUrl);
    return res.json({ success: true, url, updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/series/:id/cover_thumb', upload.single('file'), (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: '参数缺失' });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const url = await saveImageBuffer(file.buffer, file.mimetype, `series_${id}_cover_thumb`);
    const cleanupEnabled = String(process.env.MEDIA_CLEANUP || '').trim().toLowerCase() === 'true';

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      await Series.updateOne({ id }, { $set: { coverThumb: url } });
      await appendAdminAudit(req, 'series_cover_thumb_upload', id, { url });
      if (cleanupEnabled && prev.coverThumb && prev.coverThumb !== url) await maybeDeleteByUrl(prev.coverThumb);
      return res.json({ success: true, url, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => String(s?.id || '') === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prevUrl = String(store.series?.[idx]?.coverThumb || '');
    const nextSeries = [...(store.series || [])];
    nextSeries[idx] = { ...(nextSeries[idx] || {}), coverThumb: url };
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'series_cover_thumb_upload', id, { url });
    if (cleanupEnabled && prevUrl && prevUrl !== url) await maybeDeleteByUrl(prevUrl);
    return res.json({ success: true, url, updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/series/:id/seasons/:seasonId/cover_thumb', upload.single('file'), (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = String(req.params.id || '').trim();
    const seasonId = String(req.params.seasonId || '').trim();
    if (!id || !seasonId) return res.status(400).json({ success: false, message: '参数缺失' });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: '缺少文件' });
    const url = await saveImageBuffer(file.buffer, file.mimetype, `series_${id}_season_${seasonId}_thumb`);
    const cleanupEnabled = String(process.env.MEDIA_CLEANUP || '').trim().toLowerCase() === 'true';

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      const exists = Array.isArray(prev.seasons) && prev.seasons.some((s) => String(s?.seasonId || '') === seasonId);
      if (!exists) {
        await Series.updateOne(
          { id },
          {
            $push: {
              seasons: {
                seasonId,
                enabled: false,
                title: '',
                introTitle: '',
                introText: '',
                vipGroupId: '',
                sort: 0,
                planOverride: false,
                plans: [],
                cover: '',
                coverThumb: url,
              },
            },
          }
        );
        await appendAdminAudit(req, 'season_cover_thumb_upload', `${id}:${seasonId}`, { url, created: true });
        return res.json({ success: true, url, updatedAt: dateNowIso() });
      }
      const prevSeason = (prev.seasons || []).find((s) => String(s?.seasonId || '') === seasonId) || {};
      await Series.updateOne({ id, 'seasons.seasonId': seasonId }, { $set: { 'seasons.$.coverThumb': url } });
      await appendAdminAudit(req, 'season_cover_thumb_upload', `${id}:${seasonId}`, { url, created: false });
      if (cleanupEnabled && prevSeason.coverThumb && prevSeason.coverThumb !== url) await maybeDeleteByUrl(prevSeason.coverThumb);
      return res.json({ success: true, url, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => String(s?.id || '') === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prev = store.series[idx] || {};
    const seasons = Array.isArray(prev.seasons) ? prev.seasons : [];
    const sidx = seasons.findIndex((s) => String(s?.seasonId || '') === seasonId);
    if (sidx < 0) {
      const nextSeasons = [...seasons, { seasonId, enabled: false, title: '', introTitle: '', introText: '', vipGroupId: '', sort: 0, planOverride: false, plans: [], cover: '', coverThumb: url }];
      const nextSeries = [...(store.series || [])];
      nextSeries[idx] = { ...prev, seasons: nextSeasons };
      const next = saveStore({ ...store, series: nextSeries });
      await appendAdminAudit(req, 'season_cover_thumb_upload', `${id}:${seasonId}`, { url, created: true });
      return res.json({ success: true, url, updatedAt: next.updatedAt });
    }
    const prevUrl = String(seasons?.[sidx]?.coverThumb || '');
    const nextSeasons = [...seasons];
    nextSeasons[sidx] = { ...(nextSeasons[sidx] || {}), coverThumb: url };
    const nextSeries = [...(store.series || [])];
    nextSeries[idx] = { ...prev, seasons: nextSeasons };
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'season_cover_thumb_upload', `${id}:${seasonId}`, { url, created: false });
    if (cleanupEnabled && prevUrl && prevUrl !== url) await maybeDeleteByUrl(prevUrl);
    return res.json({ success: true, url, updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/series/draft', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const body = req.body || {};
    const id = String(body.id || '').trim() || `series_${Date.now()}`;
    const title = String(body.title || '').trim() || '未命名剧集';
    const nowIso = dateNowIso();

    const draftItem = {
      id,
      title,
      isDraft: true,
      description: '',
      cover: '',
      coverThumb: '',
      status: '连载中',
      total: 0,
      category: '',
      enabled: false,
      trialGroupId: '',
      vipGroupId: '',
      planOverride: false,
      plans: [],
      seasons: [],
      superVip: { enabled: false },
      updatedAt: nowIso,
      createdAt: nowIso,
    };

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) {
        const created = await Series.create(draftItem);
        return res.json({ success: true, item: created.toObject(), updatedAt: nowIso });
      }
      await Series.updateOne(
        { id },
        { $set: { title, isDraft: prev.isDraft !== false, enabled: prev.enabled !== false ? prev.enabled : false } }
      );
      const updated = await Series.findOne({ id }).lean();
      return res.json({ success: true, item: updated, updatedAt: nowIso });
    }

    const store = loadStore();
    const list = Array.isArray(store.series) ? store.series : [];
    const idx = list.findIndex((s) => String(s?.id || '') === id);
    if (idx < 0) {
      const next = saveStore({ ...store, series: [...list, draftItem] });
      return res.json({ success: true, item: draftItem, updatedAt: next.updatedAt });
    }
    const prev = list[idx] || {};
    const nextSeries = [...list];
    nextSeries[idx] = { ...prev, title: title || prev.title, isDraft: prev.isDraft !== false, enabled: prev.enabled !== false ? prev.enabled : false };
    const next = saveStore({ ...store, series: nextSeries });
    return res.json({ success: true, item: nextSeries[idx], updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/plans', (req, res) => {
  (async () => {
    const seriesId = req.query.series_id;
    const targetType = normalizeTargetType(req.query.target_type) || 'series';
    const seasonId = normalizeSeasonId(targetType, req.query.season_id);
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
    if (!series) return res.json([]);

    let entity = series;
    if (targetType === 'season') {
      const seasons = Array.isArray(series.seasons) ? series.seasons : [];
      if (seasons.length > 0) {
        if (!seasonId) return res.status(400).json({ error: 'season_id_required' });
        const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
        if (!season || season.enabled === false) return res.status(404).json({ error: 'season_not_found' });
        entity = season;
      }
    }
    if (targetType === 'super') {
      const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
      if (!superVip.enabled || !superVip.groupId) return res.status(400).json({ error: 'super_vip_not_enabled' });
      entity = superVip;
    }
    let plans = [];
    if (entity && entity.planOverride && Array.isArray(entity.plans) && entity.plans.length > 0) {
      plans = entity.plans;
    } else if (targetType !== 'series' && series.planOverride && Array.isArray(series.plans) && series.plans.length > 0) {
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

app.post('/api/vip/invite-link', telegramAuth, async (req, res) => {
  try {
    const tgUser = req.tg?.user;
    const userId = String(tgUser?.id || '');
    const seriesId = String(req.body?.series_id || '').trim();
    const targetType = normalizeTargetType(req.body?.target_type) || 'series';
    const seasonId = normalizeSeasonId(targetType, req.body?.season_id);
    if (!userId) return res.status(401).json({ success: false, message: '未授权' });
    if (!seriesId) return res.status(400).json({ success: false, message: '参数缺失' });
    await upsertUserFromTg(tgUser);

    let series = null;
    if (mongoReady) series = await Series.findOne({ id: seriesId }).lean();
    else {
      const store = loadStore();
      series = (store.series || []).find((s) => s.id === seriesId) || null;
    }
    if (!series) return res.status(404).json({ success: false, message: '剧集不存在' });
    const seasons = Array.isArray(series.seasons) ? series.seasons : [];
    const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
    let groupId = '';
    if (targetType === 'super') {
      if (!superVip.enabled || !superVip.groupId) return res.status(400).json({ success: false, message: '土豪专区未启用' });
      groupId = String(superVip.groupId || '');
    } else if (targetType === 'season') {
      if (!seasonId) return res.status(400).json({ success: false, message: '参数缺失' });
      const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
      if (!season || season.enabled === false) return res.status(404).json({ success: false, message: '分季不存在' });
      groupId = String(season.vipGroupId || '');
      if (!groupId) return res.status(400).json({ success: false, message: '未配置VIP群' });
    } else {
      groupId = String(series.vipGroupId || '');
      if (!groupId) return res.status(400).json({ success: false, message: '未配置VIP群' });
    }

    let sub = null;
    if (mongoReady) {
      const user = await User.findOne({ telegramId: userId }).lean();
      sub = user?.subscriptions?.[buildSubscriptionKey(seriesId, targetType, seasonId)] || null;
    } else {
      const store = loadStore();
      sub = store.users?.[userId]?.subscriptions?.[buildSubscriptionKey(seriesId, targetType, seasonId)] || null;
    }
    if (!isSubscriptionOk(sub)) return res.status(403).json({ success: false, message: '订阅未激活或已到期' });

    const inviteLink = await createJoinRequestInviteLink(String(groupId), 15 * 60);
    return res.json({ success: true, invite_link: inviteLink, userId, seriesId, targetType, seasonId, updatedAt: dateNowIso() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || '生成邀请链接失败' });
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

    const keys = Object.keys(subs || {});
    const parsedKeys = keys.map((k) => ({ key: k, parsed: parseSubscriptionKey(k) })).filter((x) => x.parsed);
    const seriesIds = [...new Set(parsedKeys.map((x) => x.parsed.seriesId))];
    const seriesList = mongoReady
      ? await Series.find({ id: { $in: seriesIds } }).lean()
      : (() => {
          const store = loadStore();
          return Array.isArray(store.series) ? store.series : [];
        })();

    for (const x of parsedKeys) {
      const { key, parsed } = x;
      const sub = subs[key];
      const series = (seriesList || []).find((s) => String(s?.id || '') === String(parsed.seriesId));
      if (!series) continue;
      const seasons = Array.isArray(series.seasons) ? series.seasons : [];
      const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
      let displayTitle = String(series.title || '');
      let cover = String(series.coverThumb || series.cover || '');
      let hasVipGroup = false;
      if (parsed.targetType === 'season') {
        const season = seasons.find((s) => String(s?.seasonId || '') === String(parsed.seasonId));
        if (season) {
          displayTitle = `${displayTitle} ${String(season.title || '')}`.trim();
          cover = String(season.coverThumb || season.cover || '') || cover;
          hasVipGroup = Boolean(season.vipGroupId);
        } else {
          hasVipGroup = Boolean(series.vipGroupId);
        }
      } else if (parsed.targetType === 'super') {
        displayTitle = `${displayTitle} 全季`.trim();
        hasVipGroup = Boolean(superVip.enabled) && Boolean(superVip.groupId);
      } else {
        hasVipGroup = Boolean(series.vipGroupId);
      }
      const expireAtIso = sub.expireAt;
      const status = computeStatus(expireAtIso, expiringDays);
      const remainDays = Math.max(0, Math.ceil((new Date(expireAtIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
      const planDays = Number(sub.planDays || 0);
      const isLifetime = planDays === 0;
      const totalDays = isLifetime ? 1 : (planDays || Math.max(remainDays, 1));
      const progress = isLifetime ? 0 : (totalDays ? Math.min(100, Math.max(0, Math.round(((totalDays - remainDays) / totalDays) * 100))) : 0);
      const planLabel = sub.planLabel || '';
      const payload = {
        id: `sub_${tgUser.id}_${key}`,
        seriesId: String(parsed.seriesId || ''),
        targetType: parsed.targetType,
        seasonId: String(parsed.seasonId || ''),
        title: displayTitle,
        plan: planLabel,
        remainingDays: isLifetime ? 99999 : remainDays,
        progress,
        status,
        cover,
        hasVipGroup,
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
    const check = validateSeriesConfig(body);
    if (!check.ok) return res.status(400).json({ success: false, message: check.message || '配置不合法' });
    const id = body.id || `series_${Date.now()}`;
    const incomingSeasons = Array.isArray(body.seasons) ? body.seasons : [];
    const normalizedSeasons = await Promise.all(incomingSeasons.map(async (s, idx) => {
      const sid = String(s?.seasonId || '').trim() || `s${idx + 1}`;
      if (s && typeof s === 'object') {
        const next = { ...s };
        if ('cover' in next) next.cover = await normalizeCoverValueForStorage(next.cover, `series_${id}_season_${sid}_cover`);
        if ('coverThumb' in next) next.coverThumb = await normalizeCoverValueForStorage(next.coverThumb, `series_${id}_season_${sid}_thumb`);
        return next;
      }
      return s;
    }));
    const normalizedCover = await normalizeCoverValueForStorage(body.cover, `series_${id}`);
    const normalizedCoverThumb = await normalizeCoverValueForStorage(body.coverThumb, `series_${id}_thumb`);
    const item = {
      id,
      title: body.title || '未命名剧集',
      isDraft: false,
      description: body.description || '',
      cover: normalizedCover || '',
      coverThumb: normalizedCoverThumb || '',
      status: body.status || '连载中',
      total: Number(body.total || 0) || 0,
      category: body.category || '',
      enabled: body.enabled !== false,
      trialGroupId: body.trialGroupId || '',
      vipGroupId: body.vipGroupId || '',
      planOverride: Boolean(body.planOverride),
      plans: Array.isArray(body.plans) ? body.plans : [],
      seasons: mergeSeasonsPreserveCover([], normalizedSeasons),
      superVip: body.superVip && typeof body.superVip === 'object' ? body.superVip : {},
    };

    if (mongoReady) {
      const exists = await Series.findOne({ id }).lean();
      if (exists) return res.status(400).json({ success: false, message: 'ID 已存在' });
      const created = await Series.create(item);
      await appendAdminAudit(req, 'series_create', id, { title: item.title || '', seasonsCount: item.seasons?.length || 0, enabled: item.enabled !== false });
      return res.json({ success: true, item: created.toObject(), updatedAt: dateNowIso() });
    }

    const store = loadStore();
    if ((store.series || []).some((s) => s.id === id)) return res.status(400).json({ success: false, message: 'ID 已存在' });
    const next = saveStore({ ...store, series: [...(store.series || []), item] });
    await appendAdminAudit(req, 'series_create', id, { title: item.title || '', seasonsCount: item.seasons?.length || 0, enabled: item.enabled !== false });
    return res.json({ success: true, item, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.put('/api/admin/series/:id', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = req.params.id;
    const body = req.body || {};
    const check = validateSeriesConfig(body);
    if (!check.ok) return res.status(400).json({ success: false, message: check.message || '配置不合法' });
    const incomingSeasons = Array.isArray(body.seasons) ? body.seasons : null;
    const normalizedSeasons =
      incomingSeasons === null
        ? null
        : await Promise.all(incomingSeasons.map(async (s, idx) => {
            const sid = String(s?.seasonId || '').trim() || `s${idx + 1}`;
            if (s && typeof s === 'object') {
              const next = { ...s };
              if ('cover' in next) next.cover = await normalizeCoverValueForStorage(next.cover, `series_${id}_season_${sid}_cover`);
              if ('coverThumb' in next) next.coverThumb = await normalizeCoverValueForStorage(next.coverThumb, `series_${id}_season_${sid}_thumb`);
              return next;
            }
            return s;
          }));
    const normalizedCover = body.cover !== undefined ? await normalizeCoverValueForStorage(body.cover, `series_${id}`) : undefined;
    const normalizedCoverThumb = body.coverThumb !== undefined ? await normalizeCoverValueForStorage(body.coverThumb, `series_${id}_thumb`) : undefined;

    if (mongoReady) {
      const prev = await Series.findOne({ id }).lean();
      if (!prev) return res.status(404).json({ success: false, message: '剧集不存在' });
      const nextItem = {
        ...prev,
        title: body.title !== undefined ? body.title : prev.title,
        isDraft: false,
        description: body.description !== undefined ? body.description : prev.description,
        cover: normalizedCover !== undefined ? normalizedCover : prev.cover,
        coverThumb: normalizedCoverThumb !== undefined ? normalizedCoverThumb : prev.coverThumb,
        status: body.status !== undefined ? body.status : prev.status,
        total: body.total !== undefined ? Number(body.total || 0) : prev.total,
        category: body.category !== undefined ? body.category : prev.category,
        enabled: body.enabled !== undefined ? body.enabled !== false : prev.enabled,
        trialGroupId: body.trialGroupId !== undefined ? body.trialGroupId : prev.trialGroupId,
        vipGroupId: body.vipGroupId !== undefined ? body.vipGroupId : prev.vipGroupId,
        planOverride: body.planOverride !== undefined ? Boolean(body.planOverride) : prev.planOverride,
        plans: Array.isArray(body.plans) ? body.plans : prev.plans,
        seasons: mergeSeasonsPreserveCover(prev.seasons, normalizedSeasons !== null ? normalizedSeasons : prev.seasons),
        superVip: body.superVip && typeof body.superVip === 'object' ? body.superVip : prev.superVip,
      };
      await Series.updateOne({ id }, { $set: nextItem });
      const updated = await Series.findOne({ id }).lean();
      await appendAdminAudit(req, 'series_update', id, { keys: Object.keys(body || {}), seasonsCount: Array.isArray(nextItem.seasons) ? nextItem.seasons.length : null });
      return res.json({ success: true, item: updated, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const idx = (store.series || []).findIndex((s) => s.id === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '剧集不存在' });
    const prev = store.series[idx];
    const nextItem = {
      ...prev,
      title: body.title !== undefined ? body.title : prev.title,
      isDraft: false,
      description: body.description !== undefined ? body.description : prev.description,
      cover: normalizedCover !== undefined ? normalizedCover : prev.cover,
      coverThumb: normalizedCoverThumb !== undefined ? normalizedCoverThumb : prev.coverThumb,
      status: body.status !== undefined ? body.status : prev.status,
      total: body.total !== undefined ? Number(body.total || 0) : prev.total,
      category: body.category !== undefined ? body.category : prev.category,
      enabled: body.enabled !== undefined ? body.enabled !== false : prev.enabled,
      trialGroupId: body.trialGroupId !== undefined ? body.trialGroupId : prev.trialGroupId,
      vipGroupId: body.vipGroupId !== undefined ? body.vipGroupId : prev.vipGroupId,
      planOverride: body.planOverride !== undefined ? Boolean(body.planOverride) : prev.planOverride,
      plans: Array.isArray(body.plans) ? body.plans : prev.plans,
      seasons: mergeSeasonsPreserveCover(prev.seasons, normalizedSeasons !== null ? normalizedSeasons : prev.seasons),
      superVip: body.superVip && typeof body.superVip === 'object' ? body.superVip : prev.superVip,
    };
    const nextSeries = [...store.series];
    nextSeries[idx] = nextItem;
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'series_update', id, { keys: Object.keys(body || {}), seasonsCount: Array.isArray(nextItem.seasons) ? nextItem.seasons.length : null });
    return res.json({ success: true, item: nextItem, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.delete('/api/admin/series/:id', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const id = req.params.id;
    if (mongoReady) {
      await Series.deleteOne({ id });
      await appendAdminAudit(req, 'series_delete', id, null);
      return res.json({ success: true, updatedAt: dateNowIso() });
    }
    const store = loadStore();
    const nextSeries = (store.series || []).filter((s) => s.id !== id);
    const next = saveStore({ ...store, series: nextSeries });
    await appendAdminAudit(req, 'series_delete', id, null);
    return res.json({ success: true, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.post('/api/admin/migrate/covers', (req, res) => {
  (async () => {
    if (HAS_MONGO_URI && !mongoReady) return res.status(503).json({ success: false, message: 'db_unavailable' });
    const body = req.body || {};
    if (body.confirm !== true) return res.status(400).json({ success: false, message: '需要 confirm=true' });
    await appendAdminAudit(req, 'covers_migrate_start', 'covers', null);

    let seriesCoverConverted = 0;
    let seasonCoverConverted = 0;
    let seriesThumbConverted = 0;
    let seasonThumbConverted = 0;

    const migrateSeries = async (item) => {
      const sid = String(item?.id || '').trim() || `series_${Date.now()}`;
      let changed = false;
      const next = { ...(item || {}) };
      const nextCover = await normalizeCoverValueForStorage(next.cover, `series_${sid}`);
      if (nextCover !== next.cover) {
        next.cover = nextCover;
        changed = true;
        seriesCoverConverted += 1;
      }
      const nextThumb = await normalizeCoverValueForStorage(next.coverThumb, `series_${sid}_thumb`);
      if (nextThumb !== next.coverThumb) {
        next.coverThumb = nextThumb;
        changed = true;
        seriesThumbConverted += 1;
      }
      const seasons = Array.isArray(next.seasons) ? next.seasons : [];
      const nextSeasons = [];
      for (let idx = 0; idx < seasons.length; idx += 1) {
        const s = seasons[idx];
        if (!s || typeof s !== 'object' || (!('cover' in s) && !('coverThumb' in s))) {
          nextSeasons.push(s);
          continue;
        }
        const seasonId = String(s?.seasonId || '').trim() || `s${idx + 1}`;
        const nextSeason = { ...s };
        const nc = await normalizeCoverValueForStorage(nextSeason.cover, `series_${sid}_season_${seasonId}_cover`);
        if (nc !== nextSeason.cover) {
          nextSeason.cover = nc;
          seasonCoverConverted += 1;
          changed = true;
        }
        const nt = await normalizeCoverValueForStorage(nextSeason.coverThumb, `series_${sid}_season_${seasonId}_thumb`);
        if (nt !== nextSeason.coverThumb) {
          nextSeason.coverThumb = nt;
          seasonThumbConverted += 1;
          changed = true;
        }
        nextSeasons.push(nextSeason);
      }
      if (changed) next.seasons = nextSeasons;
      return { changed, next };
    };

    if (mongoReady) {
      const items = await Series.find({}).lean();
      for (const it of items) {
        const { changed, next } = await migrateSeries(it);
        if (changed) await Series.updateOne({ id: it.id }, { $set: { cover: next.cover, coverThumb: next.coverThumb, seasons: next.seasons } });
      }
      await appendAdminAudit(req, 'covers_migrate_done', 'covers', { seriesCoverConverted, seasonCoverConverted, seriesThumbConverted, seasonThumbConverted });
      return res.json({ success: true, seriesCoverConverted, seasonCoverConverted, seriesThumbConverted, seasonThumbConverted, updatedAt: dateNowIso() });
    }

    const store = loadStore();
    const list = Array.isArray(store.series) ? store.series : [];
    const migratedList = await Promise.all(list.map((it) => migrateSeries(it)));
    const nextList = migratedList.map((x) => x.next);
    const next = saveStore({ ...store, series: nextList });
    await appendAdminAudit(req, 'covers_migrate_done', 'covers', { seriesCoverConverted, seasonCoverConverted, seriesThumbConverted, seasonThumbConverted });
    return res.json({ success: true, seriesCoverConverted, seasonCoverConverted, seriesThumbConverted, seasonThumbConverted, updatedAt: next.updatedAt });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
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
      await appendAdminAudit(req, 'settings_update', 'settings', {
        keys: Object.keys(body || {}),
        plansCount: Array.isArray(body.plans) ? body.plans.length : null,
      });
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
    await appendAdminAudit(req, 'settings_update', 'settings', {
      keys: Object.keys(body || {}),
      plansCount: Array.isArray(body.plans) ? body.plans.length : null,
    });
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
      await appendAdminAudit(req, 'payment_update', 'payment', {
        alipay: {
          merchantNo: body?.alipay?.merchantNo !== undefined ? String(body.alipay.merchantNo || '') : null,
          merchantKeySet: body?.alipay?.merchantKey !== undefined,
          apiUrl: body?.alipay?.apiUrl !== undefined ? String(body.alipay.apiUrl || '') : null,
          productId: body?.alipay?.productId !== undefined ? String(body.alipay.productId || '') : null,
        },
      });
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
    await appendAdminAudit(req, 'payment_update', 'payment', {
      alipay: {
        merchantNo: body?.alipay?.merchantNo !== undefined ? String(body.alipay.merchantNo || '') : null,
        merchantKeySet: body?.alipay?.merchantKey !== undefined,
        apiUrl: body?.alipay?.apiUrl !== undefined ? String(body.alipay.apiUrl || '') : null,
        productId: body?.alipay?.productId !== undefined ? String(body.alipay.productId || '') : null,
      },
    });
    return res.json({ success: true, payment: nextPayment, updatedAt: next.updatedAt });
  })().catch(() => res.status(500).json({ success: false, message: 'server_error' }));
});

app.get('/api/admin/telegram/menu-button', (req, res) => {
  (async () => {
    const menuButton = await bot.telegram.callApi('getChatMenuButton', {});
    return res.json({ menu_button: menuButton?.menu_button || menuButton || null, updatedAt: dateNowIso() });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

const saveTelegramOverrides = async (nextOverrides) => {
  if (mongoReady) {
    await Config.updateOne({ key: 'default' }, { $set: { telegramOverrides: nextOverrides } }, { upsert: true });
    return;
  }
  const store = loadStore();
  saveStore({ ...store, telegramOverrides: nextOverrides });
};

app.post('/api/admin/telegram/menu-button', (req, res) => {
  (async () => {
    const body = req.body || {};
    const action = String(body.action || '');
    await appendAdminAudit(req, 'telegram_menu_button', action, null);
    const cfg = await getConfig();
    const prevOverrides = cfg.telegramOverrides || {};
    const nextOverrides = { ...prevOverrides, menuButton: { ...(prevOverrides.menuButton || {}) } };

    if (action === 'clear_override' || action === 'reset') {
      nextOverrides.menuButton = { mode: 'inherit', text: '', url: '', updatedAtIso: dateNowIso() };
      await saveTelegramOverrides(nextOverrides);
      cachedMenuButton = { at: 0, value: null };
      return res.json({ success: true, overrides: nextOverrides.menuButton, updatedAt: dateNowIso() });
    }
    if (action === 'override_web_app' || action === 'web_app') {
      const text = String(body.text || '').trim();
      const url = String(body.url || '').trim();
      if (!text || !url) return res.status(400).json({ success: false, message: '参数缺失' });
      const r = await bot.telegram.callApi('setChatMenuButton', { menu_button: { type: 'web_app', text, web_app: { url } } });
      nextOverrides.menuButton = { mode: 'override', text, url, updatedAtIso: dateNowIso() };
      await saveTelegramOverrides(nextOverrides);
      cachedMenuButton = { at: 0, value: null };
      const current = await bot.telegram.callApi('getChatMenuButton', {});
      return res.json({ success: true, result: r, overrides: nextOverrides.menuButton, menu_button: current?.menu_button || current || null, updatedAt: dateNowIso() });
    }
    return res.status(400).json({ success: false, message: '不支持的操作' });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/telegram/me', (req, res) => {
  (async () => {
    const me = await bot.telegram.callApi('getMe', {});
    return res.json({ me, updatedAt: dateNowIso() });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/telegram/commands', (req, res) => {
  (async () => {
    const scope = { type: 'default' };
    const commands = await bot.telegram.callApi('getMyCommands', { scope });
    return res.json({ scope, commands: Array.isArray(commands) ? commands : [], updatedAt: dateNowIso() });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/telegram/commands', (req, res) => {
  (async () => {
    const body = req.body || {};
    const action = String(body.action || '');
    await appendAdminAudit(req, 'telegram_commands', action, { commandsCount: Array.isArray(body.commands) ? body.commands.length : null });
    const scope = { type: 'default' };
    const cfg = await getConfig();
    const prevOverrides = cfg.telegramOverrides || {};
    const nextOverrides = { ...prevOverrides, commands: { ...(prevOverrides.commands || {}) } };

    if (action === 'clear_override' || action === 'reset') {
      nextOverrides.commands = { mode: 'inherit', list: [], updatedAtIso: dateNowIso() };
      await saveTelegramOverrides(nextOverrides);
      return res.json({ success: true, overrides: nextOverrides.commands, updatedAt: dateNowIso() });
    }
    if (action === 'override_set' || action === 'set') {
      const commands = Array.isArray(body.commands) ? body.commands : [];
      const sanitized = commands
        .map((c) => ({ command: String(c?.command || '').trim(), description: String(c?.description || '').trim() }))
        .filter((c) => c.command && c.description);
      const r = await bot.telegram.callApi('setMyCommands', { scope, commands: sanitized });
      nextOverrides.commands = { mode: 'override', list: sanitized, updatedAtIso: dateNowIso() };
      await saveTelegramOverrides(nextOverrides);
      const current = await bot.telegram.callApi('getMyCommands', { scope });
      return res.json({ success: true, result: r, overrides: nextOverrides.commands, commands: Array.isArray(current) ? current : [], updatedAt: dateNowIso() });
    }
    return res.status(400).json({ success: false, message: '不支持的操作' });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/telegram/webhook', (req, res) => {
  (async () => {
    const info = await bot.telegram.callApi('getWebhookInfo', {});
    return res.json({ info, updatedAt: dateNowIso() });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.post('/api/admin/telegram/webhook', (req, res) => {
  (async () => {
    const body = req.body || {};
    const action = String(body.action || '');
    if (action === 'delete') {
      const drop = Boolean(body.drop_pending_updates);
      await appendAdminAudit(req, 'telegram_webhook_delete', 'webhook', { drop_pending_updates: drop });
      const r = await bot.telegram.callApi('deleteWebhook', { drop_pending_updates: drop });
      const cfg = await getConfig();
      const prevOverrides = cfg.telegramOverrides || {};
      const nextOverrides = { ...prevOverrides, webhook: { ...(prevOverrides.webhook || {}) } };
      nextOverrides.webhook = { mode: 'override', url: '', updatedAtIso: dateNowIso() };
      await saveTelegramOverrides(nextOverrides);
      return res.json({ success: true, result: r, updatedAt: dateNowIso() });
    }
    return res.status(400).json({ success: false, message: '不支持的操作' });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/telegram/overrides', (req, res) => {
  (async () => {
    const cfg = await getConfig();
    const overrides = cfg.telegramOverrides || {};
    return res.json({
      overrides,
      runtime: {
        webAppUrlDefault: WEB_APP_URL,
        hasMongoUri: HAS_MONGO_URI,
        mongoReady: Boolean(mongoReady),
      },
      updatedAt: dateNowIso(),
    });
  })().catch((e) => res.status(500).json({ success: false, message: e?.message || 'server_error' }));
});

app.get('/api/admin/telegram/group-check', (req, res) => {
  (async () => {
    const me = await bot.telegram.callApi('getMe', {});
    const botId = me?.id;
    if (!botId) return res.status(500).json({ success: false, message: 'bot_id_missing' });

    const seriesList = mongoReady ? await Series.find({}).lean() : (loadStore().series || []);
    const items = [];
    for (const s of seriesList || []) {
      const seriesId = String(s?.id || '');
      const title = String(s?.title || '');
      const trialGroupId = String(s?.trialGroupId || '');
      const legacyVipGroupId = String(s?.vipGroupId || '');
      const seasons = Array.isArray(s?.seasons) ? s.seasons : [];
      const superVip = s?.superVip && typeof s.superVip === 'object' ? s.superVip : {};

      const checkOne = async (chatId) => {
        if (!chatId) return { ok: false, error: 'not_set' };
        if (!/^[-]?\d+$/.test(chatId)) return { ok: false, error: 'not_chat_id' };
        try {
          const chat = await bot.telegram.callApi('getChat', { chat_id: chatId }).catch(() => null);
          const cm = await bot.telegram.callApi('getChatMember', { chat_id: chatId, user_id: botId });
          return {
            ok: true,
            status: cm?.status || '',
            can_invite_users: cm?.can_invite_users,
            can_restrict_members: cm?.can_restrict_members,
            can_manage_chat: cm?.can_manage_chat,
            chat: chat
              ? {
                  type: chat?.type || '',
                  title: chat?.title || '',
                  username: chat?.username || '',
                }
              : null,
          };
        } catch (e) {
          return { ok: false, error: e?.description || e?.message || 'unknown' };
        }
      };

      const trial = await checkOne(trialGroupId);
      const legacyVip = await checkOne(legacyVipGroupId);
      const seasonChecks = [];
      for (const ss of seasons || []) {
        if (!ss || ss.enabled === false) continue;
        seasonChecks.push({
          seasonId: String(ss.seasonId || ''),
          title: String(ss.title || ''),
          vipGroupId: String(ss.vipGroupId || ''),
          check: await checkOne(String(ss.vipGroupId || '')),
        });
      }
      const superVipConfiguredEnabled = Boolean(superVip?.enabled);
      const superVipGroupId = String(superVip?.groupId || '');
      const superVipCheck = superVipConfiguredEnabled && superVipGroupId
        ? {
            configuredEnabled: true,
            enabled: true,
            groupId: superVipGroupId,
            title: String(superVip.title || ''),
            check: await checkOne(superVipGroupId),
          }
        : { configuredEnabled: superVipConfiguredEnabled, enabled: false, groupId: superVipGroupId, title: String(superVip?.title || '') };
      items.push({ id: seriesId, title, trialGroupId, trial, legacyVipGroupId, legacyVip, seasons: seasonChecks, superVip: superVipCheck });
    }

    return res.json({ bot: { id: botId, username: me?.username || '' }, items, updatedAt: dateNowIso() });
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
    const targetType = normalizeTargetType(order.targetType) || 'series';
    const seasonId = normalizeSeasonId(targetType, order.seasonId);
    const seasons = Array.isArray(series.seasons) ? series.seasons : [];
    const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
    let entity = series;
    let displayTitle = String(series.title || '');
    if (targetType === 'season' && seasons.length > 0) {
      const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
      if (!season || season.enabled === false) throw new Error('分季不存在');
      entity = season;
      displayTitle = `${displayTitle} ${String(season.title || '')}`.trim();
    }
    if (targetType === 'super') {
      if (!superVip.enabled || !superVip.groupId) throw new Error('土豪专区未启用');
      entity = superVip;
      displayTitle = `${displayTitle} 全季`.trim();
    }

    const cfg = await getConfig();
    const expiringDays = Number(cfg.settings?.expiringDays || 7);
    const userId = String(telegramId);
    const globalPlans = Array.isArray(cfg.plans) ? cfg.plans : [];
    let plans = [];
    if (entity && entity.planOverride && Array.isArray(entity.plans) && entity.plans.length > 0) plans = entity.plans;
    else if (targetType !== 'series' && series.planOverride && Array.isArray(series.plans) && series.plans.length > 0) plans = series.plans;
    else plans = globalPlans;
    const plan = (plans || []).find((p) => String(p?.id || '') === String(order.planId || ''));
    if (!plan) throw new Error('套餐不存在');

    await upsertUserFromTg({ id: userId });
    const user = await User.findOne({ telegramId: userId }).lean();
    const subKey = buildSubscriptionKey(series.id, targetType, seasonId);
    const prevSub = user?.subscriptions?.[subKey] || null;
    const now = Date.now();
    const prevExpire = prevSub?.expireAt ? new Date(prevSub.expireAt).getTime() : 0;
    const base = Math.max(now, prevExpire || 0);
    const planDays = Number(plan.days || 0);
    const expireAt = planDays === 0 
      ? new Date(base + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString();
    const status = computeStatus(expireAt, expiringDays);

    const updatedSub = {
      seriesId: series.id,
      targetType,
      seasonId,
      planId: plan.id,
      planLabel: plan.label,
      planDays: plan.days,
      expireAt,
      status,
      vipInviteLink: '',
      baseAmountFen: Number(order.baseAmountFen || 0) || Math.round((Number(plan.priceCny || 0) || 0) * 100),
      discountFen: Number(order.discountFen || 0) || 0,
      payAmountFen: Number(order.payAmountFen || 0) || Math.round((Number(order.amountCny || 0) || 0) * 100),
      expiringNotifiedAtIso: '',
      expiredHandledAtIso: '',
      updatedAt: dateNowIso(),
    };

    await User.updateOne(
      { telegramId: userId },
      {
        $set: {
          [`subscriptions.${subKey}`]: updatedSub,
          lastSeenAt: dateNowIso(),
        },
      }
    );

    await Order.updateOne({ id: orderId }, { $set: { status: 'paid', paidAtIso: dateNowIso() } });

    try {
      const webAppUrl = await getEffectiveWebAppUrl();
      await bot.telegram.sendMessage(
        userId,
        `🎉 支付成功！《${displayTitle}》订阅已激活。\n\n请前往“我的订阅”点击进入群组（系统会为您生成一次性入群申请链接）。`,
        Markup.inlineKeyboard([[Markup.button.webApp('💎 我的订阅', `${webAppUrl}/my-subs`)]])
      );
    } catch {}

    return true;
  }

  const store = loadStore();
  const order = store.orders?.[orderId];
  if (!order) throw new Error('订单不存在');
  const series = (store.series || []).find((s) => s.id === order.seriesId);
  if (!series) throw new Error('剧集不存在');
  const targetType = normalizeTargetType(order.targetType) || 'series';
  const seasonId = normalizeSeasonId(targetType, order.seasonId);
  const seasons = Array.isArray(series.seasons) ? series.seasons : [];
  const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
  let entity = series;
  let displayTitle = String(series.title || '');
  if (targetType === 'season' && seasons.length > 0) {
    const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
    if (!season || season.enabled === false) throw new Error('分季不存在');
    entity = season;
    displayTitle = `${displayTitle} ${String(season.title || '')}`.trim();
  }
  if (targetType === 'super') {
    if (!superVip.enabled || !superVip.groupId) throw new Error('土豪专区未启用');
    entity = superVip;
    displayTitle = `${displayTitle} 全季`.trim();
  }
  const cfg = next;
  const globalPlans = Array.isArray(cfg.plans) ? cfg.plans : [];
  let plans = [];
  if (entity && entity.planOverride && Array.isArray(entity.plans) && entity.plans.length > 0) plans = entity.plans;
  else if (targetType !== 'series' && series.planOverride && Array.isArray(series.plans) && series.plans.length > 0) plans = series.plans;
  else plans = globalPlans;
  const plan = (plans || []).find((p) => String(p?.id || '') === String(order.planId || ''));
  if (!plan) throw new Error('套餐不存在');

  const userId = String(telegramId);
  let next = upsertUser(store, { id: userId });
  const user = next.users?.[userId] || { telegramId: userId, subscriptions: {} };
  const subKey = buildSubscriptionKey(series.id, targetType, seasonId);
  const prevSub = user.subscriptions?.[subKey] || {};
  const now = Date.now();
  const prevExpire = prevSub.expireAt ? new Date(prevSub.expireAt).getTime() : 0;
  const base = Math.max(now, prevExpire || 0);
  const planDays = Number(plan.days || 0);
  const expireAt = planDays === 0 
    ? new Date(base + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(base + planDays * 24 * 60 * 60 * 1000).toISOString();
  const expiringDays = Number(next.settings?.expiringDays || 7);
  const status = computeStatus(expireAt, expiringDays);

  const updatedSub = {
    seriesId: series.id,
    targetType,
    seasonId,
    planId: plan.id,
    planLabel: plan.label,
    planDays: plan.days,
    expireAt,
    status,
    vipInviteLink: '',
    baseAmountFen: Number(order.baseAmountFen || 0) || Math.round((Number(plan.priceCny || 0) || 0) * 100),
    discountFen: Number(order.discountFen || 0) || 0,
    payAmountFen: Number(order.payAmountFen || 0) || Math.round((Number(order.amountCny || 0) || 0) * 100),
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
        [subKey]: updatedSub,
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
    const webAppUrl = await getEffectiveWebAppUrl();
    await bot.telegram.sendMessage(
      userId,
      `🎉 支付成功！《${displayTitle}》订阅已激活。\n\n请前往“我的订阅”点击进入群组（系统会为您生成一次性入群申请链接）。`,
      Markup.inlineKeyboard([[Markup.button.webApp('💎 我的订阅', `${webAppUrl}/my-subs`)]])
    );
  } catch {}

  return next;
};

const computeOrderQuote = async ({ tgUser, series, cfg, planId, targetType, seasonId }) => {
  const seasons = Array.isArray(series.seasons) ? series.seasons : [];
  const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
  let entity = series;
  if (targetType === 'season' && seasons.length > 0) {
    if (!seasonId) throw new Error('参数缺失');
    const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
    if (!season || season.enabled === false) throw new Error('分季不存在');
    entity = season;
  }
  if (targetType === 'super') {
    if (!superVip.enabled || !superVip.groupId) throw new Error('土豪专区未启用');
    entity = superVip;
  }
  const globalPlans = Array.isArray(cfg.plans) ? cfg.plans : [];
  let plans = [];
  if (entity && entity.planOverride && Array.isArray(entity.plans) && entity.plans.length > 0) plans = entity.plans;
  else if (targetType !== 'series' && series.planOverride && Array.isArray(series.plans) && series.plans.length > 0) plans = series.plans;
  else plans = globalPlans;
  const plan = (plans || []).find((p) => String(p?.id || '') === String(planId || ''));
  if (!plan || plan.enabled === false) throw new Error('套餐不可用');

  const baseAmountFen = Math.round((Number(plan.priceCny || 0) || 0) * 100);
  if (!Number.isFinite(baseAmountFen) || baseAmountFen <= 0) throw new Error('套餐金额过低或不合法（需至少 0.01 元）');

  let discountFrom = [];
  let discountFen = 0;
  if (targetType === 'super' && superVip?.pricing?.upgradeEnabled !== false) {
    const uid = String(tgUser.id);
    const subs = mongoReady
      ? (await User.findOne({ telegramId: uid }).lean())?.subscriptions || {}
      : (loadStore().users?.[uid]?.subscriptions || {});
    const items = Object.entries(subs || {});
    for (const [k, v] of items) {
      const parsed = parseSubscriptionKey(k);
      if (!parsed) continue;
      if (parsed.seriesId !== String(series.id)) continue;
      if (parsed.targetType !== 'season') continue;
      if (!isSubscriptionOk(v)) continue;
      const amountFen = Number(v?.payAmountFen || 0) || Math.round((Number(v?.amountCny || 0) || 0) * 100);
      if (!amountFen || amountFen <= 0) continue;
      discountFrom.push({ seasonId: parsed.seasonId, amountFen, subscriptionKey: k });
      discountFen += amountFen;
    }
  }
  const minPayFen = Number(superVip?.pricing?.minPayFen || 100) || 100;
  const payAmountFen = targetType === 'super' ? Math.max(baseAmountFen - discountFen, minPayFen) : baseAmountFen;
  if (!Number.isFinite(payAmountFen) || payAmountFen <= 0) throw new Error('下单金额不合法');
  const amountCny = Number((payAmountFen / 100).toFixed(2));

  return {
    plan: { id: plan.id, label: plan.label, days: plan.days, priceCny: Number(plan.priceCny || 0) || 0 },
    baseAmountFen,
    discountFen: targetType === 'super' ? discountFen : 0,
    payAmountFen,
    minPayFen: targetType === 'super' ? minPayFen : 0,
    discountFrom: targetType === 'super' ? discountFrom : [],
    amountCny,
  };
};

app.post('/api/orders', telegramAuth, async (req, res) => {
  try {
    const tgUser = req.tg?.user;
    const { series_id, plan_id, payment_method, target_type, season_id } = req.body || {};
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
    const targetType = normalizeTargetType(target_type) || 'series';
    const seasonId = normalizeSeasonId(targetType, season_id);
    const cfg = await getConfig();
    const quote = await computeOrderQuote({ tgUser, series, cfg, planId: plan_id, targetType, seasonId });

    const orderId = `ord_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amountCny = quote.amountCny;
    const order = {
      id: orderId,
      telegramId: String(tgUser.id),
      seriesId: series.id,
      targetType,
      seasonId,
      planId: quote.plan.id,
      planLabel: quote.plan.label,
      planDays: quote.plan.days,
      amountCny,
      baseAmountFen: quote.baseAmountFen,
      discountFen: quote.discountFen,
      payAmountFen: quote.payAmountFen,
      discountFrom: quote.discountFrom,
      paymentMethod: String(payment_method),
      status: 'created',
      payUrl: '',
      upstreamOrderNo: '',
      payCreatedAtIso: '',
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
        quote: {
          seriesId: String(series.id || ''),
          targetType,
          seasonId,
          baseAmountFen: quote.baseAmountFen,
          discountFen: quote.discountFen,
          payAmountFen: quote.payAmountFen,
          minPayFen: quote.minPayFen,
          discountFrom: quote.discountFrom,
        },
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
    if (order?.payUrl) return res.redirect(String(order.payUrl));

    const merchantNo = cfg.payment?.alipay?.merchantNo || process.env.ALIPAY_MERCHANT_NO || '';
    const merchantKey = cfg.payment?.alipay?.merchantKey || process.env.ALIPAY_MERCHANT_KEY || '';
    const apiUrl = cfg.payment?.alipay?.apiUrl || process.env.ALIPAY_API_URL || '';
    if (!merchantNo || !merchantKey || !apiUrl) return res.status(400).send('支付宝参数未配置');

    const apiUrlTrimmed = String(apiUrl || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(apiUrlTrimmed)) return res.status(400).send('支付宝接口URL不合法');
    const createUrl = /\/api\/order\/create$/i.test(apiUrlTrimmed) ? apiUrlTrimmed : `${apiUrlTrimmed}/api/order/create`;
    const notifyUrl = `${getApiBaseUrlForBrowser(req)}/api/order/notify`;
    const productId = cfg.payment?.alipay?.productId ? String(cfg.payment.alipay.productId) : String(order.seriesId || '');
    const amountFen = Number(order.payAmountFen || 0) || Math.round(Number(order.amountCny || 0) * 100);
    if (!Number.isFinite(amountFen) || amountFen <= 0) return res.status(400).send('下单金额不合法（需至少 0.01 元）');
    const params = {
      merchant_no: merchantNo,
      out_order_no: orderId,
      notify_url: notifyUrl,
      amount: amountFen,
      product_id: productId,
    };
    const sign = generateAlipaySign(params, merchantKey);
    const body = new URLSearchParams({ ...params, sign }).toString();
    const resp = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await resp.text().catch(() => '');
    const json = (() => {
      try {
        return JSON.parse(text || '');
      } catch {
        return null;
      }
    })();
    if (!resp.ok) {
      const msg = String(json?.message || text || `上游状态码: ${resp.status}`);
      if (msg.includes('已存在')) {
        if (order?.payUrl) return res.redirect(String(order.payUrl));
        return res.status(409).send(`支付宝下单失败：${msg.slice(0, 500)}。请返回重新发起支付获取新订单号。`);
      }
      return res.status(502).send(`支付宝下单失败：${msg.slice(0, 500)}`);
    }
    if (!json?.success || !json?.result?.url) {
      const msg = json?.message || '缺少支付链接';
      return res.status(502).send(`支付宝下单失败：${String(msg).slice(0, 500)}`);
    }
    const payUrl = String(json.result.url || '');
    const upstreamOrderNo = String(json?.result?.orderNo || '');
    if (mongoReady) {
      await Order.updateOne({ id: orderId }, { $set: { payUrl, upstreamOrderNo, payCreatedAtIso: dateNowIso(), status: 'paying' } });
    } else {
      const store = loadStore();
      const prev = store.orders?.[orderId] || order;
      saveStore({
        ...store,
        orders: {
          ...(store.orders || {}),
          [orderId]: { ...prev, payUrl, upstreamOrderNo, payCreatedAtIso: dateNowIso(), status: 'paying' },
        },
      });
    }
    res.redirect(json.result.url);
  } catch (e) {
    res.status(500).send(`支付宝下单失败：${String(e?.message || 'unknown').slice(0, 500)}`);
  }
});

app.get('/api/order/alipay-url', async (req, res) => {
  try {
    const orderId = req.query.order_id;
    const cfg = await getConfig();
    const order = mongoReady ? await Order.findOne({ id: orderId }).lean() : (() => {
      const store = loadStore();
      return store.orders?.[orderId] || null;
    })();
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    if (order?.payUrl) return res.json({ success: true, url: String(order.payUrl), order_id: orderId });

    const merchantNo = cfg.payment?.alipay?.merchantNo || process.env.ALIPAY_MERCHANT_NO || '';
    const merchantKey = cfg.payment?.alipay?.merchantKey || process.env.ALIPAY_MERCHANT_KEY || '';
    const apiUrl = cfg.payment?.alipay?.apiUrl || process.env.ALIPAY_API_URL || '';
    if (!merchantNo || !merchantKey || !apiUrl) return res.status(400).json({ success: false, message: '支付宝参数未配置' });

    const apiUrlTrimmed = String(apiUrl || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(apiUrlTrimmed)) return res.status(400).json({ success: false, message: '支付宝接口URL不合法' });
    const createUrl = /\/api\/order\/create$/i.test(apiUrlTrimmed) ? apiUrlTrimmed : `${apiUrlTrimmed}/api/order/create`;
    const notifyUrl = `${getApiBaseUrlForBrowser(req)}/api/order/notify`;
    const productId = cfg.payment?.alipay?.productId ? String(cfg.payment.alipay.productId) : String(order.seriesId || '');
    const amountFen = Number(order.payAmountFen || 0) || Math.round(Number(order.amountCny || 0) * 100);
    if (!Number.isFinite(amountFen) || amountFen <= 0) return res.status(400).json({ success: false, message: '下单金额不合法（需至少 0.01 元）' });

    const params = {
      merchant_no: merchantNo,
      out_order_no: orderId,
      notify_url: notifyUrl,
      amount: amountFen,
      product_id: productId,
    };
    const sign = generateAlipaySign(params, merchantKey);
    const body = new URLSearchParams({ ...params, sign }).toString();
    const resp = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await resp.text().catch(() => '');
    const json = (() => {
      try {
        return JSON.parse(text || '');
      } catch {
        return null;
      }
    })();
    const msg = String(json?.message || text || `上游状态码: ${resp.status}`);
    if (!resp.ok) {
      if (msg.includes('已存在')) {
        if (order?.payUrl) return res.json({ success: true, url: String(order.payUrl), order_id: orderId });
        return res.status(409).json({ success: false, message: `订单号已存在，请返回重新发起支付获取新订单号。`, raw: json || text });
      }
      return res.status(502).json({ success: false, message: msg.slice(0, 500), raw: json || text });
    }
    if (!json?.success || !json?.result?.url) {
      return res.status(502).json({ success: false, message: msg.slice(0, 500), raw: json || text });
    }

    const payUrl = String(json.result.url || '');
    const upstreamOrderNo = String(json?.result?.orderNo || '');
    if (mongoReady) {
      await Order.updateOne({ id: orderId }, { $set: { payUrl, upstreamOrderNo, payCreatedAtIso: dateNowIso(), status: 'paying' } });
    } else {
      const store = loadStore();
      const prev = store.orders?.[orderId] || order;
      saveStore({
        ...store,
        orders: {
          ...(store.orders || {}),
          [orderId]: { ...prev, payUrl, upstreamOrderNo, payCreatedAtIso: dateNowIso(), status: 'paying' },
        },
      });
    }
    return res.json({ success: true, url: payUrl, order_id: orderId });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'server_error' });
  }
});

app.post('/api/orders/quote', telegramAuth, async (req, res) => {
  try {
    const tgUser = req.tg?.user;
    const { series_id, plan_id, target_type, season_id } = req.body || {};
    if (!series_id || !plan_id) return res.status(400).json({ success: false, message: '参数缺失' });
    await upsertUserFromTg(tgUser);

    let series = null;
    if (mongoReady) series = await Series.findOne({ id: series_id }).lean();
    else {
      const store = loadStore();
      series = (store.series || []).find((s) => s.id === series_id) || null;
    }
    if (!series) return res.status(404).json({ success: false, message: '剧集不存在' });
    const targetType = normalizeTargetType(target_type) || 'series';
    const seasonId = normalizeSeasonId(targetType, season_id);
    const cfg = await getConfig();
    const quote = await computeOrderQuote({ tgUser, series, cfg, planId: plan_id, targetType, seasonId });
    return res.json({
      success: true,
      quote: {
        seriesId: String(series.id || ''),
        targetType,
        seasonId,
        planId: quote.plan.id,
        planLabel: quote.plan.label,
        planDays: quote.plan.days,
        baseAmountFen: quote.baseAmountFen,
        discountFen: quote.discountFen,
        payAmountFen: quote.payAmountFen,
        minPayFen: quote.minPayFen,
        discountFrom: quote.discountFrom,
      },
      updatedAt: dateNowIso(),
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e?.message || 'quote_failed' });
  }
});

app.get('/api/order/check', async (req, res) => {
  try {
    const orderId = req.query.order_id;
    const cfg = await getConfig();
    const order = mongoReady ? await Order.findOne({ id: orderId }).lean() : (() => {
      const store = loadStore();
      return store.orders?.[orderId] || null;
    })();
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });

    const merchantNo = cfg.payment?.alipay?.merchantNo || process.env.ALIPAY_MERCHANT_NO || '';
    const merchantKey = cfg.payment?.alipay?.merchantKey || process.env.ALIPAY_MERCHANT_KEY || '';
    const apiUrl = cfg.payment?.alipay?.apiUrl || process.env.ALIPAY_API_URL || '';
    if (!merchantNo || !merchantKey || !apiUrl) return res.status(400).json({ success: false, message: '支付宝参数未配置' });

    const apiUrlTrimmed = String(apiUrl || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(apiUrlTrimmed)) return res.status(400).json({ success: false, message: '支付宝接口URL不合法' });
    const checkUrl = /\/api\/order\/check$/i.test(apiUrlTrimmed) ? apiUrlTrimmed : `${apiUrlTrimmed}/api/order/check`;
    const params = {
      merchant_no: merchantNo,
      out_order_no: orderId,
    };
    const sign = generateAlipaySign(params, merchantKey);
    const body = new URLSearchParams({ ...params, sign }).toString();
    const resp = await fetch(checkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await resp.text().catch(() => '');
    const json = (() => {
      try {
        return JSON.parse(text || '');
      } catch {
        return null;
      }
    })();
    if (!resp.ok) {
      const msg = json?.message || text || `上游状态码: ${resp.status}`;
      return res.status(502).json({ success: false, message: `查单失败：${String(msg).slice(0, 500)}` });
    }
    const status = String(json?.result?.status ?? '');
    return res.json({ success: true, order_id: orderId, status, raw: json, updatedAt: dateNowIso() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || 'server_error' });
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

    if (status === 'success' || status === 'paid' || status === '2' || status === 2) {
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
  const webAppUrl = await getEffectiveWebAppUrl();
  return ctx.reply(
    await getWelcomeMessage(username),
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎬 进入漫剧商城', webAppUrl)],
      [Markup.button.webApp('💎 我的订阅', `${webAppUrl}/my-subs`)],
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
    let targetType = 'series';
    let seasonId = '';
    if (mongoReady) {
      series = await Series.findOne({ 'superVip.groupId': chatId }).lean();
      if (series?.id) {
        targetType = 'super';
        seasonId = 'all';
      } else {
        series = await Series.findOne({ 'seasons.vipGroupId': chatId }).lean();
        if (series?.id) {
          const season = (Array.isArray(series.seasons) ? series.seasons : []).find((s) => String(s?.vipGroupId || '') === chatId);
          targetType = 'season';
          seasonId = String(season?.seasonId || '');
        } else {
          series = await Series.findOne({ vipGroupId: chatId }).lean();
        }
      }
    } else {
      const store = loadStore();
      const list = store.series || [];
      series = list.find((s) => String(s?.superVip?.groupId || '') === chatId) || null;
      if (series?.id) {
        targetType = 'super';
        seasonId = 'all';
      } else {
        series = list.find((s) => Array.isArray(s?.seasons) && s.seasons.some((x) => String(x?.vipGroupId || '') === chatId)) || null;
        if (series?.id) {
          const season = (Array.isArray(series.seasons) ? series.seasons : []).find((s) => String(s?.vipGroupId || '') === chatId);
          targetType = 'season';
          seasonId = String(season?.seasonId || '');
        } else {
          series = list.find((s) => String(s?.vipGroupId || '') === chatId) || null;
        }
      }
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
      sub = user?.subscriptions?.[buildSubscriptionKey(series.id, targetType, seasonId)] || null;
    } else {
      const store = loadStore();
      sub = store.users?.[userId]?.subscriptions?.[buildSubscriptionKey(series.id, targetType, seasonId)] || null;
    }

    if (!isSubscriptionOk(sub)) {
      try {
        await bot.telegram.declineChatJoinRequest(chatId, userId);
      } catch {}
      try {
        const seasons = Array.isArray(series.seasons) ? series.seasons : [];
        const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
        let displayTitle = String(series.title || '');
        if (targetType === 'season') {
          const season = seasons.find((s) => String(s?.seasonId || '') === String(seasonId));
          displayTitle = `${displayTitle} ${String(season?.title || '')}`.trim();
        }
        if (targetType === 'super') {
          displayTitle = `${displayTitle} 全季`.trim();
          if (superVip?.title) displayTitle = String(superVip.title || '').trim();
        }
        await bot.telegram.sendMessage(
          userId,
          `⏰ 您的《${displayTitle}》订阅未激活或已到期。请续费后再申请入群。`,
          Markup.inlineKeyboard([[Markup.button.webApp('立即续费', await buildRenewUrl(series.id))]])
        );
      } catch {}
      return;
    }

    try {
      await bot.telegram.approveChatJoinRequest(chatId, userId);
    } catch {}
    try {
      await bot.telegram.sendMessage(userId, `✅ 已通过入群申请。`);
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
    await bot.launch();
    console.log('✅ Bot 已成功启动！');
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

      const seriesList = await Series.find({}).select('id title vipGroupId seasons superVip').lean();
      const seriesMap = new Map((seriesList || []).map((s) => [String(s.id), s]));

      const basePipeline = [
        { $project: { telegramId: 1, subs: { $objectToArray: '$subscriptions' } } },
        { $unwind: '$subs' },
        {
          $addFields: {
            subscriptionKey: '$subs.k',
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
        { $project: { telegramId: 1, subscriptionKey: 1, expireAt: '$sub.expireAt' } },
      ]);

      for (const item of expiringSubs || []) {
        const subscriptionKey = String(item.subscriptionKey || '');
        const parsed = parseSubscriptionKey(subscriptionKey);
        if (!parsed) continue;
        const seriesId = String(parsed.seriesId || '');
        const series = seriesMap.get(seriesId);
        if (!series) continue;
        const seasons = Array.isArray(series.seasons) ? series.seasons : [];
        const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
        let displayTitle = String(series.title || '');
        if (parsed.targetType === 'season') {
          const season = seasons.find((s) => String(s?.seasonId || '') === String(parsed.seasonId));
          if (season?.title) displayTitle = `${displayTitle} ${String(season.title)}`.trim();
        }
        if (parsed.targetType === 'super') {
          displayTitle = `${displayTitle} 全季`.trim();
          if (superVip?.title) displayTitle = String(superVip.title || '').trim();
        }
        const remainDays = Math.max(0, Math.ceil((new Date(item.expireAt).getTime() - nowDate.getTime()) / (24 * 60 * 60 * 1000)));
        try {
          await bot.telegram.sendMessage(
            String(item.telegramId),
            `⏰ 您的《${displayTitle}》订阅将在 ${remainDays} 天后到期。\n\n点击下方按钮续费：`,
            Markup.inlineKeyboard([[Markup.button.webApp('立即续费', await buildRenewUrl(seriesId))]])
          );
          await User.updateOne(
            { telegramId: String(item.telegramId) },
            {
              $set: {
                [`subscriptions.${subscriptionKey}.expiringNotifiedAtIso`]: nowIso,
                [`subscriptions.${subscriptionKey}.status`]: 'expiring',
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
        { $project: { telegramId: 1, subscriptionKey: 1 } },
      ]);

      for (const item of expiredSubs || []) {
        const subscriptionKey = String(item.subscriptionKey || '');
        const parsed = parseSubscriptionKey(subscriptionKey);
        if (!parsed) continue;
        const seriesId = String(parsed.seriesId || '');
        const series = seriesMap.get(seriesId);
        if (!series) continue;
        const seasons = Array.isArray(series.seasons) ? series.seasons : [];
        const superVip = series.superVip && typeof series.superVip === 'object' ? series.superVip : {};
        let displayTitle = String(series.title || '');
        let groupId = String(series.vipGroupId || '');
        if (parsed.targetType === 'season') {
          const season = seasons.find((s) => String(s?.seasonId || '') === String(parsed.seasonId));
          if (season?.title) displayTitle = `${displayTitle} ${String(season.title)}`.trim();
          groupId = String(season?.vipGroupId || '');
        }
        if (parsed.targetType === 'super') {
          displayTitle = `${displayTitle} 全季`.trim();
          if (superVip?.title) displayTitle = String(superVip.title || '').trim();
          groupId = String(superVip?.groupId || '');
        }
        try {
          if (groupId) {
            try {
              await bot.telegram.kickChatMember(groupId, String(item.telegramId));
            } catch {}
          }
          try {
            await bot.telegram.sendMessage(
              String(item.telegramId),
              `⏰ 您的《${displayTitle}》订阅已到期。请续费后继续观看。`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', await buildRenewUrl(seriesId))]])
            );
          } catch {}
          await User.updateOne(
            { telegramId: String(item.telegramId) },
            {
              $set: {
                [`subscriptions.${subscriptionKey}.expiredHandledAtIso`]: nowIso,
                [`subscriptions.${subscriptionKey}.status`]: 'expired',
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
      for (const subscriptionKey of Object.keys(subs)) {
        const parsed = parseSubscriptionKey(subscriptionKey);
        if (!parsed) continue;
        const sub = subs[subscriptionKey];
        const status = computeStatus(sub.expireAt, expiringDays);
        if (Number(sub.planDays || 0) === 0) continue;
        let nextSub = { ...sub, status };
        if (status === 'expiring' && !sub.expiringNotifiedAtIso) {
          const seriesId = String(parsed.seriesId || '');
          const series = (store.series || []).find((s) => String(s?.id || '') === seriesId);
          const seasons = Array.isArray(series?.seasons) ? series.seasons : [];
          const superVip = series?.superVip && typeof series.superVip === 'object' ? series.superVip : {};
          let displayTitle = String(series?.title || '');
          if (parsed.targetType === 'season') {
            const season = seasons.find((s) => String(s?.seasonId || '') === String(parsed.seasonId));
            if (season?.title) displayTitle = `${displayTitle} ${String(season.title)}`.trim();
          }
          if (parsed.targetType === 'super') {
            displayTitle = `${displayTitle} 全季`.trim();
            if (superVip?.title) displayTitle = String(superVip.title || '').trim();
          }
          const remainDays = Math.max(0, Math.ceil((new Date(sub.expireAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          try {
            await bot.telegram.sendMessage(
              uid,
              `⏰ 您的《${displayTitle}》订阅将在 ${remainDays} 天后到期。\n\n点击下方按钮续费：`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', await buildRenewUrl(seriesId))]])
            );
            nextSub = { ...nextSub, expiringNotifiedAtIso: dateNowIso() };
          } catch {}
        }
        if (status === 'expired' && !sub.expiredHandledAtIso) {
          const seriesId = String(parsed.seriesId || '');
          const series = (store.series || []).find((s) => String(s?.id || '') === seriesId);
          const seasons = Array.isArray(series?.seasons) ? series.seasons : [];
          const superVip = series?.superVip && typeof series.superVip === 'object' ? series.superVip : {};
          let displayTitle = String(series?.title || '');
          let groupId = String(series?.vipGroupId || '');
          if (parsed.targetType === 'season') {
            const season = seasons.find((s) => String(s?.seasonId || '') === String(parsed.seasonId));
            if (season?.title) displayTitle = `${displayTitle} ${String(season.title)}`.trim();
            groupId = String(season?.vipGroupId || '');
          }
          if (parsed.targetType === 'super') {
            displayTitle = `${displayTitle} 全季`.trim();
            if (superVip?.title) displayTitle = String(superVip.title || '').trim();
            groupId = String(superVip?.groupId || '');
          }
          if (groupId) {
            try {
              await bot.telegram.kickChatMember(groupId, uid);
            } catch {}
          }
          try {
            await bot.telegram.sendMessage(
              uid,
              `⏰ 您的《${displayTitle}》订阅已到期。请续费后继续观看。`,
              Markup.inlineKeyboard([[Markup.button.webApp('立即续费', await buildRenewUrl(seriesId))]])
            );
          } catch {}
          nextSub = { ...nextSub, expiredHandledAtIso: dateNowIso() };
        }
        subs[subscriptionKey] = nextSub;
      }
      users[uid] = { ...u, subscriptions: subs };
    }
    saveStore({ ...store, users });
  } catch {}
}, 30 * 1000);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
