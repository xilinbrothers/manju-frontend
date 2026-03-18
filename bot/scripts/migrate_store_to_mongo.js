require('dotenv').config();

const { connectMongo, getMongoUri } = require('../db');
const { loadStore } = require('../store');
const Config = require('../models/Config');
const Series = require('../models/Series');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const run = async () => {
  const uri = getMongoUri();
  if (!uri) {
    process.stderr.write('MONGODB_URI 未配置\n');
    process.exit(1);
  }

  await connectMongo();
  const store = loadStore();

  const key = 'default';
  await Config.updateOne(
    { key },
    {
      $set: {
        key,
        settings: store.settings || {},
        payment: store.payment || {},
      },
    },
    { upsert: true }
  );

  const series = Array.isArray(store.series) ? store.series : [];
  for (const s of series) {
    if (!s?.id) continue;
    await Series.updateOne({ id: s.id }, { $set: { ...s } }, { upsert: true });
  }

  const users = store.users || {};
  for (const [telegramId, u] of Object.entries(users)) {
    await User.updateOne(
      { telegramId: String(telegramId) },
      {
        $set: {
          telegramId: String(telegramId),
          username: u.username || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          language: u.language || '',
          createdAt: u.createdAt || '',
          lastSeenAt: u.lastSeenAt || '',
          subscriptions: u.subscriptions || {},
        },
      },
      { upsert: true }
    );
  }

  const orders = store.orders || {};
  for (const [id, o] of Object.entries(orders)) {
    if (!o) continue;
    await Order.updateOne(
      { id },
      {
        $set: {
          id,
          telegramId: String(o.telegramId || ''),
          seriesId: String(o.seriesId || ''),
          planId: String(o.planId || ''),
          planLabel: String(o.planLabel || ''),
          planDays: Number(o.planDays || 0) || 0,
          amountCny: Number(o.amountCny || 0) || 0,
          paymentMethod: String(o.paymentMethod || ''),
          status: String(o.status || ''),
          createdAtIso: String(o.createdAtIso || o.createdAt || ''),
          paidAtIso: String(o.paidAtIso || o.paidAt || ''),
        },
      },
      { upsert: true }
    );
  }

  const payments = store.payments || {};
  for (const [id, p] of Object.entries(payments)) {
    if (!p) continue;
    await Payment.updateOne(
      { id },
      {
        $set: {
          id,
          orderId: String(p.orderId || ''),
          method: String(p.method || ''),
          raw: p.raw || {},
          updatedAtIso: String(p.updatedAtIso || p.updatedAt || ''),
        },
      },
      { upsert: true }
    );
  }

  process.stdout.write('迁移完成\n');
  process.exit(0);
};

run().catch((e) => {
  process.stderr.write(`${e?.message || e}\n`);
  process.exit(1);
});

