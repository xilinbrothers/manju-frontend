const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    telegramId: { type: String, required: true, index: true },
    seriesId: { type: String, required: true, index: true },
    targetType: { type: String, default: 'season', index: true },
    seasonId: { type: String, default: '' },
    planId: { type: String, required: true },
    planLabel: { type: String, default: '' },
    planDays: { type: Number, default: 0 },
    amountCny: { type: Number, default: 0 },
    baseAmountFen: { type: Number, default: 0 },
    discountFen: { type: Number, default: 0 },
    payAmountFen: { type: Number, default: 0 },
    expectedAmountFen: { type: Number, default: 0 },
    paidAmountFen: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' },
    discountFrom: {
      type: [
        {
          seasonId: { type: String, default: '' },
          amountFen: { type: Number, default: 0 },
          subscriptionKey: { type: String, default: '' },
        },
      ],
      default: [],
    },
    paymentMethod: { type: String, default: '', index: true },
    status: { type: String, default: 'created', index: true },
    payUrl: { type: String, default: '' },
    upstreamOrderNo: { type: String, default: '' },
    upstreamStatus: { type: String, default: '' },
    upstreamStatusUpdatedAtIso: { type: String, default: '' },
    payCreatedAtIso: { type: String, default: '' },
    createdAtIso: { type: String, default: '' },
    paidAtIso: { type: String, default: '' },
    merchantNoSnapshot: { type: String, default: '' },
    productIdSnapshot: { type: String, default: '' },
    apiUrlSnapshot: { type: String, default: '' },
    lastPaymentAttemptId: { type: String, default: '', index: true },
    notifyCount: { type: Number, default: 0 },
    lastNotifyAtIso: { type: String, default: '' },
    lastNotifyStatus: { type: String, default: '' },
    lastPaymentId: { type: String, default: '' },
    failCode: { type: String, default: '' },
    failMessage: { type: String, default: '' },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, paidAtIso: -1 });
OrderSchema.index({ telegramId: 1, createdAtIso: -1 });
OrderSchema.index({ seriesId: 1, paidAtIso: -1 });
OrderSchema.index({ upstreamOrderNo: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
