const express = require('express');
const crypto = require('crypto');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Location = require('../models/Location');
const { authRequired, requireRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { checkDepletion } = require('../services/automation');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authRequired);

const CAN_WRITE = ['SuperAdmin', 'InventoryOfficer', 'ExpeditionManager'];

async function recordTxn(item, type, qty, req, extra = {}) {
  const opening = extra.opening ?? item.currentStock;
  return InventoryTransaction.create({
    inventoryId: item._id,
    station: item.station,
    itemName: item.itemName,
    type,
    quantity: qty,
    unit: item.unit,
    openingStock: opening,
    closingStock: item.currentStock,
    createdBy: req.user?.id,
    ...extra
  });
}

// GET /api/v1/inventory
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.station) filter.station = req.query.station;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  res.json(await Inventory.find(filter).sort({ updatedAt: -1 }).limit(200));
});

// POST /api/v1/inventory
router.post('/', requireRoles(...CAN_WRITE), validate(schemas.inventoryCreate), async (req, res) => {
  try {
    const item = new Inventory(req.body);
    item.recalc();
    await item.save();
    await recordTxn(item, 'ADJUSTMENT', item.currentStock, req, { opening: 0, reason: 'Opening stock' });
    logAudit(req, 'create', 'Inventory', item._id, { to: `${item.itemName} ${item.currentStock}${item.unit}` });
    res.status(201).json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /api/v1/inventory/:id — edit thresholds, rates, bunker
router.patch('/:id', requireRoles(...CAN_WRITE), validate(schemas.inventoryUpdate), async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  ['itemName', 'minimumSafeThreshold', 'criticalEmergencyThreshold', 'dailyConsumptionRate', 'storageBunker', 'expiryDate', 'unit', 'category'].forEach(f => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  item.recalc();
  await item.save();
  await recordTxn(item, 'ADJUSTMENT', 0, req, { opening: item.currentStock, reason: 'Master data edited' });
  logAudit(req, 'update', 'Inventory', item._id, { details: 'item edited' });
  res.json(item);
});

// DELETE /api/v1/inventory/:id — blocked when traceable transactions exist
router.delete('/:id', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const n = await InventoryTransaction.countDocuments({ inventoryId: item._id });
  if (n > 0) return res.status(400).json({ error: `Cannot delete: ${n} transactions reference this stock. Set stock to 0 instead.` });
  await item.deleteOne();
  logAudit(req, 'delete', 'Inventory', item._id, { from: `${item.itemName}@${item.station}` });
  res.json({ deleted: true });
});

// PATCH /api/v1/inventory/:id/consume — every change creates a transaction (#13)
router.patch('/:id/consume', requireRoles(...CAN_WRITE), validate(schemas.inventoryConsume), async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  const { consume = 0, resupply = 0, dailyConsumptionRate, reason, emergencyOverride } = req.body || {};
  const c = Number(consume), r = Number(resupply);
  const opening = item.currentStock;
  const next = opening - c + r;
  if (next < 0 && !emergencyOverride) {
    return res.status(400).json({ error: `Stock cannot go negative (${opening} - ${c}). Pass emergencyOverride for emergency issue.` });
  }
  item.currentStock = Math.max(0, next);
  if (dailyConsumptionRate !== undefined) item.dailyConsumptionRate = Number(dailyConsumptionRate);
  item.recalc();
  await item.save();
  if (c > 0) {
    await recordTxn(item, 'CONSUMPTION', -c, req, { opening, reason, emergencyOverride: !!emergencyOverride });
    logAudit(req, 'stock_adjustment', 'Inventory', item._id, { from: String(opening), to: String(item.currentStock), details: `consumed ${c}` });
  }
  if (r > 0) {
    await recordTxn(item, 'RECEIPT', r, req, { opening, reason });
    logAudit(req, 'stock_adjustment', 'Inventory', item._id, { from: String(opening), to: String(item.currentStock), details: `resupply ${r}` });
  }
  res.json(item);
});

// POST /api/v1/inventory/transfer — linked TRANSFER_OUT + TRANSFER_IN (#14)
router.post('/transfer', requireRoles(...CAN_WRITE), validate(schemas.inventoryTransfer), async (req, res) => {
  const { fromInventoryId, toStation, quantity, reason } = req.body || {};
  const qty = Number(quantity);
  if (!fromInventoryId || !toStation || !(qty > 0)) {
    return res.status(400).json({ error: 'fromInventoryId, toStation and positive quantity required' });
  }
  const src = await Inventory.findById(fromInventoryId);
  if (!src) return res.status(404).json({ error: 'Source stock not found' });
  if (src.currentStock < qty) return res.status(400).json({ error: `Insufficient stock at ${src.station} (${src.currentStock})` });

  const transferId = 'TRF-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const srcOpening = src.currentStock;
  src.currentStock -= qty;
  src.recalc();
  await src.save();

  let dest = await Inventory.findOne({ station: toStation, itemName: src.itemName });
  if (!dest) {
    dest = new Inventory({
      station: toStation, category: src.category, itemName: src.itemName,
      currentStock: 0, unit: src.unit,
      minimumSafeThreshold: src.minimumSafeThreshold,
      criticalEmergencyThreshold: src.criticalEmergencyThreshold,
      dailyConsumptionRate: src.dailyConsumptionRate,
      storageBunker: src.storageBunker
    });
  }
  const destOpening = dest.currentStock;
  dest.currentStock += qty;
  dest.recalc();
  await dest.save();

  await InventoryTransaction.create({
    inventoryId: src._id, station: src.station, itemName: src.itemName,
    type: 'TRANSFER_OUT', quantity: -qty, unit: src.unit,
    openingStock: srcOpening, closingStock: src.currentStock,
    transferId, linkedInventoryId: dest._id, reason, createdBy: req.user?.id
  });
  await InventoryTransaction.create({
    inventoryId: dest._id, station: dest.station, itemName: dest.itemName,
    type: 'TRANSFER_IN', quantity: qty, unit: dest.unit,
    openingStock: destOpening, closingStock: dest.currentStock,
    transferId, linkedInventoryId: src._id, reason, createdBy: req.user?.id
  });
  logAudit(req, 'transfer', 'Inventory', src._id, { from: `${src.station}:${srcOpening}`, to: `${toStation}:${dest.currentStock}`, details: transferId });
  res.status(201).json({ transferId, from: src, to: dest });
});

// GET /api/v1/inventory/transactions?inventoryId=&transferId=&station=
router.get('/transactions', async (req, res) => {
  const filter = {};
  if (req.query.inventoryId) filter.inventoryId = req.query.inventoryId;
  if (req.query.transferId) filter.transferId = req.query.transferId;
  if (req.query.station) filter.station = req.query.station;
  res.json(await InventoryTransaction.find(filter).sort({ createdAt: -1 }).limit(200));
});

// GET /api/v1/inventory/forecast — SAFE/RISK vs next resupply + projected shortage (#15/#16)
router.get('/forecast', async (req, res) => {
  await checkDepletion();
  const filter = {};
  if (req.query.station) filter.station = req.query.station;
  const items = await Inventory.find(filter).limit(200);
  const locations = await Location.find({ name: { $in: [...new Set(items.map(i => i.station + ' Station'))] } });
  const resupplyByStation = {};
  locations.forEach(l => {
    const key = l.name.replace(' Station', '');
    if (l.nextResupplyDate) resupplyByStation[key] = l.nextResupplyDate;
  });
  const now = new Date();
  res.json(items.map(i => {
    const resupplyDate = resupplyByStation[i.station] || null;
    const daysToResupply = resupplyDate ? Math.max(0, Math.ceil((new Date(resupplyDate) - now) / 86400000)) : null;
    const risk = daysToResupply === null
      ? (i.status === 'Optimal' ? 'SAFE' : 'UNKNOWN')
      : (i.daysRemainingCalculated >= daysToResupply ? 'SAFE' : 'RISK');
    const projectedShortage = risk === 'RISK'
      ? +((daysToResupply - i.daysRemainingCalculated) * (i.dailyConsumptionRate || 0)).toFixed(1)
      : 0;
    const why = risk === 'RISK'
      ? `${i.currentStock} ${i.unit} at ${i.dailyConsumptionRate}/day lasts ~${i.daysRemainingCalculated} days but resupply is in ${daysToResupply} days — short by ~${projectedShortage} ${i.unit}.`
      : `${i.currentStock} ${i.unit} lasts ~${i.daysRemainingCalculated} days${daysToResupply !== null ? `, resupply in ${daysToResupply} days` : ''}.`;
    return {
      id: i._id, station: i.station, itemName: i.itemName, category: i.category,
      currentStock: i.currentStock, unit: i.unit, dailyConsumptionRate: i.dailyConsumptionRate,
      daysRemaining: i.daysRemainingCalculated, status: i.status,
      nextResupplyDate: resupplyDate, daysToResupply, risk, projectedShortage, why
    };
  }));
});

module.exports = router;
