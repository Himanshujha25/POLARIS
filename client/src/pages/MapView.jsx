import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';
import { Card, Spinner, Empty, btnGhost } from '../components/ui';

// Fix default marker icons for bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// 100% DB-driven geography (GET /api/v1/locations/map). No hardcoded
// station coordinates or danger polygons: empty state tells the operator
// exactly what to create in the Locations page.
export default function MapView() {
  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]);
  const [station, setStation] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const map = await api('/api/v1/locations/map');
        setStations(map.stations || []);
        setZones(map.zones || []);
        if ((map.stations || []).length > 0) {
          setStation(s => s || map.stations[0].name);
        }
      } catch { /* empty state below explains */ }
      try { setPersonnel(await api('/api/v1/personnel/active-locations')); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const cfg = stations.find(s => s.name === station);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Live Polar Map</h1>
        <div className="flex flex-wrap gap-2">
          {stations.map(s => (
            <button key={s.id} onClick={() => setStation(s.name)} className={`${btnGhost} !px-3 !py-1 text-xs ${station === s.name ? '!border-cyan-500 !text-cyan-600' : ''}`}>{s.name}</button>
          ))}
        </div>
      </div>

      {!cfg ? (
        <Empty text="No mapped stations yet — add a Location with latitude/longitude in the Locations page." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="h-[55vh] min-h-[320px] w-full md:h-[65vh]">
            <MapContainer key={cfg.name} center={[cfg.lat, cfg.lng]} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              {stations.map(s => (
                <Marker key={s.id} position={[s.lat, s.lng]}>
                  <Popup><b>{s.name}</b><br />{s.type}</Popup>
                </Marker>
              ))}
              {zones.map(z => (
                <Polygon key={z.id} positions={z.polygon} pathOptions={{ color: 'red', fillColor: '#f43f5e', fillOpacity: 0.25 }}>
                  <Popup><b>⚠️ {z.name}</b></Popup>
                </Polygon>
              ))}
              {personnel.filter(p => p.currentCoordinates?.lat).map(p => (
                <CircleMarker
                  key={p._id}
                  center={[p.currentCoordinates.lat, p.currentCoordinates.lng]}
                  radius={9}
                  pathOptions={{ color: p.currentStatus === 'SOS_Alert' ? 'red' : '#06b6d4', fillOpacity: 0.9 }}
                >
                  <Popup><b>{p.badgeId}</b><br />{p.currentStatus}<br />{p.assignedFieldZone || ''}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>
      )}

      <Card className="p-3 text-sm">
        <p className="font-bold">Legend</p>
        <p className="text-slate-500 dark:text-slate-400">
          <span className="text-cyan-500">●</span> field personnel · <span className="text-red-500">●</span> SOS ·
          <span className="text-red-500"> ▨</span> danger zone (crevasse / ASPA) · 📍 station · {zones.length} zone(s) live from database
        </p>
      </Card>
    </div>
  );
}
