const express = require('express');
const Expedition = require('../models/Expedition');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');
const Asset = require('../models/Asset');
const Requirement = require('../models/Requirement');
const { authRequired, requireRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/expeditions
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const list = await Expedition.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(list);
});

// POST /api/v1/expeditions
router.post('/', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  try {
    const exp = await Expedition.create(req.body);
    logAudit(req, 'create', 'Expedition', exp._id, { to: exp.expeditionCode });
    res.status(201).json(exp);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/v1/expeditions/:id — comprehensive mission dossier
router.get('/:id', async (req, res) => {
  const exp = await Expedition.findById(req.params.id).populate('leaderId', 'username fullName role email');
  if (!exp) return res.status(404).json({ error: 'Not found' });
  const [personnel, cargo, assets, requirements] = await Promise.all([
    Personnel.find({ expeditionId: exp._id }).populate('userId', 'username fullName role email bloodGroup emergencyContact'),
    Cargo.find({ expeditionId: exp._id }),
    Asset.find({ expeditionId: exp._id }).populate('assignedToPersonnelId', 'badgeId roleTitle'),
    Requirement.find({ expeditionId: exp._id })
  ]);
  res.json({ expedition: exp, personnel, cargo, assets, requirements });
});

// PATCH /api/v1/expeditions/:id
router.patch('/:id', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  const exp = await Expedition.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!exp) return res.status(404).json({ error: 'Not found' });
  logAudit(req, 'update', 'Expedition', exp._id, { details: 'expedition updated' });
  res.json(exp);
});

// DELETE /api/v1/expeditions/:id — blocked when operational records exist
router.delete('/:id', requireRoles('SuperAdmin'), async (req, res) => {
  const exp = await Expedition.findById(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  const [p, c, r] = await Promise.all([
    Personnel.countDocuments({ expeditionId: exp._id }),
    Cargo.countDocuments({ expeditionId: exp._id }),
    Requirement.countDocuments({ expeditionId: exp._id })
  ]);
  if (p + c + r > 0) {
    return res.status(400).json({ error: `Cannot delete: ${p} personnel, ${c} cargo, ${r} requirements linked. Complete/Cancel instead.` });
  }
  await exp.deleteOne();
  logAudit(req, 'delete', 'Expedition', exp._id, { from: exp.expeditionCode });
  res.json({ deleted: true });
});

module.exports = router;
