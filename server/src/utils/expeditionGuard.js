const Expedition = require('../models/Expedition');

async function assertExpeditionOpen(expeditionId) {
  if (!expeditionId) return null;
  const exp = await Expedition.findById(expeditionId);
  if (!exp) { const e = new Error('Expedition not found'); e.status = 404; throw e; }
  if (['Completed', 'Cancelled', 'Decommissioned'].includes(exp.status)) {
    const e = new Error(`Expedition ${exp.expeditionCode} is ${exp.status} — operational updates blocked`);
    e.status = 400;
    throw e;
  }
  return exp;
}

module.exports = { assertExpeditionOpen };
