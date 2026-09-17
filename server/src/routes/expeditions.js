const express = require('express');
const Expedition = require('../models/Expedition');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');
const { authRequired, requireRoles } = require('../middleware/auth');

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
    res.status(201).json(exp);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// GET /api/v1/expeditions/:id — dossier
router.get('/:id', async (req, res) => {
  const exp = await Expedition.findById(req.params.id).populate('leaderId', 'username fullName role');
  if (!exp) return res.status(404).json({ error: 'Not found' });
  const [personnel, cargo] = await Promise.all([
    Personnel.find({ expeditionId: exp._id }).populate('userId', 'username fullName role'),
    Cargo.find({ expeditionId: exp._id })
  ]);
  res.json({ expedition: exp, personnel, cargo });
});

// PATCH /api/v1/expeditions/:id
router.patch('/:id', requireRoles('SuperAdmin', 'ExpeditionManager'), async (req, res) => {
  const exp = await Expedition.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!exp) return res.status(404).json({ error: 'Not found' });
  res.json(exp);
});

module.exports = router;
