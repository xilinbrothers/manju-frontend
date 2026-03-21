const mongoose = require('mongoose');

const PaymentAttemptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    telegramId: { type: String, default: '', index: true },
    method: { type: String, default: 'alipay', index: true },
    status: { type: String, default: 'created', index: true },
    expectedAmountFen: { type: Number, default: 0 },
    paidAmountFen: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' },
    merchantNo: { type: String, default: '' },
    productId: { type: String, default: '' },
    apiUrl: { type: String, default: '' },
    payUrl: { type: String, default: '' },
    upstreamOrderNo: { type: String, default: '', index: true },
    signValid: { type: Boolean, default: true },
    handled: { type: Boolean, default: false, index: true },
    handleResult: { type: String, default: '' },
    createdAtIso: { type: String, default: '' },
    updatedAtIso: { type: String, default: '' },
  },
  { timestamps: true }
);

PaymentAttemptSchema.index({ orderId: 1, createdAtIso: -1 });
PaymentAttemptSchema.index({ method: 1, createdAtIso: -1 });

module.exports = mongoose.models.PaymentAttempt || mongoose.model('PaymentAttempt', PaymentAttemptSchema);

