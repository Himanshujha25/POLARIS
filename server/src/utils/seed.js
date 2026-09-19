const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Location = require('../models/Location');

const OFFICIAL_USERS = [
  {
    username: 'admin',
    email: 'admin@polaris.moes.gov.in',
    fullName: 'Director NCPOR (Super Admin)',
    role: 'SuperAdmin',
    station: 'Headquarters_Goa'
  },
  {
    username: 'commander',
    email: 'commander@polaris.moes.gov.in',
    fullName: 'Dr. S. K. Sharma (Expedition Commander)',
    role: 'ExpeditionManager',
    station: 'Bharati'
  },
  {
    username: 'logistics',
    email: 'logistics@polaris.moes.gov.in',
    fullName: 'Vikram Singh (Chief Logistics Officer)',
    role: 'LogisticsOfficer',
    station: 'Headquarters_Goa'
  },
  {
    username: 'inventory',
    email: 'inventory@polaris.moes.gov.in',
    fullName: 'Ananya Verma (Station Inventory Engineer)',
    role: 'InventoryOfficer',
    station: 'Maitri'
  },
  {
    username: 'emergency',
    email: 'emergency@polaris.moes.gov.in',
    fullName: 'Capt. R. Deshmukh (Emergency & SAR Commander)',
    role: 'EmergencyOfficer',
    station: 'Maitri'
  },
  {
    username: 'personnel',
    email: 'personnel@polaris.moes.gov.in',
    fullName: 'Meera Nair (Personnel & Field Safety Head)',
    role: 'PersonnelOfficer',
    station: 'Bharati'
  },
  {
    username: 'assets',
    email: 'assets@polaris.moes.gov.in',
    fullName: 'Tenzing Norbu (Chief Mechanical & Asset Engineer)',
    role: 'AssetOfficer',
    station: 'Maitri'
  }
];

// Base geography: real station coordinates (NCPOR public data) + danger zones.
// Seeded once (by name); operator can edit/extend everything from Locations page.
const BASE_LOCATIONS = [
  { name: 'Headquarters_Goa', type: 'Headquarters', region: 'India', coordinates: { lat: 15.49, lng: 73.83 } },
  { name: 'Mumbai Port', type: 'Port', region: 'India', coordinates: { lat: 18.94, lng: 72.94 } },
  { name: 'Cape Town Hub', type: 'Hub', region: 'South Africa', coordinates: { lat: -33.92, lng: 18.42 } },
  { name: 'Bharati Station', type: 'Station', region: 'Antarctica', coordinates: { lat: -69.407, lng: 76.195 } },
  { name: 'Maitri Station', type: 'Station', region: 'Antarctica', coordinates: { lat: -70.765, lng: 11.725 } },
  { name: 'Himadri Station', type: 'Station', region: 'Arctic', coordinates: { lat: 78.92, lng: 11.93 } },
  { name: 'Field Camp A', type: 'Camp', region: 'Antarctica' },
  { name: 'Field Camp B', type: 'Camp', region: 'Antarctica' },
  {
    name: 'Crevasse Field Beta (Bharati)', type: 'Temporary', region: 'Antarctica',
    dangerPolygon: [[-69.40, 76.18], [-69.38, 76.20], [-69.36, 76.19], [-69.37, 76.17]]
  },
  {
    name: 'ASPA Restricted Zone (Maitri)', type: 'Temporary', region: 'Antarctica',
    dangerPolygon: [[-70.82, 11.66], [-70.80, 11.68], [-70.78, 11.67], [-70.79, 11.65]]
  }
];

async function seedBaseLocations() {
  for (const l of BASE_LOCATIONS) {
    const existing = await Location.findOne({ name: l.name });
    if (!existing) {
      await Location.create(l);
      console.log(`[seed] Location: ${l.name}`);
    }
  }
}
async function seedDefaultUsers() {
  const hash = await bcrypt.hash('Test@123', 10);
  for (const u of OFFICIAL_USERS) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      await User.create({ ...u, passwordHash: hash });
      console.log(`[seed] Initialized official deployment account: ${u.username} (${u.role})`);
    }
  }

  // Ensure legacy compatibility for existing test suites
  const rahul = await User.findOne({ username: 'rahul' });
  if (!rahul) {
    await User.create({
      username: 'rahul',
      email: 'rahul.medic@polaris.moes.gov.in',
      fullName: 'Dr. Rahul (Field Medical Officer)',
      role: 'EmergencyOfficer',
      station: 'Maitri',
      passwordHash: hash
    });
  }
}

// Standalone runner for `npm run seed`
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    console.log('[seed] Seeding official POLARIS deployment roles...');
    await seedDefaultUsers();
    await seedBaseLocations();
    console.log('[seed] Done! All 7 PRD roles + base geography ready.');
    process.exit(0);
  }).catch(err => {
    console.error('[seed] Error seeding users:', err);
    process.exit(1);
  });
}

module.exports = { seedDefaultUsers, seedBaseLocations, OFFICIAL_USERS, BASE_LOCATIONS };
