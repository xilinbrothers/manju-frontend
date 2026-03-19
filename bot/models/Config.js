const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    settings: {
      expiringDays: { type: Number, default: 7 },
      schedulerEnabled: { type: Boolean, default: true },
      supportLink: { type: String, default: 'https://t.me/manjudingyue' },
      welcomeMessage: {
        type: String,
        default:
          '欢迎来到漫剧订阅助手！\n\n📺 浏览并订阅全网热门漫剧\n🎟 付费入群观影\n💎 支持 支付宝\n\n请点击下方按钮进入商城或查看您的订阅。',
      },
    },
    payment: {
      alipay: {
        merchantNo: { type: String, default: '' },
        merchantKey: { type: String, default: '' },
        apiUrl: { type: String, default: '' },
        productId: { type: String, default: '' },
      },
    },
    plans: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          days: { type: Number, default: 0 },
          priceCny: { type: Number, default: 0 },
          enabled: { type: Boolean, default: true },
        }
      ],
      default: [
        { id: 'plan_30d', label: '30天', days: 30, priceCny: 9.9, enabled: true },
        { id: 'plan_90d', label: '90天', days: 90, priceCny: 25.9, enabled: true },
        { id: 'plan_365d', label: '年度', days: 365, priceCny: 88.9, enabled: true },
        { id: 'plan_lifetime', label: '整部剧', days: 0, priceCny: 128.0, enabled: true }
      ]
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Config || mongoose.model('Config', ConfigSchema);
