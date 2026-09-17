const Personnel = require('../models/Personnel');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Cargo = require('../models/Cargo');
const Alert = require('../models/Alert');
const Setting = require('../models/Setting');

let ioRef = null;
function setIO(io) { ioRef = io; }
function emitAlert(alert) {
  if (ioRef) ioRef.emit('alert:new', alert);
}

async function createAlertOnce(filter, doc) {
  const exists = await Alert.findOne({ ...filter, isAcknowledged: false });
  if (exists) return exists;
  const alert = await Alert.create(doc);
  emitAlert(alert);
  return alert;
}

async function checkDeadman() {
  const windowMin = await getConfig('deadmanMinutes', process.env.DEADMAN_MINUTES || '45');
  const cutoff = new Date(Date.now() - windowMin * 60 * 1000);
  const overdue = await Personnel.find({
    currentStatus: 'FieldResearch',
    $or: [
      { 'currentCoordinates.lastPing': { $lt: cutoff } },
      { 'currentCoordinates.lastPing': { $exists: false } }
    ]
  }).limit(50);
  for (const p of overdue) {
    await createAlertOnce(
      { type: 'DEADMAN_TIMEOUT', sourceId: p._id },
      {
        expeditionId: p.expeditionId,
        type: 'DEADMAN_TIMEOUT',
        severity: 'CRITICAL',
        title: `Dead-man timeout: ${p.badgeId}`,
        message: `No ping since ${p.currentCoordinates?.lastPing || 'unknown'}. Last known lat=${p.currentCoordinates?.lat}, lng=${p.currentCoordinates?.lng}`,
        sourceEntity: 'Personnel',
        sourceId: p._id,
        coordinates: { lat: p.currentCoordinates?.lat, lng: p.currentCoordinates?.lng }
      }
    );
  }
  return overdue.length;
}

async function checkDepletion() {
  const items = await Inventory.find({ status: { $ne: 'Exhausted' } }).limit(200);
  let flagged = 0;
  for (const item of items) {
    item.recalc();
    await item.save();
    if (item.status === 'CriticalDepletion' || item.status === 'Exhausted') {
      await createAlertOnce(
        { type: 'CRITICAL_STOCK_DEPLETION', sourceId: item._id },
        {
          type: 'CRITICAL_STOCK_DEPLETION',
          severity: item.status === 'Exhausted' ? 'DISASTER' : 'CRITICAL',
          title: `Low stock: ${item.itemName} (${item.station})`,
          message: `${item.currentStock} ${item.unit} left, ~${item.daysRemainingCalculated} days remaining`,
          sourceEntity: 'Inventory',
          sourceId: item._id
        }
      );
      flagged++;
    }
  }
  return flagged;
}

async function checkMaintenance() {
  const warnHours = await getConfig('maintWarnHours', '25');
  const assets = await Asset.find({ condition: { $in: ['Operational', 'Degraded', 'InUse', 'Standby'] } }).limit(200);
  let flagged = 0;
  for (const a of assets) {
    const overdue = a.operatingHours >= a.maxHoursBeforeService;
    const dueSoon = !overdue && a.operatingHours >= (a.maxHoursBeforeService - warnHours);
    if (overdue || dueSoon) {
      await createAlertOnce(
        { type: 'EQUIPMENT_FAULT', sourceId: a._id },
        {
          type: 'EQUIPMENT_FAULT',
          severity: overdue ? 'CRITICAL' : 'WARNING',
          title: overdue ? `Maintenance OVERDUE: ${a.assetTag}` : `Maintenance due: ${a.assetTag}`,
          message: `${a.operatingHours}/${a.maxHoursBeforeService} hrs${overdue ? ' — service overdue, do not deploy' : '. Schedule service.'}`,
          sourceEntity: 'Asset',
          sourceId: a._id
        }
      );
      flagged++;
    }
  }
  return flagged;
}

// Runtime config with caching (DB setting wins, env fallback)
let configCache = { at: 0, values: {} };
async function getConfig(key, fallback) {
  if (Date.now() - configCache.at < 5 * 60 * 1000 && configCache.values[key] !== undefined) {
    return Number(configCache.values[key]);
  }
  try {
    const s = await Setting.findOne({ key });
    if (s) {
      configCache = { at: Date.now(), values: { ...configCache.values, [key]: s.value } };
      return Number(s.value);
    }
  } catch { /* fall through */ }
  return Number(fallback);
}

async function checkCargoEta() {
  const now = new Date();
  const slipped = await Cargo.find({
    status: 'InTransit',
    eta: { $lt: now }
  }).limit(50);
  for (const c of slipped) {
    await createAlertOnce(
      { type: 'CARGO_ETA_SLIP', sourceId: c._id },
      {
        expeditionId: c.expeditionId,
        type: 'CARGO_ETA_SLIP',
        severity: 'WARNING',
        title: `Cargo ETA slipped: ${c.trackingNumber}`,
        message: `ETA ${c.eta} passed. Node: ${c.currentNode}. Hazmat: ${c.isHazmat}`,
        sourceEntity: 'Cargo',
        sourceId: c._id
      }
    );
  }
  return slipped.length;
}

async function runAllChecks() {
  const results = {};
  try { results.deadman = await checkDeadman(); } catch (e) { results.deadmanError = e.message; }
  try { results.depletion = await checkDepletion(); } catch (e) { results.depletionError = e.message; }
  try { results.maintenance = await checkMaintenance(); } catch (e) { results.maintenanceError = e.message; }
  try { results.cargoEta = await checkCargoEta(); } catch (e) { results.cargoEtaError = e.message; }
  return results;
}

function startAutomation(io, intervalMs = 60000) {
  setIO(io);
  runAllChecks().catch(() => {});
  const timer = setInterval(() => runAllChecks().catch(() => {}), intervalMs);
  return { runAllChecks, stop: () => clearInterval(timer) };
}

module.exports = { startAutomation, runAllChecks, setIO, emitAlert, checkDeadman, checkDepletion, checkMaintenance, checkCargoEta };
