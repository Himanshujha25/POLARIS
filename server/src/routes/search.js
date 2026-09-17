const express = require('express');
const Expedition = require('../models/Expedition');
const Cargo = require('../models/Cargo');
const Asset = require('../models/Asset');
const Personnel = require('../models/Personnel');
const Inventory = require('../models/Inventory');
const Incident = require('../models/Incident');
const Location = require('../models/Location');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/search?q= — global search across entities (#25)
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [expeditions, cargos, assets, personnel, inventory, incidents, locations] = await Promise.all([
    Expedition.find({ $or: [{ expeditionCode: rx }, { title: rx }] }).limit(5),
    Cargo.find({ $or: [{ trackingNumber: rx }, { title: rx }] }).limit(5),
    Asset.find({ $or: [{ assetTag: rx }, { name: rx }] }).limit(5),
    Personnel.find({ badgeId: rx }).populate('userId', 'fullName username').limit(5),
    Inventory.find({ itemName: rx }).limit(5),
    Incident.find({ $or: [{ incidentCode: rx }, { location: rx }] }).limit(5),
    Location.find({ name: rx }).limit(5)
  ]);
  res.json({ expeditions, cargos, assets, personnel, inventory, incidents, locations });
});

module.exports = router;
