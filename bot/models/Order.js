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
    payCreatedAtIso: { type: String, default: '' },
    createdAtIso: { type: String, default: '' },
    paidAtIso: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, paidAtIso: -1 });
OrderSchema.index({ telegramId: 1, createdAtIso: -1 });
OrderSchema.index({ seriesId: 1, paidAtIso: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
