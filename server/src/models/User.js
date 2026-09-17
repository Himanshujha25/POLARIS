const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true, trim: true },
  email: { type: String, required: true, unique: true, index: true, trim: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  role: {
    type: String, required: true,
    enum: ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer', 'InventoryOfficer', 'PersonnelOfficer', 'AssetOfficer', 'EmergencyOfficer']
  },
  station: { type: String, enum: ['Bharati', 'Maitri', 'Himadri', 'Headquarters_Goa'], default: 'Headquarters_Goa' },
  bloodGroup: String,
  emergencyContact: { name: String, relation: String, phone: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
