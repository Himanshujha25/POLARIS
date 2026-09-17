const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetTag: { type: String, required: true, unique: true, index: true },
  station: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['SnowVehicle', 'Generator', 'SatelliteDish', 'Spectrometer', 'Drone', 'HeloRefueler'],
    required: true
  },
  condition: {
    type: String,
    enum: ['Operational', 'InUse', 'Standby', 'Degraded', 'ScheduledMaintenance', 'UnderMaintenance', 'EmergencyOffline', 'Damaged', 'Retired', 'Missing'],
    default: 'Operational'
  },
  operatingHours: { type: Number, default: 0 },
  maxHoursBeforeService: { type: Number, default: 500 },
  assignedToPersonnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', index: true },
  lastServicedDate: Date,
  telemetry: { engineTempC: Number, vibrationLevel: Number, fuelLevelPercent: Number, oilPressurePsi: Number }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
