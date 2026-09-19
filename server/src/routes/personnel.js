const express = require('express');
const Personnel = require('../models/Personnel');
const PersonnelMovement = require('../models/PersonnelMovement');
const GeoTrack = require('../models/GeoTrack');
const Alert = require('../models/Alert');
const { authRequired } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { checkGeofenceAsync } = require('../utils/geofence');
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

// POST /api/v1/personnel — create roster entry (no duplicate active deployment)
router.post('/', validate(schemas.personnelCreate), async (req, res) => {
  try {
    if (req.body.expeditionId) await assertExpeditionOpen(req.body.expeditionId);
    if (req.body.userId && req.body.expeditionId) {
      const dup = await Personnel.findOne({
        userId: req.body.userId, expeditionId: req.body.expeditionId,
        currentStatus: { $ne: 'Returned' }
      });
      if (dup) return res.status(400).json({ error: `User already deployed as ${dup.badgeId} (${dup.currentStatus}). Mark Returned first.` });
    }
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

// POST /api/v1/personnel/checkin — resets dead-man countdown + records WHERE from + vitals
router.post('/checkin', validate(schemas.personnelCheckin), async (req, res) => {
  const { personnelId, badgeId, status, location, lat, lng, altitudeM, expectedReturn, bodyTempC, heartRate, batteryLevelPercent, notes } = req.body || {};
  const query = personnelId ? { _id: personnelId } : badgeId ? { badgeId } : null;
  if (!query) return res.status(400).json({ error: 'personnelId or badgeId required' });
  const p = await Personnel.findOne(query);
  if (!p) return res.status(404).json({ error: 'Personnel not found' });
  p.lastCheckIn = new Date();
  const fromLocation = p.currentLocation || '';
  if (status) p.currentStatus = status;
  if (location) p.currentLocation = location;
  if (expectedReturn) p.expectedReturn = new Date(expectedReturn);
  if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    p.currentCoordinates = {
      ...(p.currentCoordinates?.toObject?.() || {}),
      lat: Number(lat), lng: Number(lng), altitudeM: altitudeM !== undefined && altitudeM !== '' ? Number(altitudeM) : p.currentCoordinates?.altitudeM, lastPing: new Date()
    };
  } else if (p.currentCoordinates) p.currentCoordinates.lastPing = new Date();
  else p.currentCoordinates = { lastPing: new Date() };

  // Record vitals (pulse / body temperature / battery)
  if (heartRate !== undefined || bodyTempC !== undefined || batteryLevelPercent !== undefined) {
    p.vitals = {
      ...(p.vitals?.toObject?.() || {}),
      heartRate: heartRate !== undefined && heartRate !== '' ? Number(heartRate) : p.vitals?.heartRate,
      bodyTempC: bodyTempC !== undefined && bodyTempC !== '' ? Number(bodyTempC) : p.vitals?.bodyTempC,
      batteryLevelPercent: batteryLevelPercent !== undefined && batteryLevelPercent !== '' ? Number(batteryLevelPercent) : p.vitals?.batteryLevelPercent
    };
  }
  await p.save();

  // If coordinates provided, record breadcrumb path
  if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    await GeoTrack.create({
      personnelId: p._id,
      expeditionId: p.expeditionId,
      lat: Number(lat),
      lng: Number(lng),
      altitudeM: altitudeM ? Number(altitudeM) : undefined,
      batteryLevelPercent: batteryLevelPercent ? Number(batteryLevelPercent) : undefined
    }).catch(() => {});
  }

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
  if (io) io.emit('telemetry:update', { personnelId: p._id, badgeId: p.badgeId, status: p.currentStatus, location: p.currentLocation, coordinates: p.currentCoordinates });

  // If status is SOS_Alert, escalate immediately to emergency alert system
  let alert = null;
  if (p.currentStatus === 'SOS_Alert') {
    alert = await Alert.create({
      expeditionId: p.expeditionId,
      type: 'SOS_TRIGGER',
      severity: 'CRITICAL',
      title: `🚨 SOS DISTRESS BEACON: ${p.badgeId}`,
      message: `Emergency SOS check-in triggered by crew member at ${p.currentLocation || 'field'}. Lat=${p.currentCoordinates?.lat ?? 'unknown'}, Lng=${p.currentCoordinates?.lng ?? 'unknown'}. Notes: ${notes || 'Immediate assistance required'}`,
      sourceEntity: 'Personnel',
      sourceId: p._id,
      coordinates: p.currentCoordinates?.lat ? { lat: p.currentCoordinates.lat, lng: p.currentCoordinates.lng } : undefined
    });
    if (io) io.emit('alert:new', alert);
  }

  // Geofence check if coordinates provided
  if (p.currentCoordinates?.lat && p.currentCoordinates?.lng) {
    const zone = await checkGeofenceAsync(p.currentCoordinates.lat, p.currentCoordinates.lng);
    if (zone) {
      const geoAlert = await Alert.create({
        expeditionId: p.expeditionId,
        type: 'GEOFENCE_BREACH',
        severity: 'CRITICAL',
        title: `Geofence breach: ${p.badgeId} in ${zone}`,
        message: `lat=${p.currentCoordinates.lat}, lng=${p.currentCoordinates.lng}`,
        sourceEntity: 'Personnel',
        sourceId: p._id,
        coordinates: { lat: p.currentCoordinates.lat, lng: p.currentCoordinates.lng }
      });
      if (io) io.emit('alert:new', geoAlert);
    }
  }

  res.json({ personnel: p, alert });
});

// POST /api/v1/personnel/telemetry — GPS + vitals + geofence check
router.post('/telemetry', validate(schemas.personnelTelemetry), async (req, res) => {
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

  // Geofence interceptor (DB-driven zones, code constants as fallback)
  const zone = await checkGeofenceAsync(lat, lng);
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

// Helper: robust XML parser for Garmin GPX trackpoints & waypoints
function parseGpxTrackpoints(gpxString) {
  const points = [];
  if (!gpxString || typeof gpxString !== 'string') return points;

  // Match standard <trkpt lat="..." lon="..."> ... </trkpt> and <wpt ...> ... </wpt>
  const ptRegex = /<(?:trkpt|wpt)\s+[^>]*lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|wpt)>/gi;
  const selfClosingRegex = /<(?:trkpt|wpt)\s+[^>]*lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*\/>/gi;

  let match;
  while ((match = ptRegex.exec(gpxString)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3] || '';
    const eleMatch = inner.match(/<ele>([^<]+)<\/ele>/i);
    const timeMatch = inner.match(/<time>([^<]+)<\/time>/i);

    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({
        lat,
        lng,
        altitudeM: eleMatch ? parseFloat(eleMatch[1]) : undefined,
        recordedAt: timeMatch ? new Date(timeMatch[1]) : new Date()
      });
    }
  }

  if (points.length === 0) {
    while ((match = selfClosingRegex.exec(gpxString)) !== null) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ lat, lng, recordedAt: new Date() });
      }
    }
  }

  return points;
}

// POST /api/v1/personnel/ingest-gpx — ingest Garmin GPX track XML from field units
router.post('/ingest-gpx', async (req, res) => {
  const { personnelId, badgeId, gpxData, points: rawPoints } = req.body || {};
  const query = personnelId ? { _id: personnelId } : badgeId ? { badgeId } : null;
  if (!query) return res.status(400).json({ error: 'personnelId or badgeId required' });
  const p = await Personnel.findOne(query);
  if (!p) return res.status(404).json({ error: 'Personnel not found' });

  let parsedPoints = [];
  if (Array.isArray(rawPoints) && rawPoints.length > 0) {
    parsedPoints = rawPoints.map(pt => ({
      lat: parseFloat(pt.lat),
      lng: parseFloat(pt.lng),
      altitudeM: pt.altitudeM ? parseFloat(pt.altitudeM) : undefined,
      recordedAt: pt.recordedAt ? new Date(pt.recordedAt) : new Date()
    })).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lng));
  } else if (gpxData) {
    parsedPoints = parseGpxTrackpoints(gpxData);
  }

  if (parsedPoints.length === 0) {
    return res.status(400).json({ error: 'No valid GPS trackpoints found in GPX payload' });
  }

  const tracksToInsert = parsedPoints.map(pt => ({
    personnelId: p._id,
    expeditionId: p.expeditionId,
    lat: pt.lat,
    lng: pt.lng,
    altitudeM: pt.altitudeM,
    recordedAt: pt.recordedAt || new Date()
  }));

  const inserted = await GeoTrack.insertMany(tracksToInsert);

  const lastPoint = parsedPoints[parsedPoints.length - 1];
  p.currentCoordinates = {
    lat: lastPoint.lat,
    lng: lastPoint.lng,
    altitudeM: lastPoint.altitudeM,
    lastPing: lastPoint.recordedAt || new Date()
  };
  p.lastCheckIn = new Date();
  await p.save();

  const io = getIO(req);
  if (io) {
    io.emit('telemetry:update', {
      personnelId: p._id,
      badgeId: p.badgeId,
      lat: lastPoint.lat,
      lng: lastPoint.lng
    });
  }

  logAudit(req, 'gpx_ingest', 'Personnel', p._id, { count: inserted.length });
  res.json({
    message: `Successfully ingested ${inserted.length} GPX trackpoints`,
    count: inserted.length,
    lastPosition: lastPoint,
    tracks: inserted
  });
});

// GET /api/v1/personnel/:id/tracks — retrieve breadcrumb track points for mapping
router.get('/:id/tracks', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 500;
  const tracks = await GeoTrack.find({ personnelId: req.params.id })
    .sort({ recordedAt: 1 })
    .limit(limit);
  res.json(tracks);
});

// PATCH /api/v1/personnel/:id — edit roster fields
router.patch('/:id', validate(schemas.personnelUpdate), async (req, res) => {
  const p = await Personnel.findOne({ _id: req.params.id });
  if (!p) return res.status(404).json({ error: 'Not found' });
  ['roleTitle', 'assignedFieldZone', 'currentStatus', 'currentLocation', 'expectedReturn'].forEach(f => {
    if (req.body[f] !== undefined) p[f] = req.body[f];
  });
  if (req.body.vitals) {
    p.vitals = { ...(p.vitals?.toObject?.() || {}), ...req.body.vitals };
  }
  await p.save();
  logAudit(req, 'update', 'Personnel', p._id, { details: 'roster edited' });
  res.json(p);
});

// DELETE /api/v1/personnel/:id — roster entry removed, movement history kept
router.delete('/:id', async (req, res) => {
  const p = await Personnel.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  await p.deleteOne();
  logAudit(req, 'delete', 'Personnel', p._id, { from: p.badgeId });
  res.json({ deleted: true });
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
