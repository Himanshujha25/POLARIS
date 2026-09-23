const express = require('express');
const Cargo = require('../models/Cargo');
const CargoEvent = require('../models/CargoEvent');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Requirement = require('../models/Requirement');
const { authRequired, requireRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { logAudit } = require('../utils/audit');
const { assertExpeditionOpen } = require('../utils/expeditionGuard');

const router = express.Router();
router.use(authRequired);

const CAN_WRITE = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'];
const NODE_ORDER = ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station'];

async function logEvent(cargo, eventType, req, extra = {}) {
  return CargoEvent.create({
    cargoId: cargo._id, expeditionId: cargo.expeditionId,
    eventType, createdBy: req.user?.id, ...extra
  });
}

// GET /api/v1/cargo
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.node) filter.currentNode = req.query.node;
  if (req.query.expeditionId) filter.expeditionId = req.query.expeditionId;
  if (req.query.containerNumber) filter.containerNumber = req.query.containerNumber;
  if (req.query.search) {
    const q = new RegExp(req.query.search, 'i');
    filter.$or = [{ trackingNumber: q }, { title: q }, { containerNumber: q }, { sealNumber: q }];
  }
  res.json(await Cargo.find(filter).sort({ createdAt: -1 }).limit(200));
});

// POST /api/v1/cargo
router.post('/', requireRoles(...CAN_WRITE), validate(schemas.cargoCreate), async (req, res) => {
  try {
    await assertExpeditionOpen(req.body.expeditionId);
    const body = { ...req.body };
    if (!body.qrPayload && body.trackingNumber) body.qrPayload = `POLARIS:${body.trackingNumber}`;
    const cargo = await Cargo.create(body);
    await logEvent(cargo, 'Prepared', req, { location: cargo.currentLocation });
    logAudit(req, 'create', 'Cargo', cargo._id, { to: cargo.trackingNumber });
    res.status(201).json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// PATCH /api/v1/cargo/:id/stage — advance waypoint + timeline event
router.patch('/:id/stage', requireRoles(...CAN_WRITE), validate(schemas.cargoStage), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    const { node, location, status, eta, reason } = req.body || {};
    const fromNode = cargo.currentNode;
    if (node) {
      if (!NODE_ORDER.includes(node)) return res.status(400).json({ error: 'Invalid node' });
      cargo.currentNode = node;
    }
    if (location) cargo.currentLocation = location;
    if (eta) cargo.eta = new Date(eta);
    const prevStatus = cargo.status;
    if (status) cargo.status = status;
    else if (node === 'Bharati_Station' || node === 'Maitri_Station') cargo.status = 'DeliveredStation';
    else cargo.status = 'InTransit';
    await cargo.save();

    if (cargo.status === 'DelayedWeather' && prevStatus !== 'DelayedWeather') {
      await logEvent(cargo, 'Delayed', req, { fromNode, toNode: cargo.currentNode, reason });
    } else if (eta) {
      await logEvent(cargo, 'EtaUpdated', req, { fromNode, toNode: cargo.currentNode, eta: cargo.eta, reason });
    } else {
      await logEvent(cargo, 'NodeArrived', req, { fromNode, toNode: cargo.currentNode, location: cargo.currentLocation });
    }
    logAudit(req, 'status_change', 'Cargo', cargo._id, { from: `${prevStatus}@${fromNode}`, to: `${cargo.status}@${cargo.currentNode}` });
    const io = req.app.get('io');
    if (io) io.emit('cargo:update', cargo);
    res.json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// POST /api/v1/cargo/:id/receive — station receipt → inventory RECEIPT + requirement progress (Test 5)
router.post('/:id/receive', requireRoles(...CAN_WRITE), validate(schemas.cargoReceive), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    if (cargo.status === 'DeliveredStation' || cargo.status === 'Received') {
      const prior = await CargoEvent.findOne({ cargoId: cargo._id, eventType: 'Received' });
      if (prior && req.body.confirm !== true) {
        return res.status(400).json({ error: 'Already received. Pass confirm:true to receive again.' });
      }
    }
    const { station, requirementId, linkItems } = req.body || {};
    const stationName = station || (cargo.currentNode === 'Bharati_Station' ? 'Bharati' : cargo.currentNode === 'Maitri_Station' ? 'Maitri' : null);
    if (!stationName) return res.status(400).json({ error: 'station required (cargo not at a station node)' });

    const receipts = [];
    const CAT_MAP = { Provisions: 'FoodRations', HazardousFuel: 'Fuel', MedicalLifeSupport: 'Medical', HeavySpares: 'GeneratorSpares', ScientificInstruments: 'GeneratorSpares' };
    const UNIT_MAP = { kg: 'Kilograms', kilogram: 'Kilograms', kilograms: 'Kilograms', l: 'Liters', liter: 'Liters', liters: 'Liters', litre: 'Liters', units: 'Units', unit: 'Units', cylinders: 'Cylinders', cylinder: 'Cylinders', dayssupply: 'DaysSupply' };
    const normUnit = (u) => UNIT_MAP[String(u || '').toLowerCase()] || 'Units';
    const items = Array.isArray(linkItems) && linkItems.length ? linkItems : cargo.items.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }));
    for (const it of items) {
      let inv = await Inventory.findOne({ station: stationName, itemName: it.name });
      if (!inv) {
        inv = new Inventory({
          station: stationName, category: CAT_MAP[cargo.category] || 'GeneratorSpares', itemName: it.name,
          currentStock: 0, unit: normUnit(it.unit),
          minimumSafeThreshold: 10, criticalEmergencyThreshold: 3,
          dailyConsumptionRate: 1, storageBunker: 'Receiving'
        });
      }
      const opening = inv.currentStock;
      inv.currentStock += Number(it.quantity) || 0;
      inv.recalc();
      await inv.save();
      await InventoryTransaction.create({
        inventoryId: inv._id, station: stationName, itemName: inv.itemName,
        type: 'RECEIPT', quantity: Number(it.quantity) || 0, unit: inv.unit,
        openingStock: opening, closingStock: inv.currentStock,
        reference: cargo.trackingNumber, reason: `Cargo receipt ${cargo.trackingNumber}`,
        createdBy: req.user?.id
      });
      receipts.push({ item: inv.itemName, qty: it.quantity, stock: inv.currentStock });
    }

    // Link receipt → expedition requirement progress
    if (requirementId) {
      const rq = await Requirement.findById(requirementId);
      if (rq) {
        const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        rq.receivedQty += totalQty;
        await rq.save();
      }
    }

    cargo.status = 'DeliveredStation';
    await cargo.save();
    await logEvent(cargo, 'Received', req, { toNode: cargo.currentNode, location: stationName, reason: `Received: ${receipts.map(r => `${r.item} x${r.qty}`).join(', ')}` });
    logAudit(req, 'status_change', 'Cargo', cargo._id, { to: `DeliveredStation@${stationName}`, details: `${receipts.length} inventory lines` });
    const io = req.app.get('io');
    if (io) io.emit('cargo:update', cargo);
    res.json({ cargo, receipts });
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// GET /api/v1/cargo/:id/timeline — visual movement history
router.get('/:id/timeline', async (req, res) => {
  const events = await CargoEvent.find({ cargoId: req.params.id }).populate('createdBy', 'username').sort({ createdAt: 1 });
  res.json(events);
});

// PATCH /api/v1/cargo/:id — edit details (title, ETA, hazmat, items)
router.patch('/:id', requireRoles(...CAN_WRITE), validate(schemas.cargoUpdate), async (req, res) => {
  try {
    const cargo = await Cargo.findById(req.params.id);
    if (!cargo) return res.status(404).json({ error: 'Not found' });
    await assertExpeditionOpen(cargo.expeditionId);
    ['title', 'weightKg', 'volumeM3', 'isHazmat', 'eta', 'transportMode', 'items', 'containerNumber', 'sealNumber', 'tareWeightKg', 'containerType', 'imageUrl', 'ocrExtractedText'].forEach(f => {
      if (req.body[f] !== undefined) cargo[f] = req.body[f];
    });
    await cargo.save();
    await logEvent(cargo, 'Note', req, { reason: 'Cargo details edited' });
    logAudit(req, 'update', 'Cargo', cargo._id, { details: 'cargo edited' });
    res.json(cargo);
  } catch (e) { res.status(e.status || 400).json({ error: e.message }); }
});

// DELETE /api/v1/cargo/:id — history kept in audit log
router.delete('/:id', requireRoles(...CAN_WRITE), async (req, res) => {
  const cargo = await Cargo.findById(req.params.id);
  if (!cargo) return res.status(404).json({ error: 'Not found' });
  await CargoEvent.deleteMany({ cargoId: cargo._id });
  await cargo.deleteOne();
  logAudit(req, 'delete', 'Cargo', cargo._id, { from: cargo.trackingNumber });
  res.json({ deleted: true });
});

// GET /api/v1/cargo/track/:trackingNumber — QR lookup
router.get('/track/:trackingNumber', async (req, res) => {
  const cargo = await Cargo.findOne({ trackingNumber: req.params.trackingNumber });
  if (!cargo) return res.status(404).json({ error: 'Not found' });
  res.json(cargo);
});

// Helper for Gemini Vision multimodal OCR
async function geminiVisionOcr(imageDataUrl, apiKey) {
  let mimeType = 'image/jpeg';
  let base64Data = imageDataUrl;
  if (imageDataUrl.includes(';base64,')) {
    const parts = imageDataUrl.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    base64Data = parts[1];
  } else if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
    // If URL passed, return null to fallback
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        },
        {
          text: `You are the POLARIS Polar Expedition Logistics Optical Character Recognition (OCR) Engine.
Carefully examine this image (cargo container, customs seal plate, freight manifest, equipment rating plate, or machine label).
Transcribe all visible printed text and numbers verbatim.

Make sure to specifically transcribe any identified markings in this format if visible:
CONTAINER NO: <e.g. BHRU-3301948 or ISO container code>
CUSTOMS SEAL: <e.g. IN-CUS-774012>
WAYBILL: <airway bill or tracking code>
TARE WT: <number> KG
NET WT: <number> KG
GROSS WT: <number> KG
CARGO / EQUIPMENT: <manifest items or machine type>
EXPEDITION / DESTINATION: <Bharati / Maitri / NCPOR Goa>`
        }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Gemini Vision HTTP ${res.status}`);
    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? candidate.trim() : null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// POST /api/v1/cargo/ocr — High-speed neural optical character recognition
router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required (base64 string or data URL)' });
    }
    if (image.length > 15 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large: image exceeds 15MB limit' });
    }

    // Tier 1: Google Gemini 2.5 Flash Multimodal Vision
    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiText = await geminiVisionOcr(image, process.env.GEMINI_API_KEY);
        if (geminiText && geminiText.length > 5) {
          console.log('[POLARIS OCR] ✅ Gemini Vision OCR succeeded, length:', geminiText.length);
          return res.json({
            text: geminiText,
            confidence: 98,
            provider: 'gemini-2.5-flash-vision',
            success: true
          });
        }
      } catch (geminiErr) {
        console.warn('[POLARIS OCR] ⚠️ Gemini Vision failed, attempting local OCR:', geminiErr.message);
      }
    }

    // Tier 2: Local Tesseract.js OCR Engine
    try {
      const Tesseract = require('tesseract.js');
      const result = await Tesseract.recognize(image, 'eng');
      const text = (result?.data?.text || '').trim();
      const confidence = result?.data?.confidence ?? 80;
      if (text) {
        console.log('[POLARIS OCR] ✅ Tesseract OCR succeeded, length:', text.length);
        return res.json({ text, confidence, provider: 'tesseract.js', success: true });
      }
    } catch (tessErr) {
      console.warn('[POLARIS OCR] ⚠️ Tesseract local engine notice:', tessErr.message);
    }

    // Tier 3: Graceful fallback so client parser proceeds without crashing
    res.json({ text: '', confidence: 0, provider: 'fallback', success: false });
  } catch (err) {
    console.error('[OCR Engine Error]', err.message);
    res.status(200).json({ text: '', error: err.message, success: false });
  }
});

module.exports = router;

