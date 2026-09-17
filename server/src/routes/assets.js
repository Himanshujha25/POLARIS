const express = require('express');
const Asset = require('../models/Asset');
const MaintenanceLog = require('../models/MaintenanceLog');
const { authRequired, requireRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/assets
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.station) filter.station = req.query.station;
  if (req.query.condition) filter.condition = req.query.condition;
  if (req.query.type) filter.type = req.query.type;
  res.json(await Asset.find(filter).limit(200));
});

// POST /api/v1/assets
router.post('/', requireRoles('SuperAdmin', 'AssetOfficer', 'ExpeditionManager'), async (req, res) => {
  try { res.status(201).json(await Asset.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /api/v1/assets/:id/telemetry
router.patch('/:id/telemetry', async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  const { operatingHours, engineTempC, vibrationLevel, fuelLevelPercent, oilPressurePsi, condition } = req.body || {};
  if (operatingHours !== undefined) asset.operatingHours = Number(operatingHours);
  asset.telemetry = {
    engineTempC: engineTempC ?? asset.telemetry?.engineTempC,
    vibrationLevel: vibrationLevel ?? asset.telemetry?.vibrationLevel,
    fuelLevelPercent: fuelLevelPercent ?? asset.telemetry?.fuelLevelPercent,
    oilPressurePsi: oilPressurePsi ?? asset.telemetry?.oilPressurePsi
  };
  if (condition) asset.condition = condition;
  else if (asset.operatingHours >= asset.maxHoursBeforeService - 25) asset.condition = 'ScheduledMaintenance';
  await asset.save();
  const io = req.app.get('io');
  if (io) io.emit('asset:update', asset);
  res.json(asset);
});

// POST /api/v1/assets/:id/maintenance
router.post('/:id/maintenance', requireRoles('SuperAdmin', 'AssetOfficer', 'ExpeditionManager'), async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  const { description, partsUsed } = req.body || {};
  const log = await MaintenanceLog.create({
    assetId: asset._id, performedBy: req.user.id, description,
    operatingHoursAtService: asset.operatingHours, partsUsed
  });
  asset.condition = 'Operational';
  asset.lastServicedDate = new Date();
  await asset.save();
  res.status(201).json({ asset, log });
});

module.exports = router;
