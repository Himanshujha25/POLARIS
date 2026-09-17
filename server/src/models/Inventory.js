const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  station: { type: String, required: true },
  category: {
    type: String,
    enum: ['Fuel', 'FoodRations', 'Medical', 'OxygenCylinders', 'RO_Water', 'GeneratorSpares'],
    required: true
  },
  itemName: { type: String, required: true },
  currentStock: { type: Number, required: true, default: 0 },
  unit: { type: String, enum: ['Liters', 'Kilograms', 'Units', 'Cylinders', 'DaysSupply'], default: 'Units' },
  minimumSafeThreshold: { type: Number, default: 100 },
  criticalEmergencyThreshold: { type: Number, default: 30 },
  dailyConsumptionRate: { type: Number, default: 5 },
  daysRemainingCalculated: { type: Number, default: 0 },
  storageBunker: String,
  expiryDate: Date,
  status: {
    type: String,
    enum: ['Optimal', 'Warning', 'CriticalDepletion', 'Exhausted'],
    default: 'Optimal'
  }
}, { timestamps: true });

inventorySchema.methods.recalc = function () {
  const rate = this.dailyConsumptionRate || 1;
  this.daysRemainingCalculated = Math.max(0, +(this.currentStock / rate).toFixed(1));
  if (this.currentStock <= 0) this.status = 'Exhausted';
  else if (this.currentStock <= this.criticalEmergencyThreshold) this.status = 'CriticalDepletion';
  else if (this.currentStock <= this.minimumSafeThreshold) this.status = 'Warning';
  else this.status = 'Optimal';
};

module.exports = mongoose.model('Inventory', inventorySchema);
