const mongoose = require('mongoose');

// Operational emergency incident with full lifecycle (#22)
const incidentSchema = new mongoose.Schema({
  incidentCode: { type: String, unique: true, index: true },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', index: true },
  type: {
    type: String, required: true,
    enum: ['Medical', 'Fire', 'VehicleEquipment', 'Communication', 'Supply', 'WeatherEnvironment', 'Personnel', 'Other']
  },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  location: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  affectedPersonnelIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }],
  affectedAssetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }],
  requiredResources: String,
  responderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['Reported', 'Acknowledged', 'ResponseInitiated', 'UnderControl', 'Resolved', 'Closed'],
    default: 'Reported'
  },
  resolutionSummary: String,
  closedAt: Date
}, { timestamps: true });

incidentSchema.pre('save', function (next) {
  if (!this.incidentCode) this.incidentCode = 'INC-' + Date.now().toString(36).toUpperCase();
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
