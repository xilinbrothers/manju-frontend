const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    method: { type: String, default: '' },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAtIso: { type: String, default: '' },
  },
  { timestamps: true }
);

PaymentSchema.index({ method: 1, updatedAtIso: -1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
