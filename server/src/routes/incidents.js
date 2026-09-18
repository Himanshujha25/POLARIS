const express = require('express');
const Incident = require('../models/Incident');
const IncidentAction = require('../models/IncidentAction');
const Personnel = require('../models/Personnel');
const Asset = require('../models/Asset');
const Inventory = require('../models/Inventory');
const { authRequired, requireRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authRequired);

const CAN_MANAGE = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'];
const NEXT = {
  Reported: ['Acknowledged', 'Closed'],
  Acknowledged: ['ResponseInitiated', 'Closed'],
  ResponseInitiated: ['UnderControl', 'Closed'],
  UnderControl: ['Resolved', 'Closed'],
  Resolved: ['Closed'],
  Closed: []
};

async function addAction(incidentId, actionType, description, userId) {
  return IncidentAction.create({ incidentId, actionType, description, createdBy: userId });
}

// GET /api/v1/incidents (filters: status, severity, expeditionId; ?active=true)
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  if (req.query.active === 'true') filter.status = { $nin: ['Resolved', 'Closed'] };
  const list = await Incident.find(filter)
    .populate('reportedBy', 'username fullName')
    .populate('affectedPersonnelIds', 'badgeId currentStatus currentLocation')
    .sort({ createdAt: -1 }).limit(200);
  res.json(list);
});

// POST /api/v1/incidents — create + auto roll-call snapshot (#34.5)
router.post('/', requireRoles(...CAN_MANAGE), async (req, res) => {
  try {
    const inc = await Incident.create({ ...req.body, reportedBy: req.user.id });
    await addAction(inc._id, 'Report', `Incident reported at ${inc.location} (${inc.severity})`, req.user.id);
    // Auto roll-call: personnel currently at the incident location
    const rollCall = inc.location
      ? await Personnel.find({ currentLocation: inc.location }).populate('userId', 'username fullName').limit(50)
      : [];
    if (rollCall.length) {
      inc.affectedPersonnelIds = rollCall.map(p => p._id);
      await inc.save();
      await addAction(inc._id, 'Note', `Auto roll-call: ${rollCall.length} personnel at ${inc.location}`, req.user.id);
    }
    logAudit(req, 'emergency_action', 'Incident', inc._id, { to: 'Reported', details: inc.type });
    const io = req.app.get('io');
    if (io) io.emit('alert:new', { _id: inc._id, type: 'SOS_TRIGGER', severity: inc.severity === 'Critical' ? 'DISASTER' : 'CRITICAL', title: `${inc.incidentCode}: ${inc.type} at ${inc.location}`, createdAt: new Date() });
    res.status(201).json({ incident: inc, autoRollCall: rollCall.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/v1/incidents/:id — command view: incident + roll call + resources + timeline (#23)
router.get('/:id', async (req, res) => {
  const inc = await Incident.findById(req.params.id)
    .populate('reportedBy', 'username fullName')
    .populate({ path: 'affectedPersonnelIds', populate: { path: 'userId', select: 'username fullName' } })
    .populate('affectedAssetIds', 'assetTag name condition station')
    .populate('responderIds', 'username fullName role');
  if (!inc) return res.status(404).json({ error: 'Not found' });

  // Available resources AT the incident location (live data, not re-entered)
  const [peopleThere, assetsThere, stockThere] = await Promise.all([
    Personnel.find({ currentLocation: inc.location }).populate('userId', 'username fullName role').limit(50),
    Asset.find({ station: inc.location }).limit(50),
    Inventory.find({ station: inc.location }).limit(50)
  ]);
  const timeline = await IncidentAction.find({ incidentId: inc._id }).populate('createdBy', 'username').sort({ createdAt: 1 });
  res.json({
    incident: inc,
    rollCall: peopleThere,
    resources: { assets: assetsThere, inventory: stockThere },
    timeline,
    allowedNext: NEXT[inc.status] || []
  });
});

// PATCH /api/v1/incidents/:id/status — workflow transitions
router.patch('/:id/status', requireRoles(...CAN_MANAGE), async (req, res) => {
  const { status, resolutionSummary, responderIds, affectedAssetIds } = req.body || {};
  const inc = await Incident.findById(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  if (status && !(NEXT[inc.status] || []).includes(status)) {
    return res.status(400).json({ error: `Cannot move ${inc.status} → ${status}. Allowed: ${(NEXT[inc.status] || []).join(', ') || 'none'}` });
  }
  const from = inc.status;
  if (status) inc.status = status;
  if (responderIds) {
    inc.responderIds = responderIds;
    await addAction(inc._id, 'ResponderAssigned', `${responderIds.length} responder(s) assigned`, req.user.id);
  }
  if (affectedAssetIds) {
    inc.affectedAssetIds = affectedAssetIds;
    await addAction(inc._id, 'AssetAssigned', `${affectedAssetIds.length} asset(s) deployed/affected`, req.user.id);
  }
  if (['Resolved', 'Closed'].includes(inc.status)) {
    if (!resolutionSummary && !inc.resolutionSummary) {
      return res.status(400).json({ error: 'Closing an incident requires a resolution summary' });
    }
    if (resolutionSummary) inc.resolutionSummary = resolutionSummary;
    inc.closedAt = new Date();
    await addAction(inc._id, inc.status === 'Resolved' ? 'Resolve' : 'Close', resolutionSummary || inc.resolutionSummary, req.user.id);
  } else {
    await addAction(inc._id, 'Update', `Status: ${from} → ${inc.status}`, req.user.id);
  }
  await inc.save();
  logAudit(req, 'status_change', 'Incident', inc._id, { from, to: inc.status });
  res.json(inc);
});

// POST /api/v1/incidents/:id/actions — record response action
router.post('/:id/actions', requireRoles(...CAN_MANAGE), async (req, res) => {
  const { description, actionType } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description required' });
  const inc = await Incident.findById(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Not found' });
  if (['Resolved', 'Closed'].includes(inc.status)) return res.status(400).json({ error: 'Incident is closed to new actions' });
  const action = await addAction(inc._id, actionType || 'Action', description, req.user.id);
  logAudit(req, 'emergency_action', 'IncidentAction', action._id, { details: description.slice(0, 120) });
  res.status(201).json(action);
});

module.exports = router;
