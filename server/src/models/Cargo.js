const mongoose = require('mongoose');

const cargoSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true, unique: true, index: true },
  expeditionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expedition', required: true, index: true },
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ['ScientificInstruments', 'HazardousFuel', 'Provisions', 'HeavySpares', 'MedicalLifeSupport'],
    required: true
  },
  weightKg: Number,
  volumeM3: Number,
  isHazmat: { type: Boolean, default: false },
  currentLocation: { type: String, default: 'NCPOR Goa' },
  currentNode: {
    type: String,
    enum: ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station'],
    default: 'NCPOR_Goa'
  },
  transportMode: {
    type: String,
    enum: ['AirFreight', 'VesselCargo', 'HelicopterAirlift', 'PistenBullyConvoy'],
    default: 'VesselCargo'
  },
  status: {
    type: String,
    enum: ['Planned', 'Packed', 'Staged', 'Dispatched', 'InTransit', 'Arrived', 'DeliveredStation', 'Received', 'DelayedWeather', 'Delayed', 'Damaged', 'Lost'],
    default: 'Staged'
  },
  eta: Date,
  qrPayload: String,
  items: [{ name: String, quantity: Number, unit: String, serialNumber: String }]
}, { timestamps: true });

module.exports = mongoose.model('Cargo', cargoSchema);
