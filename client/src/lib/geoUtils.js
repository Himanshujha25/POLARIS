// POLARIS Tactical Geodesy & Navigation Utilities (WGS84)

// Calculate Great-Circle Distance between two coordinates in kilometers (Haversine)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate Compass Bearing from point 1 to point 2 (0-360 degrees) + 16-point Cardinal Direction
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(brng / 22.5) % 16;

  return {
    degrees: Math.round(brng),
    cardinal: cardinals[index],
    formatted: `${Math.round(brng)}° ${cardinals[index]}`
  };
}

// Distance in meters from a point [lat, lng] to nearest vertex of a danger polygon
export function distanceToPolygonMeters(lat, lng, polygon) {
  if (!polygon || polygon.length === 0) return Infinity;
  let minKm = Infinity;
  for (const pt of polygon) {
    const pLat = Array.isArray(pt) ? pt[0] : pt.lat;
    const pLng = Array.isArray(pt) ? pt[1] : pt.lng;
    const d = calculateDistanceKm(lat, lng, pLat, pLng);
    if (d < minKm) minKm = d;
  }
  return Math.round(minKm * 1000);
}
