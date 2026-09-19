const express = require('express');
const Alert = require('../models/Alert');
const Personnel = require('../models/Personnel');
const { authRequired, requireRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { runAllChecks } = require('../services/automation');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/alerts/active
router.get('/active', async (req, res) => {
  const filter = { isAcknowledged: false };
  if (req.query.severity) filter.severity = req.query.severity;
  res.json(await Alert.find(filter).sort({ createdAt: -1 }).limit(200));
});

// GET /api/v1/alerts (all, with filters)
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  res.json(await Alert.find(filter).sort({ createdAt: -1 }).limit(200));
});

// POST /api/v1/alerts/sos — emergency beacon
router.post('/sos', validate(schemas.sos), async (req, res) => {
  const { personnelId, badgeId, expeditionId, message, lat, lng } = req.body || {};
  let personnel = null;
  if (personnelId || badgeId) {
    personnel = await Personnel.findOne(personnelId ? { _id: personnelId } : { badgeId });
    if (personnel) {
      personnel.currentStatus = 'SOS_Alert';
      await personnel.save();
    }
  }
  const alert = await Alert.create({
    expeditionId: expeditionId || personnel?.expeditionId,
    type: 'SOS_TRIGGER',
    severity: 'DISASTER',
    title: `SOS from ${personnel?.badgeId || 'unknown'}`,
    message: message || 'Emergency SOS triggered',
    sourceEntity: 'Personnel',
    sourceId: personnel?._id,
    coordinates: { lat, lng: lng ?? personnel?.currentCoordinates?.lng }
  });
  const io = req.app.get('io');
  if (io) io.emit('sos:broadcast', alert);
  if (io) io.emit('alert:new', alert);
  res.status(201).json(alert);
});

// PATCH /api/v1/alerts/:id/acknowledge
router.patch('/:id/acknowledge', requireRoles('SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'), async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Not found' });
  alert.isAcknowledged = true;
  alert.acknowledgedBy = req.user.id;
  alert.resolvedAt = new Date();
  await alert.save();
  res.json(alert);
});

// POST /api/v1/alerts/simulate-telemetry — SIH demo harness
router.post('/simulate-telemetry', validate(schemas.simulateTelemetry), async (req, res) => {
  const { scenario } = req.body || {};
  const PersonnelModel = require('../models/Personnel');
  const Inventory = require('../models/Inventory');
  const io = req.app.get('io');

  if (scenario === 'crevasse-stray') {
    const p = await PersonnelModel.findOne({ currentStatus: 'FieldResearch' });
    if (!p) return res.status(404).json({ error: 'No field personnel to simulate' });
    // Bharati crevasse zone coords
    p.currentCoordinates = { lat: -69.385, lng: 76.19, lastPing: new Date() };
    await p.save();
    const alert = await Alert.create({
      expeditionId: p.expeditionId, type: 'GEOFENCE_BREACH', severity: 'CRITICAL',
      title: `SIM: Crevasse stray — ${p.badgeId}`,
      message: 'Simulated drift into Crevasse Field Beta',
      sourceEntity: 'Personnel', sourceId: p._id, coordinates: { lat: -69.385, lng: 76.19 }
    });
    if (io) io.emit('alert:new', alert);
    return res.json({ scenario, personnel: p, alert });
  }

  if (scenario === 'deadman-timeout') {
    let p = await PersonnelModel.findOne({ currentStatus: 'FieldResearch' });
    if (!p) {
      p = await PersonnelModel.findOne();
      if (!p) return res.status(404).json({ error: 'No personnel to simulate' });
      p.currentStatus = 'FieldResearch';
    }
    p.currentCoordinates = { ...(p.currentCoordinates?.toObject?.() || {}), lastPing: new Date(Date.now() - 120 * 60 * 1000) };
    await p.save();
    const results = await runAllChecks();
    const alert = await Alert.findOne({ type: 'DEADMAN_TIMEOUT', sourceId: p._id }).sort({ createdAt: -1 });
    return res.json({ scenario, personnel: p, alert, checks: results });
  }

  if (scenario === 'fuel-drop') {
    const item = (await Inventory.findOne({ category: 'Fuel' })) || (await Inventory.findOne());
    if (!item) return res.status(404).json({ error: 'No inventory to simulate' });
    item.currentStock = Math.max(0, item.criticalEmergencyThreshold - 1);
    item.recalc();
    await item.save();
    const results = await runAllChecks();
    const alert = await Alert.findOne({ type: 'CRITICAL_STOCK_DEPLETION', sourceId: item._id }).sort({ createdAt: -1 });
    if (io && alert) io.emit('alert:new', alert);
    return res.json({ scenario, inventory: item, alert, checks: results });
  }

  return res.status(400).json({ error: 'Unknown scenario. Use crevasse-stray | deadman-timeout | fuel-drop' });
});

module.exports = router;
