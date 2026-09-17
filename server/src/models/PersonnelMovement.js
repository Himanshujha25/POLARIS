const mongoose = require('mongoose');

// Personnel movement history — current location derives from latest (#21)
const movementSchema = new mongoose.Schema({
  personnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', required: true, index: true },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', index: true },
  fromLocation: String,
  toLocation: { type: String, required: true },
  status: String,
  reason: String,
  departedAt: Date,
  arrivedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: true, updatedAt: false } });

movementSchema.index({ personnelId: 1, createdAt: -1 });

module.exports = mongoose.model('PersonnelMovement', movementSchema);
