const mongoose = require('mongoose');

// Who did what, when — create/update/status/emergency/security (#27)
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: String,
  role: String,
  action: {
    type: String, required: true,
    enum: ['create', 'update', 'delete', 'status_change', 'stock_adjustment', 'transfer', 'assignment', 'emergency_action', 'login', 'acknowledge']
  },
  entity: { type: String, required: true },
  entityId: String,
  fromValue: String,
  toValue: String,
  details: String
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
