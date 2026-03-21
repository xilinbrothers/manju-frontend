const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    method: { type: String, default: '' },
    outOrderNo: { type: String, default: '', index: true },
    upstreamOrderNo: { type: String, default: '', index: true },
    statusRaw: { type: String, default: '' },
    statusNormalized: { type: String, default: '', index: true },
    amountFen: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' },
    signValid: { type: Boolean, default: true },
    receivedAtIso: { type: String, default: '' },
    handled: { type: Boolean, default: false },
    handleResult: { type: String, default: '' },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAtIso: { type: String, default: '' },
  },
  { timestamps: true }
);

PaymentSchema.index({ method: 1, updatedAtIso: -1 });
PaymentSchema.index({ orderId: 1, updatedAtIso: -1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
