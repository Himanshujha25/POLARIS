const mongoose = require('mongoose');

const geoTrackSchema = new mongoose.Schema({
  personnelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel', required: true, index: true },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  altitudeM: Number,
  batteryLevelPercent: Number,
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: false });

geoTrackSchema.index({ personnelId: 1, recordedAt: -1 });

module.exports = mongoose.model('GeoTrack', geoTrackSchema);
