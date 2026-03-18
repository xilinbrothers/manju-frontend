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
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Config || mongoose.model('Config', ConfigSchema);
