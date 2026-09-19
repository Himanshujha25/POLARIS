const express = require('express');
const Location = require('../models/Location');
const { authRequired, requireRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { logAudit } = require('../utils/audit');

const router = express.Router();
router.use(authRequired);

// GET /api/v1/locations — flat list or tree
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.active !== undefined) filter.isActive = req.query.active !== 'false';
  const list = await Location.find(filter).populate('parentId', 'name type').sort({ type: 1, name: 1 }).limit(300);
  if (req.query.tree === 'true') {
    const map = {};
    list.forEach(l => { map[l._id] = { ...l.toObject(), children: [] }; });
    const roots = [];
    list.forEach(l => {
      if (l.parentId && map[l.parentId._id || l.parentId]) map[l.parentId._id || l.parentId].children.push(map[l._id]);
      else roots.push(map[l._id]);
    });
    return res.json(roots);
  }
  res.json(list);
});

// POST /api/v1/locations
router.post('/', requireRoles('SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'), validate(schemas.locationCreate), async (req, res) => {
  try {
    const loc = await Location.create(req.body);
    logAudit(req, 'create', 'Location', loc._id, { to: loc.name, details: loc.type });
    res.status(201).json(loc);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// PATCH /api/v1/locations/:id (incl. nextResupplyDate)
router.patch('/:id', requireRoles('SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'), validate(schemas.locationUpdate), async (req, res) => {
  const loc = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!loc) return res.status(404).json({ error: 'Not found' });
  logAudit(req, 'update', 'Location', loc._id, { details: 'location updated' });
  res.json(loc);
});

// GET /api/v1/locations/map — DB-driven map data: stations/camps with
// coordinates + danger zones (dangerPolygon). No hardcoded geography here;
// empty arrays mean the operator hasn't mapped anything yet.
router.get('/map', async (req, res) => {
  const locs = await Location.find({ isActive: { $ne: false } }).select('name type coordinates dangerPolygon region').limit(300);
  const stations = locs
    .filter(l => l.coordinates && l.coordinates.lat !== undefined && l.coordinates.lng !== undefined && !(l.dangerPolygon && l.dangerPolygon.length))
    .map(l => ({ id: l._id, name: l.name, type: l.type, lat: l.coordinates.lat, lng: l.coordinates.lng }));
  const zones = locs
    .filter(l => Array.isArray(l.dangerPolygon) && l.dangerPolygon.length >= 3)
    .map(l => ({ id: l._id, name: l.name, polygon: l.dangerPolygon }));
  res.json({ stations, zones });
});

// DELETE /api/v1/locations/:id — blocked when stock or people reference it
router.delete('/:id', requireRoles('SuperAdmin'), async (req, res) => {
  const Inventory = require('../models/Inventory');
  const Personnel = require('../models/Personnel');
  const loc = await Location.findById(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Not found' });
  const [inv, ppl] = await Promise.all([
    Inventory.countDocuments({ station: loc.name.replace(' Station', '') }),
    Personnel.countDocuments({ currentLocation: loc.name })
  ]);
  if (inv + ppl > 0) {
    return res.status(400).json({ error: `Cannot delete: ${inv} stock lines, ${ppl} personnel reference ${loc.name}.` });
  }
  await Location.deleteMany({ parentId: loc._id });
  await loc.deleteOne();
  logAudit(req, 'delete', 'Location', loc._id, { from: loc.name });
  res.json({ deleted: true });
});

module.exports = router;
