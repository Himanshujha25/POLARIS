const express = require('express');
const Requirement = require('../models/Requirement');
const Expedition = require('../models/Expedition');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Incident = require('../models/Incident');
const { authRequired, requireRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { assertExpeditionOpen } = require('../utils/expeditionGuard');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/requirements?expeditionId=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  res.json(await Requirement.find(filter).sort({ priority: 1, createdAt: 1 }).limit(200));
});

// POST /api/v1/requirements
router.post('/', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  try {
    await assertExpeditionOpen(req.body.expeditionId);
    const r = await Requirement.create(req.body);
    logAudit(req, 'create', 'Requirement', r._id, { to: `${r.item} x${r.requiredQty}${r.unit}` });
    res.status(201).json(r);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// PATCH /api/v1/requirements/:id (allocated/received updates)
router.patch('/:id', requireRoles('SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'), async (req, res) => {
  try {
    const r = await Requirement.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(r.expeditionId);
    Object.assign(r, req.body);
    await r.save();
    logAudit(req, 'update', 'Requirement', r._id, { details: `received ${r.receivedQty}/${r.requiredQty}` });
    res.json(r);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// DELETE /api/v1/requirements/:id
router.delete('/:id', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  const r = await Requirement.findById(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  await assertExpeditionOpen(r.expeditionId);
  await r.deleteOne();
  logAudit(req, 'delete', 'Requirement', r._id, { from: r.item });
  res.json({ deleted: true });
});

// GET /api/v1/requirements/readiness/:expeditionId — real-data readiness (#8)
router.get('/readiness/:expeditionId', async (req, res) => {
  const { expeditionId } = req.params;
  const [reqs, personnel, cargos, assets, inventory, incidents] = await Promise.all([
    Requirement.find({ expeditionId }),
    Personnel.find({ expeditionId }),
    Cargo.find({ expeditionId }),
    Asset.find(),
    Inventory.find(),
    Incident.find({ expeditionId, status: { $nin: ['Resolved', 'Closed'] } })
  ]);
  const exp = await Expedition.findById(expeditionId);

  const personnelPct = exp ? Math.min(100, Math.round((personnel.length / Math.max(1, exp.totalPersonnelQuota)) * 100)) : 0;
  const reqReceived = reqs.reduce((s, r) => s + Math.min(r.requiredQty, r.receivedQty), 0);
  const reqTotal = reqs.reduce((s, r) => s + r.requiredQty, 0);
  const cargoPct = reqTotal ? Math.round((reqReceived / reqTotal) * 100) : (cargos.length ? 50 : 0);
  const healthyInv = inventory.filter(i => i.status === 'Optimal').length;
  const inventoryPct = inventory.length ? Math.round((healthyInv / inventory.length) * 100) : 0;
  const expAssets = assets.filter(a => a.expeditionId && a.expeditionId.toString() === expeditionId);
  const targetAssets = expAssets.length > 0 ? expAssets : assets;
  const opAssets = targetAssets.filter(a => a.condition === 'Operational').length;
  const assetPct = targetAssets.length ? Math.round((opAssets / targetAssets.length) * 100) : 0;
  const overall = Math.round((personnelPct + cargoPct + inventoryPct + assetPct) / 4);

  res.json({
    personnel: personnelPct, cargo: cargoPct, inventory: inventoryPct, assets: assetPct, overall,
    counts: {
      personnel: personnel.length, quota: exp?.totalPersonnelQuota || 0,
      requirements: reqs.length, cargos: cargos.length,
      assets: expAssets.length,
      openIncidents: incidents.length
    },
    issues: incidents.map(i => ({ code: i.incidentCode, type: i.type, severity: i.severity, status: i.status }))
  });
});

module.exports = router;
