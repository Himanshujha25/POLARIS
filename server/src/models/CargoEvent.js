const mongoose = require('mongoose');

// Append-only cargo movement history — never overwritten (#10)
const cargoEventSchema = new mongoose.Schema({
  cargoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cargo', required: true, index: true },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', index: true },
  eventType: {
    type: String, required: true,
    enum: ['Prepared', 'Packed', 'ManifestCreated', 'Dispatched', 'NodeArrived', 'Delayed', 'EtaUpdated', 'Arrived', 'Received', 'Damaged', 'Note']
  },
  fromNode: String,
  toNode: String,
  location: String,
  eta: Date,
  reason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: true, updatedAt: false } });

cargoEventSchema.index({ cargoId: 1, createdAt: 1 });

module.exports = mongoose.model('CargoEvent', cargoEventSchema);
