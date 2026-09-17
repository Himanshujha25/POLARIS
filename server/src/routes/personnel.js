const express = require('express');
const Personnel = require('../models/Personnel');
const PersonnelMovement = require('../models/PersonnelMovement');
const GeoTrack = require('../models/GeoTrack');
const Alert = require('../models/Alert');
const { authRequired } = require('../middleware/auth');
const { checkGeofence } = require('../utils/geofence');
const { logAudit } = require('../utils/audit');
const { assertExpeditionOpen } = require('../utils/expeditionGuard');

const router = express.Router();
router.use(authRequired);

function getIO(req) { return req.app.get('io'); }

// GET /api/v1/personnel
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.status) filter.currentStatus = req.query.status;
  const list = await Personnel.find(filter).populate('userId', 'username fullName role station').limit(200);
  res.json(list);
});

// POST /api/v1/personnel — create roster entry
router.post('/', async (req, res) => {
  try {
    if (req.body.expeditionId) await assertExpeditionOpen(req.body.expeditionId);
    const p = await Personnel.create(req.body);
    await PersonnelMovement.create({
      personnelId: p._id, expeditionId: p.expeditionId,
      toLocation: p.currentLocation || p.assignedFieldZone || 'Deployed',
      status: p.currentStatus, arrivedAt: new Date(), createdBy: req.user?.id
    });
    logAudit(req, 'assignment', 'Personnel', p._id, { to: p.badgeId });
    res.status(201).json(p);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// POST /api/v1/personnel/checkin — resets dead-man countdown + records WHERE from
router.post('/checkin', async (req, res) => {
  const { personnelId, badgeId, status, location, lat, lng, expectedReturn } = req.body || {};
  const query = personnelId ? { _id: personnelId } : badgeId ? { badgeId } : null;
  if (!query) return res.status(400).json({ error: 'personnelId or badgeId required' });
  const p = await Personnel.findOne(query);
  if (!p) return res.status(404).json({ error: 'Personnel not found' });
  p.lastCheckIn = new Date();
  const fromLocation = p.currentLocation || '';
  if (status) p.currentStatus = status;
  if (location) p.currentLocation = location;
  if (expectedReturn) p.expectedReturn = new Date(expectedReturn);
  if (lat !== undefined && lng !== undefined) {
    p.currentCoordinates = {
      ...(p.currentCoordinates?.toObject?.() || {}),
      lat: Number(lat), lng: Number(lng), lastPing: new Date()
    };
  } else if (p.currentCoordinates) p.currentCoordinates.lastPing = new Date();
  else p.currentCoordinates = { lastPing: new Date() };
  await p.save();
  // Movement history: record when location actually changes (#21)
  if (location && location !== fromLocation) {
    await PersonnelMovement.create({
      personnelId: p._id, expeditionId: p.expeditionId,
      fromLocation: fromLocation || undefined, toLocation: location,
      status: p.currentStatus, arrivedAt: new Date(), createdBy: req.user?.id
    });
  }
  logAudit(req, 'assignment', 'Personnel', p._id, { to: `${p.currentStatus}@${p.currentLocation || '?'}` });
  const io = getIO(req);
  if (io) io.emit('telemetry:update', { personnelId: p._id, badgeId: p.badgeId, status: p.currentStatus, location: p.currentLocation });
  res.json(p);
});

// POST /api/v1/personnel/telemetry — GPS + vitals + geofence check
router.post('/telemetry', async (req, res) => {
  const { personnelId, badgeId, lat, lng, altitudeM, heartRate, bodyTempC, batteryLevelPercent, location } = req.body || {};
  if (lat === undefined || lng === undefined) return res.status(400).json({ error: 'lat and lng required' });
  const query = personnelId ? { _id: personnelId } : badgeId ? { badgeId } : null;
  if (!query) return res.status(400).json({ error: 'personnelId or badgeId required' });
  const p = await Personnel.findOne(query);
  if (!p) return res.status(404).json({ error: 'Personnel not found' });

  p.currentCoordinates = { lat, lng, altitudeM, lastPing: new Date() };
  p.vitals = { heartRate, bodyTempC, batteryLevelPercent };
  if (location) p.currentLocation = location;
  p.lastCheckIn = new Date();
  await p.save();
  await GeoTrack.create({ personnelId: p._id, expeditionId: p.expeditionId, lat, lng, altitudeM, batteryLevelPercent });

  const io = getIO(req);
  if (io) io.emit('telemetry:update', { personnelId: p._id, badgeId: p.badgeId, lat, lng });

  // Geofence interceptor
  const zone = checkGeofence(lat, lng);
  let alert = null;
  if (zone) {
    alert = await Alert.create({
      expeditionId: p.expeditionId,
      type: 'GEOFENCE_BREACH',
      severity: 'CRITICAL',
      title: `Geofence breach: ${p.badgeId} in ${zone}`,
      message: `lat=${lat}, lng=${lng}`,
      sourceEntity: 'Personnel',
      sourceId: p._id,
      coordinates: { lat, lng }
    });
    if (io) io.emit('alert:new', alert);
  }
  res.json({ personnel: p, geofenceBreach: zone, alert });
});

// GET /api/v1/personnel/movements?personnelId=&expeditionId= — movement history timeline
router.get('/movements', async (req, res) => {
  const filter = {};
  if (req.query.personnelId) filter.personnelId = req.query.personnelId;
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  const list = await PersonnelMovement.find(filter)
    .populate('personnelId', 'badgeId')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 }).limit(200);
  res.json(list);
});

// GET /api/v1/personnel/active-locations
router.get('/active-locations', async (req, res) => {
  const filter = {};
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  const list = await Personnel.find(filter).select('badgeId currentStatus currentLocation currentCoordinates assignedFieldZone').limit(200);
  res.json(list);
});

module.exports = router;
