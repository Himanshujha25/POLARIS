const express = require('express');
const Cargo = require('../models/Cargo');
const CargoEvent = require('../models/CargoEvent');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Requirement = require('../models/Requirement');
const { authRequired, requireRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { assertExpeditionOpen } = require('../utils/expeditionGuard');

const router = express.Router();
router.use(authRequired);

const CAN_WRITE = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'];
const NODE_ORDER = ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station'];

async function logEvent(cargo, eventType, req, extra = {}) {
  return CargoEvent.create({
    cargoId: cargo._id, expeditionId: cargo.expeditionId,
    eventType, createdBy: req.user?.id, ...extra
  });
}

// GET /api/v1/cargo
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.node) filter.currentNode = req.query.node;
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  res.json(await Cargo.find(filter).sort({ createdAt: -1 }).limit(200));
});

// POST /api/v1/cargo
router.post('/', requireRoles(...CAN_WRITE), async (req, res) => {
  try {
    await assertExpeditionOpen(req.body.expeditionId);
    const body = { ...req.body };
    if (!body.qrPayload && body.trackingNumber) body.qrPayload = `POLARIS:${body.trackingNumber}`;
    const cargo = await Cargo.create(body);
    await logEvent(cargo, 'Prepared', req, { location: cargo.currentLocation });
    logAudit(req, 'create', 'Cargo', cargo._id, { to: cargo.trackingNumber });
    res.status(201).json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// PATCH /api/v1/cargo/:id/stage — advance waypoint + timeline event
router.patch('/:id/stage', requireRoles(...CAN_WRITE), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    const { node, location, status, eta, reason } = req.body || {};
    const fromNode = cargo.currentNode;
    if (node) {
      if (!NODE_ORDER.includes(node)) return res.status(400).json({ error: 'Invalid node' });
      cargo.currentNode = node;
    }
    if (location) cargo.currentLocation = location;
    if (eta) cargo.eta = new Date(eta);
    const prevStatus = cargo.status;
    if (status) cargo.status = status;
    else if (node === 'Bharati_Station' || node === 'Maitri_Station') cargo.status = 'DeliveredStation';
    else cargo.status = 'InTransit';
    await cargo.save();

    if (cargo.status === 'DelayedWeather' && prevStatus !== 'DelayedWeather') {
      await logEvent(cargo, 'Delayed', req, { fromNode, toNode: cargo.currentNode, reason });
    } else if (eta) {
      await logEvent(cargo, 'EtaUpdated', req, { fromNode, toNode: cargo.currentNode, eta: cargo.eta, reason });
    } else {
      await logEvent(cargo, 'NodeArrived', req, { fromNode, toNode: cargo.currentNode, location: cargo.currentLocation });
    }
    logAudit(req, 'status_change', 'Cargo', cargo._id, { from: `${prevStatus}@${fromNode}`, to: `${cargo.status}@${cargo.currentNode}` });
    const io = req.app.get('io');
    if (io) io.emit('cargo:update', cargo);
    res.json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// POST /api/v1/cargo/:id/receive — station receipt → inventory RECEIPT + requirement progress (Test 5)
router.post('/:id/receive', requireRoles(...CAN_WRITE), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    if (cargo.status === 'DeliveredStation' || cargo.status === 'Received') {
      const prior = await CargoEvent.findOne({ cargoId: cargo._id, eventType: 'Received' });
      if (prior && req.body.confirm !== true) {
        return res.status(400).json({ error: 'Already received. Pass confirm:true to receive again.' });
      }
    }
    const { station, requirementId, linkItems } = req.body || {};
    const stationName = station || (cargo.currentNode === 'Bharati_Station' ? 'Bharati' : cargo.currentNode === 'Maitri_Station' ? 'Maitri' : null);
    if (!stationName) return res.status(400).json({ error: 'station required (cargo not at a station node)' });

    const receipts = [];
    const CAT_MAP = { Provisions: 'FoodRations', HazardousFuel: 'Fuel', MedicalLifeSupport: 'Medical', HeavySpares: 'GeneratorSpares', ScientificInstruments: 'GeneratorSpares' };
    const UNIT_MAP = { kg: 'Kilograms', kilogram: 'Kilograms', kilograms: 'Kilograms', l: 'Liters', liter: 'Liters', liters: 'Liters', litre: 'Liters', units: 'Units', unit: 'Units', cylinders: 'Cylinders', cylinder: 'Cylinders', dayssupply: 'DaysSupply' };
    const normUnit = (u) => UNIT_MAP[String(u || '').toLowerCase()] || 'Units';
    const items = Array.isArray(linkItems) && linkItems.length ? linkItems : cargo.items.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }));
    for (const it of items) {
      let inv = await Inventory.findOne({ station: stationName, itemName: it.name });
      if (!inv) {
        inv = new Inventory({
          station: stationName, category: CAT_MAP[cargo.category] || 'GeneratorSpares', itemName: it.name,
          currentStock: 0, unit: normUnit(it.unit),
          minimumSafeThreshold: 10, criticalEmergencyThreshold: 3,
          dailyConsumptionRate: 1, storageBunker: 'Receiving'
        });
      }
      const opening = inv.currentStock;
      inv.currentStock += Number(it.quantity) || 0;
      inv.recalc();
      await inv.save();
      await InventoryTransaction.create({
        inventoryId: inv._id, station: stationName, itemName: inv.itemName,
        type: 'RECEIPT', quantity: Number(it.quantity) || 0, unit: inv.unit,
        openingStock: opening, closingStock: inv.currentStock,
        reference: cargo.trackingNumber, reason: `Cargo receipt ${cargo.trackingNumber}`,
        createdBy: req.user?.id
      });
      receipts.push({ item: inv.itemName, qty: it.quantity, stock: inv.currentStock });
    }

    // Link receipt → expedition requirement progress
    if (requirementId) {
      const rq = await Requirement.findById(requirementId);
      if (rq) {
        const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        rq.receivedQty += totalQty;
        await rq.save();
      }
    }

    cargo.status = 'DeliveredStation';
    await cargo.save();
    await logEvent(cargo, 'Received', req, { toNode: cargo.currentNode, location: stationName, reason: `Received: ${receipts.map(r => `${r.item} x${r.qty}`).join(', ')}` });
    logAudit(req, 'status_change', 'Cargo', cargo._id, { to: `DeliveredStation@${stationName}`, details: `${receipts.length} inventory lines` });
    const io = req.app.get('io');
    if (io) io.emit('cargo:update', cargo);
    res.json({ cargo, receipts });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// GET /api/v1/cargo/:id/timeline — visual movement history
router.get('/:id/timeline', async (req, res) => {
  const events = await CargoEvent.find({ cargoId: req.params.id }).populate('createdBy', 'username').sort({ createdAt: 1 });
  res.json(events);
});

// PATCH /api/v1/cargo/:id — edit details (title, ETA, hazmat, items)
router.patch('/:id', requireRoles(...CAN_WRITE), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    ['title', 'weightKg', 'volumeM3', 'isHazmat', 'eta', 'transportMode', 'items'].forEach(f => {
      if (req.body[f] !== undefined) cargo[f] = req.body[f];
    });
    await cargo.save();
    await logEvent(cargo, 'Note', req, { reason: 'Cargo details edited' });
    logAudit(req, 'update', 'Cargo', cargo._id, { details: 'cargo edited' });
    res.json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// DELETE /api/v1/cargo/:id — history kept in audit log
router.delete('/:id', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  const cargo = await Cargo.findById(req.params.id);
  if (!cargo) return res.status(404).json({ error: 'Not found' });
  await CargoEvent.deleteMany({ cargoId: cargo._id });
  await cargo.deleteOne();
  logAudit(req, 'delete', 'Cargo', cargo._id, { from: cargo.trackingNumber });
  res.json({ deleted: true });
});

// GET /api/v1/cargo/track/:trackingNumber — QR lookup
router.get('/track/:trackingNumber', async (req, res) => {
  const cargo = await Cargo.findOne({ trackingNumber: req.params.trackingNumber });
  if (!cargo) return res.status(404).json({ error: 'Not found' });
  res.json(cargo);
});

module.exports = router;
