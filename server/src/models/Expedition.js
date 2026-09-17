const mongoose = require('mongoose');

const expeditionSchema = new mongoose.Schema({
  expeditionCode: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  targetStation: { type: String, enum: ['Bharati', 'Maitri', 'Himadri', 'Dakshin_Gangotri'], required: true },
  season: { type: String, enum: ['Summer_2026_27', 'Winter_2027', 'Special_Cruise'], default: 'Summer_2026_27' },
  startDate: Date,
  endDate: Date,
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['Draft', 'Planning', 'Ready', 'Deployed', 'Active', 'Returning', 'InTransit', 'ActiveOnStation', 'Completed', 'Cancelled', 'Decommissioned'],
    default: 'Planning'
  },
  scientificObjectives: [String],
  totalPersonnelQuota: { type: Number, default: 35 },
  cargoCapacityKg: { type: Number, default: 20000 }
}, { timestamps: true });

// Business rule: end date cannot be before start date (#33)
expeditionSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && new Date(this.endDate) < new Date(this.startDate)) {
    return next(new Error('End date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.model('Expedition', expeditionSchema);
