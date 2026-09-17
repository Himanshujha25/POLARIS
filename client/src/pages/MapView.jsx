import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api';
import { Card, Spinner, btnGhost } from '../components/ui';

// Fix default marker icons for bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Mirrors server/src/utils/geofence.js danger zones
const ZONES = [
  { name: 'Crevasse Field Beta (Bharati)', center: [-69.385, 76.19], positions: [[-69.40, 76.18], [-69.38, 76.20], [-69.36, 76.19], [-69.37, 76.17]] },
  { name: 'ASPA Restricted Zone (Maitri)', center: [-70.80, 11.665], positions: [[-70.82, 11.66], [-70.80, 11.68], [-70.78, 11.67], [-70.79, 11.65]] }
];

const STATIONS = {
  Bharati: { center: [-69.407, 76.195], zoom: 12 },
  Maitri: { center: [-70.765, 11.725], zoom: 12 }
};

export default function MapView() {
  const [station, setStation] = useState('Bharati');
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setPersonnel(await api('/api/v1/personnel/active-locations')); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const cfg = STATIONS[station];

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Live Polar Map</h1>
        <div className="flex gap-2">
          {Object.keys(STATIONS).map(s => (
            <button key={s} onClick={() => setStation(s)} className={`${btnGhost} !px-3 !py-1 text-xs ${station === s ? '!border-cyan-500 !text-cyan-600' : ''}`}>{s}</button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="h-[55vh] min-h-[320px] w-full md:h-[65vh]">
          <MapContainer key={station} center={cfg.center} zoom={cfg.zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Marker position={cfg.center}>
              <Popup><b>{station} Station</b><br />Habitat + command</Popup>
            </Marker>
            {ZONES.map(z => (
              <Polygon key={z.name} positions={z.positions} pathOptions={{ color: 'red', fillColor: '#f43f5e', fillOpacity: 0.25 }}>
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

      <Card className="p-3 text-sm">
        <p className="font-bold">Legend</p>
        <p className="text-slate-500 dark:text-slate-400">
          <span className="text-cyan-500">●</span> field personnel · <span className="text-red-500">●</span> SOS ·
          <span className="text-red-500"> ▨</span> danger zone (crevasse / ASPA) · 📍 station
        </p>
      </Card>
    </div>
  );
}
