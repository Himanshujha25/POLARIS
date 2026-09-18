const bcrypt = require('bcryptjs');
const User = require('../models/User');

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
    console.log('[seed] Done! All 7 PRD roles ready for deployment.');
    process.exit(0);
  }).catch(err => {
    console.error('[seed] Error seeding users:', err);
    process.exit(1);
  });
}

module.exports = { seedDefaultUsers, OFFICIAL_USERS };
