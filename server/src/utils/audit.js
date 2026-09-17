const AuditLog = require('../models/AuditLog');

function logAudit(req, action, entity, entityId, opts = {}) {
  try {
    AuditLog.create({
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      action, entity,
      entityId: entityId ? String(entityId) : undefined,
      fromValue: opts.from,
      toValue: opts.to,
      details: opts.details
    }).catch(() => {});
  } catch { /* never break the request */ }
}

module.exports = { logAudit };
