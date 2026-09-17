const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition' },
  type: {
    type: String,
    enum: ['DEADMAN_TIMEOUT', 'GEOFENCE_BREACH', 'CRITICAL_STOCK_DEPLETION', 'CARGO_ETA_SLIP', 'EQUIPMENT_FAULT', 'SOS_TRIGGER'],
    required: true
  },
  severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL', 'DISASTER'], default: 'WARNING' },
  title: { type: String, required: true },
  message: String,
  sourceEntity: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  coordinates: { lat: Number, lng: Number },
  isAcknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, { timestamps: { createdAt: true, updatedAt: false } });

alertSchema.index({ isAcknowledged: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
