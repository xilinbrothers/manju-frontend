const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    seriesId: { type: String, required: true },
    planId: { type: String, default: '' },
    planLabel: { type: String, default: '' },
    planDays: { type: Number, default: 0 },
    expireAt: { type: String, default: '' },
    status: { type: String, default: 'active' },
    vipInviteLink: { type: String, default: '' },
    updatedAt: { type: String, default: '' },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    language: { type: String, default: '' },
    createdAt: { type: String, default: '' },
    lastSeenAt: { type: String, default: '' },
    subscriptions: { type: Object, default: {} },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastSeenAt: 1 });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
