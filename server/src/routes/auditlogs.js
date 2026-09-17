const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authRequired, requireRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRoles('SuperAdmin', 'ExpeditionManager'));

// GET /api/v1/audit-logs?action=&entity=&username=
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.username) filter.username = new RegExp(req.query.username, 'i');
  res.json(await AuditLog.find(filter).sort({ createdAt: -1 }).limit(300));
});

module.exports = router;
