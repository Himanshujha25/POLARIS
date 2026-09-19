require('dotenv').config();
const connectDB = require('../config/db');
const Expedition = require('../models/Expedition');
const Personnel = require('../models/Personnel');
const Cargo = require('../models/Cargo');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Incident = require('../models/Incident');
const IncidentAction = require('../models/IncidentAction');
const Requirement = require('../models/Requirement');
const User = require('../models/User');
const Location = require('../models/Location');

async function run() {
  await connectDB();
  console.log('Connected to DB for dynamic data normalization...');

  // 1. Remove all smoke test dummy expeditions and their artifacts
  const testExps = await Expedition.find({ expeditionCode: /^TEST-/i });
  const testExpIds = testExps.map(e => e._id);
  if (testExpIds.length > 0) {
    await Promise.all([
      Requirement.deleteMany({ expeditionId: { $in: testExpIds } }),
      Personnel.deleteMany({ expeditionId: { $in: testExpIds } }),
      Cargo.deleteMany({ expeditionId: { $in: testExpIds } }),
      Incident.deleteMany({ expeditionId: { $in: testExpIds } }),
      Expedition.deleteMany({ _id: { $in: testExpIds } })
    ]);
    console.log(`Cleaned up ${testExpIds.length} smoke test expeditions and associated artifacts.`);
  }

  // Remove test inventory like 'Smoke Rations'
  await Inventory.deleteMany({ itemName: /Smoke/i });

  // 2. Get official users
  const commander = await User.findOne({ role: 'ExpeditionManager' }) || await User.findOne({ username: 'admin' });
  const doctor = await User.findOne({ username: 'rahul' }) || await User.findOne({ role: 'EmergencyOfficer' }) || commander;
  const engineer = await User.findOne({ username: 'assets' }) || commander;
  const inventoryOfficer = await User.findOne({ username: 'inventory' }) || commander;

  // 3. Ensure official real expeditions exist
  let expBhr = await Expedition.findOne({ expeditionCode: '44-ISEA-BHR' });
  if (!expBhr) {
    expBhr = await Expedition.create({
      expeditionCode: '44-ISEA-BHR',
      title: '44th Indian Scientific Expedition to Antarctica (Bharati Station)',
      targetStation: 'Bharati',
      leaderId: commander._id,
      season: 'Summer_2026_27',
      startDate: new Date('2026-11-15'),
      endDate: new Date('2027-12-20'),
      totalPersonnelQuota: 38,
      status: 'Active',
      cargoCapacityKg: 25000
    });
    console.log('Created official expedition: 44-ISEA-BHR');
  }

  let expMtr = await Expedition.findOne({ expeditionCode: '44-ISEA-MTR' });
  if (!expMtr) {
    expMtr = await Expedition.create({
      expeditionCode: '44-ISEA-MTR',
      title: '44th Indian Scientific Expedition to Antarctica (Maitri Station)',
      targetStation: 'Maitri',
      leaderId: commander._id,
      season: 'Winter_2027',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-11-30'),
      totalPersonnelQuota: 28,
      status: 'InTransit',
      cargoCapacityKg: 20000
    });
    console.log('Created official expedition: 44-ISEA-MTR');
  }

  // 4. Ensure Real Requirements for Bharati & Maitri
  const reqs = [
    { expeditionId: expBhr._id, item: 'Arctic Grade HSD Polar Diesel (-50°C)', requiredQty: 95000, receivedQty: 82000, unit: 'Liters', category: 'HazardousFuel' },
    { expeditionId: expBhr._id, item: 'Caloric Freeze-Dried Rations (3,800 kcal)', requiredQty: 12000, receivedQty: 12000, unit: 'Units', category: 'Provisions' },
    { expeditionId: expBhr._id, item: 'Medical Oxygen Cylinders (47L / 200 Bar)', requiredQty: 24, receivedQty: 24, unit: 'Cylinders', category: 'MedicalLifeSupport' },
    { expeditionId: expBhr._id, item: 'Snowcat Hydraulic Oil & Track Spares', requiredQty: 50, receivedQty: 38, unit: 'Units', category: 'HeavySpares' },
    { expeditionId: expMtr._id, item: 'Aviation Turbine Fuel (Jet A-1 / ATF)', requiredQty: 45000, receivedQty: 45000, unit: 'Liters', category: 'HazardousFuel' },
    { expeditionId: expMtr._id, item: 'Emergency Survival Field Rations Packets', requiredQty: 8500, receivedQty: 7200, unit: 'Units', category: 'Provisions' }
  ];

  for (const r of reqs) {
    const exists = await Requirement.findOne({ expeditionId: r.expeditionId, item: r.item });
    if (!exists) await Requirement.create(r);
  }

  // 5. Ensure Real Station Bunker Inventory (Fuel, Rations, Oxygen, Water)
  const stationInventories = [
    { itemName: 'Arctic Grade Polar Diesel (HSD -50°C)', station: 'Bharati', category: 'Fuel', currentStock: 74200, safetyThreshold: 20000, unit: 'Liters' },
    { itemName: 'Aviation Turbine Fuel (ATF / Jet A-1)', station: 'Bharati', category: 'Fuel', currentStock: 28500, safetyThreshold: 10000, unit: 'Liters' },
    { itemName: 'Freeze-Dried Nutrient Rations', station: 'Bharati', category: 'FoodRations', currentStock: 14600, safetyThreshold: 5000, unit: 'Units' },
    { itemName: 'Medical High-Pressure Oxygen Cylinders', station: 'Bharati', category: 'Medical', currentStock: 22, safetyThreshold: 8, unit: 'Cylinders' },
    { itemName: 'Desalinated Potable Water Reserve', station: 'Bharati', category: 'FoodRations', currentStock: 48000, safetyThreshold: 15000, unit: 'Liters' },

    { itemName: 'Arctic Grade Polar Diesel (HSD -50°C)', station: 'Maitri', category: 'Fuel', currentStock: 61800, safetyThreshold: 18000, unit: 'Liters' },
    { itemName: 'Freeze-Dried Nutrient Rations', station: 'Maitri', category: 'FoodRations', currentStock: 11200, safetyThreshold: 4000, unit: 'Units' },
    { itemName: 'Medical High-Pressure Oxygen Cylinders', station: 'Maitri', category: 'Medical', currentStock: 16, safetyThreshold: 6, unit: 'Cylinders' }
  ];

  for (const inv of stationInventories) {
    const exists = await Inventory.findOne({ itemName: inv.itemName, station: inv.station });
    if (!exists) {
      await Inventory.create(inv);
    } else {
      exists.currentStock = inv.currentStock;
      exists.safetyThreshold = inv.safetyThreshold;
      exists.unit = inv.unit;
      await exists.save();
    }
  }

  // 6. Ensure Real Cargo with ISO Containers & Tamper Seals
  const cargosData = [
    {
      trackingNumber: 'CRG-2027-BHR-001',
      expeditionId: expBhr._id,
      title: 'Winter Life Support & Caloric Ration Consignment',
      category: 'Provisions',
      weightKg: 18500,
      containerNumber: 'MSCU-7294012',
      sealNumber: 'IN-CUS-882194',
      containerType: '20ft_Standard',
      tareWeightKg: 2200,
      isHazmat: false,
      currentNode: 'Bharati_Station',
      currentLocation: 'Bharati Station Supply Bunker',
      status: 'DeliveredStation',
      items: [
        { name: 'Freeze Dried Rations Packets', quantity: 8000, unit: 'Units' },
        { name: 'Vitamin & Caloric Supplements', quantity: 450, unit: 'Units' }
      ]
    },
    {
      trackingNumber: 'CRG-2027-BHR-002',
      expeditionId: expBhr._id,
      title: 'Arctic Grade High Speed Diesel Fuel ISO Tank',
      category: 'HazardousFuel',
      weightKg: 24000,
      containerNumber: 'TNKU-9018241',
      sealNumber: 'IN-CUS-774012',
      containerType: 'Fuel_ISO_Tank',
      tareWeightKg: 3600,
      isHazmat: true,
      currentNode: 'Bharati_Station',
      currentLocation: 'Main Fuel Tank Farm',
      status: 'DeliveredStation',
      items: [
        { name: 'Polar Grade High Speed Diesel', quantity: 24000, unit: 'Liters' }
      ]
    },
    {
      trackingNumber: 'CRG-2027-BHR-003',
      expeditionId: expBhr._id,
      title: 'Laser Spectrometry & Glaciology Radar Spares',
      category: 'ScientificInstruments',
      weightKg: 3800,
      containerNumber: 'BHRU-3301948',
      sealNumber: 'IN-CUS-993021',
      containerType: '20ft_Reefer_Heated',
      tareWeightKg: 2850,
      isHazmat: false,
      currentNode: 'Research_Vessel',
      currentLocation: 'MV Vasily Golovnin Hold #3',
      status: 'InTransit',
      items: [
        { name: 'Ice Penetrating Radar Transceiver', quantity: 2, unit: 'Units' },
        { name: 'Cold-Climate Solar Inverters', quantity: 8, unit: 'Units' }
      ]
    }
  ];

  for (const c of cargosData) {
    const exists = await Cargo.findOne({ trackingNumber: c.trackingNumber });
    if (!exists) await Cargo.create(c);
  }

  // 7. Ensure Real Incident with Actions in Database
  let inc = await Incident.findOne({ incidentCode: 'INC-2027-BHR-01' });
  if (!inc) {
    inc = await Incident.create({
      incidentCode: 'INC-2027-BHR-01',
      expeditionId: expBhr._id,
      type: 'WeatherEnvironment',
      severity: 'Critical',
      location: 'Larsemann Hills Nunatak Sector 4',
      reportedBy: commander._id,
      responderIds: [commander._id, doctor._id],
      description: 'Severe Category-3 Blizzard with sudden whiteout during glaciology traverse. Convoy safely anchored at Nunatak shelter with tether lines secured.',
      status: 'UnderControl',
      requiredResources: 'Tracked Snowcat standby, emergency high-frequency sat-link monitoring.'
    });

    await IncidentAction.create({
      incidentId: inc._id,
      actionType: 'Report',
      description: 'Whiteout alarm raised by lead traverse vehicle. Convoy ordered to stop immediately and link safety tethers.',
      createdBy: commander._id
    });
    await IncidentAction.create({
      incidentId: inc._id,
      actionType: 'ResponderAssigned',
      description: 'Station Commander and Medical Officer mobilized into SAR emergency cell watch.',
      createdBy: commander._id
    });
    await IncidentAction.create({
      incidentId: inc._id,
      actionType: 'Action',
      description: 'All 4 traverse crew accounted for inside insulated shelter. Engine heaters operating on auxiliary generator.',
      createdBy: commander._id
    });
    console.log('Created real incident and dynamic actions: INC-2027-BHR-01');
  }

  console.log('Database normalization complete! All test data cleaned, real operational data active.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error normalizing data:', err);
  process.exit(1);
});
