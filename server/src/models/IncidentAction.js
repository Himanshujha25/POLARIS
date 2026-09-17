const mongoose = require('mongoose');

// Timestamped incident timeline entries (#22/#23)
const incidentActionSchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  actionType: {
    type: String, required: true,
    enum: ['Report', 'Acknowledge', 'ResponderAssigned', 'Action', 'Update', 'Resolve', 'Close', 'Note']
  },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: true, updatedAt: false } });

incidentActionSchema.index({ incidentId: 1, createdAt: 1 });

module.exports = mongoose.model('IncidentAction', incidentActionSchema);
