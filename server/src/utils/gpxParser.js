// POLARIS Garmin / Satellite GPS GPX File Parser
// Extracts trackpoints (lat, lng, elevation, timestamps) from standard GPX XML files

function parseGPX(gpxXmlString) {
  if (!gpxXmlString || typeof gpxXmlString !== 'string') {
    throw new Error('Invalid GPX content');
  }

  const trackpoints = [];

  // Match both <trkpt ...> and <wpt ...> elements
  const ptRegex = /<(?:trkpt|wpt)\s+[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|wpt)>/gi;
  // Also handle reversed lon/lat attributes
  const ptRegexAlt = /<(?:trkpt|wpt)\s+[^>]*lon=["']([^"']+)["'][^>]*lat=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|wpt)>/gi;

  function extractInner(innerXml, lat, lng) {
    let altitudeM = null;
    let recordedAt = null;

    const eleMatch = /<ele>([^<]+)<\/ele>/i.exec(innerXml);
    if (eleMatch) {
      altitudeM = parseFloat(eleMatch[1]);
    }

    const timeMatch = /<time>([^<]+)<\/time>/i.exec(innerXml);
    if (timeMatch) {
      const parsedDate = new Date(timeMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        recordedAt = parsedDate;
      }
    }

    trackpoints.push({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      altitudeM: !isNaN(altitudeM) ? altitudeM : 0,
      recordedAt: recordedAt || new Date()
    });
  }

  let match;
  while ((match = ptRegex.exec(gpxXmlString)) !== null) {
    extractInner(match[3], match[1], match[2]);
  }

  if (trackpoints.length === 0) {
    while ((match = ptRegexAlt.exec(gpxXmlString)) !== null) {
      extractInner(match[3], match[2], match[1]);
    }
  }

  if (trackpoints.length === 0) {
    throw new Error('No valid trackpoints found in GPX file');
  }

  return trackpoints;
}

module.exports = { parseGPX };
