const express = require('express');
const Expedition = require('../models/Expedition');
const Requirement = require('../models/Requirement');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');
const CargoEvent = require('../models/CargoEvent');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Asset = require('../models/Asset');
const AssetMaintenance = require('../models/MaintenanceLog');
const PersonnelMovement = require('../models/PersonnelMovement');
const Incident = require('../models/Incident');
const IncidentAction = require('../models/IncidentAction');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/reports/expedition/:id — readiness report from real data (#28)
router.get('/expedition/:id', async (req, res) => {
  const exp = await Expedition.findById(req.params.id).populate('leaderId', 'username fullName');
  if (!exp) return res.status(404).json({ error: 'Not found' });
  const [reqs, personnel, cargos, inventory, assets, incidents, movements] = await Promise.all([
    Requirement.find({ expeditionId: exp._id }),
    Personnel.find({ expeditionId: exp._id }).populate('userId', 'fullName username role'),
    Cargo.find({ expeditionId: exp._id }),
    Inventory.find(),
    Asset.find(),
    Incident.find({ expeditionId: exp._id })
      .populate('reportedBy', 'fullName username role badgeId')
      .populate('responderIds', 'fullName username role badgeId')
      .sort({ createdAt: -1 }),
    PersonnelMovement.find({ expeditionId: exp._id }).populate('personnelId', 'badgeId').sort({ createdAt: -1 }).limit(50)
  ]);
  const incidentIds = incidents.map(i => i._id);
  const incidentActions = await IncidentAction.find({ incidentId: { $in: incidentIds } })
    .populate('createdBy', 'fullName username role')
    .sort({ createdAt: 1 });
  const cargoEvents = await CargoEvent.find({ cargoId: { $in: cargos.map(c => c._id) } }).sort({ createdAt: -1 }).limit(50);
  const txns = await InventoryTransaction.find().sort({ createdAt: -1 }).limit(50);
  const byLoc = {};
  personnel.forEach(p => {
    const loc = p.currentLocation || 'Unknown';
    byLoc[loc] = (byLoc[loc] || 0) + 1;
  });
  res.json({
    expedition: exp,
    requirements: reqs,
    personnel: { total: personnel.length, quota: exp.totalPersonnelQuota, byLocation: byLoc, roster: personnel },
    cargo: cargos,
    inventory,
    assets,
    incidents,
    incidentActions,
    recentMovements: movements,
    recentCargoEvents: cargoEvents,
    recentTransactions: txns,
    generatedAt: new Date().toISOString()
  });
});

// GET /api/v1/analytics/overview — decision-value aggregates (#29)
router.get('/analytics/overview', async (req, res) => {
  const [cargoByStatus, personnelByStatus, assetsByCondition, invByStatus, incidentsOpen, consumption] = await Promise.all([
    Cargo.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Personnel.aggregate([{ $group: { _id: '$currentStatus', count: { $sum: 1 } } }]),
    Asset.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]),
    Inventory.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Incident.countDocuments({ status: { $nin: ['Resolved', 'Closed'] } }),
    InventoryTransaction.aggregate([
      { $match: { type: 'CONSUMPTION', createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: '$itemName', total: { $sum: { $abs: '$quantity' } } } },
      { $sort: { total: -1 } }, { $limit: 10 }
    ])
  ]);
  const toMap = (arr) => Object.fromEntries(arr.map(a => [a._id || 'Unknown', a.count]));
  res.json({
    cargo: toMap(cargoByStatus),
    personnel: toMap(personnelByStatus),
    assets: toMap(assetsByCondition),
    inventory: toMap(invByStatus),
    openIncidents: incidentsOpen,
    topConsumption30d: consumption
  });
});

module.exports = router;
