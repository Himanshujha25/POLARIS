const mongoose = require('mongoose');

// Expedition requirement list with required/allocated/received/pending (#8)
const requirementSchema = new mongoose.Schema({
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', required: true, index: true },
  item: { type: String, required: true },
  category: {
    type: String, required: true,
    enum: ['ScientificInstruments', 'HazardousFuel', 'Provisions', 'HeavySpares', 'MedicalLifeSupport']
  },
  requiredQty: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'Units' },
  priority: { type: String, enum: ['P1', 'P2', 'P3'], default: 'P2' },
  requiredBy: Date,
  allocatedQty: { type: Number, default: 0, min: 0 },
  receivedQty: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

requirementSchema.virtual('pendingQty').get(function () {
  return Math.max(0, this.requiredQty - this.receivedQty);
});
requirementSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Requirement', requirementSchema);
