// Request validation (zod). Every write endpoint gets presence + type checks
// BEFORE mongoose/RBAC logic, so malformed payloads fail fast with 400 +
// field-level details instead of 500s or silent coercion.
//
// Safety rule: create-schemas require only anchor fields; update-schemas are
// partial + .passthrough() so unknown-but-harmless fields never break clients.
const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: r.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`)
      });
    }
    req.body = r.data;
    next();
  };
}

const objectId = z.string().min(1).max(100);
const rolename = z.enum(['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer', 'InventoryOfficer', 'PersonnelOfficer', 'AssetOfficer', 'EmergencyOfficer']);
const num = z.coerce.number().finite();

const schemas = {
  login: z.object({
    username: z.string().min(1).max(100),
    password: z.string().min(1).max(256)
  }),

  register: z.object({
    username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, 'letters, numbers, _ . - only'),
    email: z.string().email().max(120),
    password: z.string().min(8).max(128),
    fullName: z.string().min(1).max(120),
    role: rolename,
    station: z.string().max(80).optional(),
    bloodGroup: z.string().max(10).optional(),
    emergencyContact: z.object({}).passthrough().optional()
  }),

  passwordChange: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
  }),

  expeditionCreate: z.object({
    expeditionCode: z.string().min(1).max(40),
    title: z.string().min(1).max(200)
  }).passthrough(),

  expeditionUpdate: z.object({
    expeditionCode: z.string().min(1).max(40).optional(),
    title: z.string().min(1).max(200).optional(),
    status: z.string().max(40).optional()
  }).passthrough(),

  requirementCreate: z.object({
    expeditionId: objectId,
    item: z.string().min(1).max(200)
  }).passthrough(),

  requirementUpdate: z.object({}).passthrough(),

  cargoCreate: z.object({
    expeditionId: objectId,
    title: z.string().max(200).optional(),
    trackingNumber: z.string().max(80).optional(),
    weightKg: num.optional()
  }).passthrough(),

  cargoStage: z.object({
    node: z.string().max(80).optional(),
    location: z.string().max(120).optional(),
    status: z.string().max(40).optional(),
    eta: z.string().max(40).optional()
  }).passthrough(),

  cargoReceive: z.object({
    station: z.string().max(80).optional()
  }).passthrough(),

  cargoUpdate: z.object({}).passthrough(),

  inventoryCreate: z.object({
    itemName: z.string().min(1).max(200),
    station: z.string().max(80).optional(),
    currentStock: num.optional()
  }).passthrough(),

  inventoryUpdate: z.object({}).passthrough(),

  inventoryConsume: z.object({
    consume: num.optional(),
    quantity: num.optional(),
    received: num.optional()
  }).passthrough().refine(
    b => b.consume !== undefined || b.quantity !== undefined || b.received !== undefined,
    { message: 'one of consume/quantity/received is required' }
  ),

  inventoryTransfer: z.object({
    fromId: objectId.optional(),
    toId: objectId.optional(),
    itemName: z.string().max(200).optional(),
    quantity: num.optional()
  }).passthrough(),

  personnelCreate: z.object({
    expeditionId: objectId,
    userId: objectId,
    badgeId: z.string().min(1).max(40)
  }).passthrough(),

  personnelCheckin: z.object({
    personnelId: objectId.optional(),
    badgeId: z.string().max(40).optional(),
    status: z.string().max(40).optional(),
    location: z.string().max(120).optional(),
    lat: num.optional(),
    lng: num.optional()
  }).passthrough().refine(
    b => b.personnelId || b.badgeId,
    { message: 'personnelId or badgeId required' }
  ),

  personnelTelemetry: z.object({
    personnelId: objectId.optional(),
    badgeId: z.string().max(40).optional(),
    lat: num,
    lng: num
  }).passthrough().refine(
    b => b.personnelId || b.badgeId,
    { message: 'personnelId or badgeId required' }
  ),

  personnelUpdate: z.object({}).passthrough(),

  assetCreate: z.object({
    assetTag: z.string().min(1).max(60),
    name: z.string().min(1).max(200),
    station: z.string().max(80).optional()
  }).passthrough(),

  assetTelemetry: z.object({
    operatingHours: num.optional(),
    engineTempC: num.optional()
  }).passthrough(),

  assetUpdate: z.object({}).passthrough(),

  assetMaintenance: z.object({
    description: z.string().min(1).max(1000)
  }).passthrough(),

  incidentCreate: z.object({
    type: z.string().min(1).max(60),
    severity: z.string().max(30).optional(),
    location: z.string().min(1).max(200),
    description: z.string().min(1).max(2000)
  }).passthrough(),

  incidentStatus: z.object({
    status: z.string().min(1).max(40)
  }).passthrough(),

  incidentAction: z.object({
    description: z.string().min(1).max(2000)
  }).passthrough(),

  locationCreate: z.object({
    name: z.string().min(1).max(160),
    type: z.string().min(1).max(40)
  }).passthrough(),

  locationUpdate: z.object({
    name: z.string().min(1).max(160).optional(),
    type: z.string().min(1).max(40).optional(),
    dangerPolygon: z.array(z.array(num).length(2)).min(3).max(500).optional()
  }).passthrough(),

  sos: z.object({
    badgeId: z.string().max(40).optional(),
    message: z.string().max(1000).optional(),
    lat: num.optional(),
    lng: num.optional()
  }).passthrough(),

  simulateTelemetry: z.object({
    scenario: z.string().min(1).max(60)
  }).passthrough(),

  settingUpdate: z.object({
    value: z.union([z.string(), z.number(), z.boolean()])
  }).passthrough()
};

module.exports = { validate, schemas };
