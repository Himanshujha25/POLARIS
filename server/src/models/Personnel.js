const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  badgeId: { type: String, required: true, unique: true },
  roleTitle: String,
  currentStatus: {
    type: String,
    enum: ['StationHab', 'FieldResearch', 'InTransit', 'MedicalQuarantine', 'SOS_Alert', 'Returned'],
    default: 'StationHab'
  },
  assignedFieldZone: String,
  currentLocation: { type: String, default: '' },
  lastCheckIn: Date,
  expectedReturn: Date,
  currentCoordinates: {
    lat: Number, lng: Number, altitudeM: Number, lastPing: Date
  },
  vitals: { heartRate: Number, bodyTempC: Number, batteryLevelPercent: Number }
}, { timestamps: true });

module.exports = mongoose.model('Personnel', personnelSchema);
