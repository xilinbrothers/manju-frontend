const mongoose = require('mongoose');

const AdminAuditSchema = new mongoose.Schema(
  {
    atIso: { type: String, default: '' },
    adminType: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
    adminName: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    action: { type: String, default: '' },
    target: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

AdminAuditSchema.index({ atIso: -1, action: 1 });
AdminAuditSchema.index({ adminEmail: 1, atIso: -1 });

module.exports = mongoose.models.AdminAudit || mongoose.model('AdminAudit', AdminAuditSchema);

