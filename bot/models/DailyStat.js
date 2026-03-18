const mongoose = require('mongoose');

const DailyStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    users: {
      newUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      subscribedUsers: { type: Number, default: 0 },
    },
    finance: {
      revenueCny: { type: Number, default: 0 },
      ordersPaid: { type: Number, default: 0 },
      byMethod: { type: Object, default: {} },
      bySeries: { type: Object, default: {} },
    },
    computedAtIso: { type: String, default: '' },
  },
  { timestamps: true }
);

DailyStatSchema.index({ 'finance.revenueCny': -1 });

module.exports = mongoose.models.DailyStat || mongoose.model('DailyStat', DailyStatSchema);

