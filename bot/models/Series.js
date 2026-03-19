const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    days: { type: Number, default: 0 },
    priceCny: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
    note: { type: String, default: '' },
    save: { type: Number, default: 0 },
    tgStars: { type: Number, default: 1 },
    usdtAmount: { type: Number, default: 1 },
  },
  { _id: false, suppressReservedKeysWarning: true }
);

const SeriesSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    cover: { type: String, default: '' },
    status: { type: String, default: '连载中' },
    total: { type: Number, default: 0 },
    category: { type: String, default: '', index: true },
    enabled: { type: Boolean, default: true, index: true },
    trialGroupId: { type: String, default: '' },
    vipGroupId: { type: String, default: '' },
    memberGroupId: { type: String, default: '' },
    planOverride: { type: Boolean, default: false },
    plans: { type: [PlanSchema], default: [] },
  },
  { timestamps: true }
);

SeriesSchema.index({ enabled: 1, category: 1 });

module.exports = mongoose.models.Series || mongoose.model('Series', SeriesSchema);
