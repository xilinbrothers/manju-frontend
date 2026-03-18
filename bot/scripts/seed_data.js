require('dotenv').config();

const { connectMongo, getMongoUri } = require('../db');
const Config = require('../models/Config');
const Series = require('../models/Series');

const run = async () => {
  const uri = getMongoUri();
  if (!uri) {
    process.stderr.write('MONGODB_URI 未配置\n');
    process.exit(1);
  }

  await connectMongo();

  const config = {
    key: 'default',
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
  };

  await Config.updateOne({ key: 'default' }, { $set: config }, { upsert: true });

  const seriesId = 'series_default';
  const existing = await Series.findOne({ id: seriesId }).lean();
  if (!existing) {
    await Series.create({
      id: seriesId,
      title: '示例漫剧（请改名）',
      description: '用于线上联调的初始剧集条目，可在后台编辑或删除。',
      cover: '',
      status: '连载中',
      total: 0,
      category: '',
      enabled: true,
      trialGroupId: '-1003868489998',
      vipGroupId: '-1003722202502',
      memberGroupId: '-1003741475305',
      plans: [
        { id: '30days', label: '30天', days: 30, priceCny: 29.9, enabled: true },
        { id: '90days', label: '90天', days: 90, priceCny: 69.9, enabled: true, popular: true },
        { id: '365days', label: '365天', days: 365, priceCny: 199.9, enabled: true },
      ],
    });
  }

  process.stdout.write('已写入默认配置与初始剧集（如已存在则跳过剧集写入）\n');
  process.exit(0);
};

run().catch((e) => {
  process.stderr.write(`${e?.message || e}\n`);
  process.exit(1);
});

