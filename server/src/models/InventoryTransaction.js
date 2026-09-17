const mongoose = require('mongoose');

// Every stock change creates a transaction — no silent mutation (#13)
const txnSchema = new mongoose.Schema({
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
  station: String,
  itemName: String,
  type: {
    type: String, required: true,
    enum: ['RECEIPT', 'CONSUMPTION', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'DAMAGE', 'LOSS', 'RETURN']
  },
  quantity: { type: Number, required: true },
  unit: String,
  openingStock: Number,
  closingStock: Number,
  // Links TRANSFER_OUT <-> TRANSFER_IN pair (#14)
  transferId: { type: String, index: true },
  linkedInventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
  reference: String,
  reason: String,
  emergencyOverride: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: true, updatedAt: false } });

txnSchema.index({ inventoryId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', txnSchema);
