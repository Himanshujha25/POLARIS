const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  operatingHoursAtService: Number,
  partsUsed: [String],
  servicedAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
