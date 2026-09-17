const express = require('express');
const Setting = require('../models/Setting');
const { authRequired, requireRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

const DEFAULTS = {
  deadmanMinutes: { value: '45', description: 'Field ping window before dead-man escalation (minutes)' },
  maintWarnHours: { value: '25', description: 'Warn this many operating-hours before service is due' },
  appName: { value: 'POLARIS', description: 'Displayed application name' }
};

const router = express.Router();
router.use(authRequired);

// GET /api/v1/settings — all settings with defaults filled
router.get('/', async (req, res) => {
  const stored = await Setting.find();
  const map = Object.fromEntries(stored.map(s => [s.key, s]));
  res.json(Object.entries(DEFAULTS).map(([key, d]) => ({
    key,
    value: map[key]?.value ?? d.value,
    description: d.description,
    fromDefault: !map[key]
  })));
});

// PATCH /api/v1/settings/:key (SuperAdmin only)
router.patch('/:key', requireRoles('SuperAdmin'), async (req, res) => {
  const { key } = req.params;
  if (!DEFAULTS[key]) return res.status(400).json({ error: 'Unknown setting' });
  const { value } = req.body || {};
  if (value === undefined || value === '') return res.status(400).json({ error: 'value required' });
  if (['deadmanMinutes', 'maintWarnHours'].includes(key) && !(Number(value) > 0)) {
    return res.status(400).json({ error: 'Must be a positive number' });
  }
  const s = await Setting.findOneAndUpdate(
    { key },
    { value: String(value), updatedBy: req.user.id },
    { new: true, upsert: true }
  );
  logAudit(req, 'update', 'Setting', s._id, { to: `${key}=${value}` });
  res.json(s);
});

module.exports = router;
