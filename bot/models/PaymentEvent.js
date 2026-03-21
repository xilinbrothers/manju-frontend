const mongoose = require('mongoose');

const PaymentEventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, default: '', index: true },
    paymentAttemptId: { type: String, default: '', index: true },
    method: { type: String, default: 'alipay', index: true },
    type: { type: String, default: '', index: true },
    upstreamOrderNo: { type: String, default: '', index: true },
    statusRaw: { type: String, default: '' },
    statusNormalized: { type: String, default: '', index: true },
    amountFen: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' },
    signValid: { type: Boolean, default: true },
    httpStatus: { type: Number, default: 0 },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    atIso: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

PaymentEventSchema.index({ orderId: 1, atIso: -1 });
PaymentEventSchema.index({ upstreamOrderNo: 1, atIso: -1 });
PaymentEventSchema.index({ type: 1, atIso: -1 });

module.exports = mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', PaymentEventSchema);

