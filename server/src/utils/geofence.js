// Danger zones near Bharati (Larsemann Hills, approx coords) + Maitri (Schirmacher Oasis)
const DANGER_ZONES = [
  {
    name: 'Crevasse Field Beta (Bharati)',
    polygon: [
      [-69.40, 76.18], [-69.38, 76.20], [-69.36, 76.19], [-69.37, 76.17], [-69.40, 76.18]
    ]
  },
  {
    name: 'ASPA Restricted Zone (Maitri)',
    polygon: [
      [-70.82, 11.66], [-70.80, 11.68], [-70.78, 11.67], [-70.79, 11.65], [-70.82, 11.66]
    ]
  }
];

// polygon points are [lat, lng]
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = [polygon[i][0], polygon[i][1]];
    const [xj, yj] = [polygon[j][0], polygon[j][1]];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkGeofence(lat, lng) {
  for (const zone of DANGER_ZONES) {
    if (pointInPolygon(lat, lng, zone.polygon)) return zone.name;
  }
  return null;
}

// DB-driven zones: Location docs carrying dangerPolygon win over the
// code constants. Falls back to DANGER_ZONES only when DB has none
// (fresh database before base seeding).
let LocationModel = null;
async function getDangerZones() {
  try {
    if (!LocationModel) LocationModel = require('../models/Location');
    const docs = await LocationModel.find({ dangerPolygon: { $exists: true, $ne: [] } })
      .select('name dangerPolygon').limit(100);
    const dbZones = docs
      .filter(d => Array.isArray(d.dangerPolygon) && d.dangerPolygon.length >= 3)
      .map(d => ({ name: d.name, polygon: d.dangerPolygon }));
    return dbZones.length ? dbZones : DANGER_ZONES;
  } catch {
    return DANGER_ZONES;
  }
}

async function checkGeofenceAsync(lat, lng) {
  const zones = await getDangerZones();
  for (const zone of zones) {
    if (pointInPolygon(lat, lng, zone.polygon)) return zone.name;
  }
  return null;
}

module.exports = { DANGER_ZONES, pointInPolygon, checkGeofence, getDangerZones, checkGeofenceAsync };
