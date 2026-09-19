import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, CircleMarker, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Radio, Compass, Navigation, LocateFixed, Siren,
  Satellite, AlertTriangle, ShieldAlert, Crosshair, Users,
  RefreshCw, CheckCircle2, ChevronRight, Eye, Footprints, Layers
} from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, btnGhost, btnPrimary, btnDanger } from '../components/ui';
import { calculateDistanceKm, calculateBearing, distanceToPolygonMeters } from '../lib/geoUtils';
import { playRadarPing, playRadioChirp, startSiren, stopSiren } from '../lib/audio';

// Fix default marker icons for bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Controller component to smoothly pan/zoom map on demand
function MapFlyController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat && target.lng) {
      map.flyTo([target.lat, target.lng], target.zoom || 14, { duration: 1.5 });
    }
  }, [target, map]);
  return null;
}

export default function MapView() {
  const [searchParams] = useSearchParams();
  const focusBadge = searchParams.get('badge');

  const [stations, setStations] = useState([]);
  const [zones, setZones] = useState([]);
  const [station, setStation] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Focus target for smooth map navigation
  const [flyTarget, setFlyTarget] = useState(null);

  const load = async () => {
    try {
      const [mapData, persData, alertsData] = await Promise.all([
        api('/api/v1/locations/map').catch(() => ({ stations: [], zones: [] })),
        api('/api/v1/personnel/active-locations').catch(() => []),
        api('/api/v1/alerts').catch(() => [])
      ]);

      const stList = mapData.stations || [];
      setStations(stList);
      setZones(mapData.zones || []);
      setPersonnel(persData || []);
      setAlerts(alertsData || []);

      if (stList.length > 0 && !station) {
        setStation(stList[0].name);
      }

      // If badge query parameter passed, automatically locate them
      if (focusBadge && persData.length > 0) {
        const found = persData.find(p => p.badgeId === focusBadge);
        if (found && found.currentCoordinates?.lat && found.currentCoordinates?.lng) {
          setFlyTarget({ lat: found.currentCoordinates.lat, lng: found.currentCoordinates.lng, zoom: 14 });
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [focusBadge]);
  useLiveRefresh(load);

  // Detect active SOS / Deadman timeout alerts
  const activeDistress = useMemo(() => {
    const distressPersonnel = personnel.filter(p => p.currentStatus === 'SOS_Alert');
    const distressAlerts = alerts.filter(a =>
      !a.isAcknowledged && (a.type === 'DEADMAN_TIMEOUT' || a.type === 'SOS_TRIGGER')
    );
    return { personnel: distressPersonnel, alerts: distressAlerts };
  }, [personnel, alerts]);

  // User's own live GNSS position & real address
  const { user } = useAuth();
  const [myPos, setMyPos] = useState(null);
  const [myAccuracy, setMyAccuracy] = useState(null);
  const [myAddress, setMyAddress] = useState('');
  const [locatingUser, setLocatingUser] = useState(false);
  const [syncingRoster, setSyncingRoster] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [targetBadge, setTargetBadge] = useState('BHR-3');

  // Tactical streaming & geodesy
  const [continuousTracking, setContinuousTracking] = useState(false);
  const [gpsTrail, setGpsTrail] = useState([]);
  const [crevasseWarning, setCrevasseWarning] = useState(null);
  const [mapLayer, setMapLayer] = useState('dark');
  const watchRef = useRef(null);

  // Acquire user's live high-accuracy GPS position & human-readable address
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('GNSS / Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    setSyncNotice('');
    playRadioChirp();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        setMyPos({ lat, lng });
        setMyAccuracy(acc);
        setGpsTrail(prev => [...prev.slice(-30), [lat, lng]]);
        setFlyTarget({ lat, lng, zoom: 16 });

        // Reverse geocode exact device place name
        let addressStr = '';
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'User-Agent': 'POLARIS-Mission-Command/1.0' }
          });
          const data = await res.json();
          if (data && data.display_name) {
            addressStr = data.display_name;
            setMyAddress(addressStr);
          }
        } catch { /* fallback */ }

        if (!addressStr) {
          setMyAddress(`Latitude ${lat.toFixed(5)}°, Longitude ${lng.toFixed(5)}°`);
        }
      },
      (err) => {
        setLocatingUser(false);
        alert(`Failed to acquire real device GPS: ${err.message}. Please allow location access in your browser.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Continuous live stream via watchPosition
  const toggleContinuousTracking = () => {
    if (!navigator.geolocation) {
      alert('GNSS is not supported by your browser.');
      return;
    }
    if (continuousTracking) {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      setContinuousTracking(false);
      playRadioChirp();
    } else {
      playRadioChirp();
      setContinuousTracking(true);
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy);
          setMyPos({ lat, lng });
          setMyAccuracy(acc);
          setGpsTrail(prev => [...prev.slice(-40), [lat, lng]]);

          // Check crevasse proximity against danger polygons
          let nearestZone = null;
          let minMeters = Infinity;
          for (const z of zones) {
            const dist = distanceToPolygonMeters(lat, lng, z.polygon);
            if (dist < minMeters) {
              minMeters = dist;
              nearestZone = z;
            }
          }
          if (minMeters < 500 && nearestZone) {
            setCrevasseWarning({ name: nearestZone.name, distance: minMeters });
            playRadarPing();
          } else {
            setCrevasseWarning(null);
          }
        },
        (err) => {
          setContinuousTracking(false);
          alert(`Continuous tracking error: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }
  };

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  // 1-Click: Transmit real device GPS coordinates to BHR-1 or active personnel
  const handleSyncToRoster = async (badge = 'BHR-3') => {
    if (!myPos) return;
    setSyncingRoster(true);
    setSyncNotice('');
    playRadioChirp();
    try {
      await api('/api/v1/personnel/checkin', {
        method: 'POST',
        body: {
          badgeId: badge,
          status: 'FieldResearch',
          lat: myPos.lat,
          lng: myPos.lng,
          location: myAddress || `Device GPS (${myPos.lat.toFixed(4)}, ${myPos.lng.toFixed(4)})`,
          notes: `Synchronized from live operator device (GNSS Accuracy: ±${myAccuracy}m)`
        }
      });
      setSyncNotice(`✅ Transmitted! ${badge} position updated on radar to your exact device location.`);
      load();
    } catch (err) {
      alert(`Sync error: ${err.message}`);
    }
    setSyncingRoster(false);
  };

  if (loading) return <Spinner />;

  const currentStationCfg = stations.find(s => s.name === station) || stations[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl flex items-center gap-2">
            <Compass className="text-cyan-500" size={24} />
            Tactical Polar Map & Telemetry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time WGS84 GPS positioning, field personnel radar, active crevasse danger zones, and emergency distress beacons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Continuous Tracking Stream Button */}
          <button
            onClick={toggleContinuousTracking}
            className={`!px-3 !py-1.5 text-xs flex items-center gap-1.5 rounded-lg border font-semibold transition-all ${
              continuousTracking
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold animate-pulse'
                : 'border-slate-700 text-slate-300 hover:border-cyan-500'
            }`}
            title="Continuously stream live device coordinates & draw GPS trails"
          >
            <Footprints size={14} className={continuousTracking ? 'animate-bounce' : ''} />
            <span>Live Trail Stream: {continuousTracking ? 'REC ●' : 'OFF'}</span>
          </button>

          <button
            onClick={handleLocateMe}
            disabled={locatingUser}
            className={`${btnGhost} !px-3 !py-1.5 text-xs flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold hover:border-cyan-500`}
            title="Use device satellite GNSS to plot your position"
          >
            <LocateFixed size={14} className={locatingUser ? 'animate-spin text-cyan-500' : 'text-cyan-500'} />
            {locatingUser ? 'Acquiring GPS...' : '🛰️ My Live GPS'}
          </button>

          {/* Map Layer Switcher */}
          <button
            onClick={() => setMapLayer(l => l === 'dark' ? 'satellite' : 'dark')}
            className={`${btnGhost} !px-2.5 !py-1.5 text-xs flex items-center gap-1.5`}
            title="Toggle between Tactical Grid and Satellite Imagery"
          >
            <Layers size={13} />
            <span>{mapLayer === 'dark' ? 'Grid' : 'Satellite'}</span>
          </button>

          <button onClick={load} className={`${btnGhost} !px-3 !py-1.5 text-xs flex items-center gap-1.5`}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active Distress Beacon Alarm Banner */}
      {(activeDistress.personnel.length > 0 || activeDistress.alerts.length > 0) && (
        <div className="p-3.5 rounded-lg border border-red-500 bg-red-500/15 text-red-400 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <Siren size={24} className="text-red-500 animate-bounce" />
            <div>
              <p className="font-extrabold text-sm uppercase tracking-wider text-red-300">
                🚨 CRITICAL EMERGENCY DISTRESS BEACON ACTIVE
              </p>
              <p className="text-xs text-red-200/90 mt-0.5">
                {activeDistress.personnel.length > 0
                  ? `Crew member (${activeDistress.personnel.map(p => p.badgeId).join(', ')}) in SOS DISTRESS status!`
                  : `Dead-man countdown timeout triggered (${activeDistress.alerts.length} active emergency alert)!`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const targetP = activeDistress.personnel[0];
              if (targetP?.currentCoordinates?.lat) {
                setFlyTarget({ lat: targetP.currentCoordinates.lat, lng: targetP.currentCoordinates.lng, zoom: 15 });
              } else if (activeDistress.alerts[0]?.coordinates?.lat) {
                setFlyTarget({ lat: activeDistress.alerts[0].coordinates.lat, lng: activeDistress.alerts[0].coordinates.lng, zoom: 15 });
              }
            }}
            className={`${btnDanger} !py-1.5 !px-4 text-xs font-bold flex items-center gap-1.5 shadow-md`}
          >
            <Crosshair size={14} />
            Intercept / Locate Beacon
          </button>
        </div>
      )}

      {/* Crevasse Proximity Radar Alert */}
      {crevasseWarning && (
        <div className="p-3 rounded-lg border-2 border-amber-500 bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400 animate-bounce" />
            <span>
              ⚠️ RADAR PROXIMITY ALERT: {crevasseWarning.distance} meters to {crevasseWarning.name}! Halting recommended.
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/40">
            CREVASSE FIELD NEARBY
          </span>
        </div>
      )}

      {/* Live Device Location Bar */}
      {myPos && (
        <div className="p-3.5 rounded-lg border border-cyan-500 bg-cyan-950/20 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </div>
            <div>
              <div className="font-bold text-cyan-400 flex items-center gap-1.5 text-sm">
                <LocateFixed size={15} />
                Exact Device Position Identified (Accuracy: ±{myAccuracy}m)
              </div>
              <div className="text-slate-300 font-mono text-xs mt-0.5 max-w-2xl truncate" title={myAddress}>
                {myAddress || 'Location determined by GNSS'}
              </div>
              <div className="text-[11px] font-mono text-cyan-500/80 mt-0.5">
                Latitude: {myPos.lat.toFixed(6)}° • Longitude: {myPos.lng.toFixed(6)}°
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFlyTarget({ lat: myPos.lat, lng: myPos.lng, zoom: 16 })}
              className={`${btnGhost} !px-3 !py-1 text-xs text-cyan-400 hover:border-cyan-400 font-semibold`}
            >
              <Crosshair size={13} className="inline mr-1" />
              Center on Device
            </button>
            <div className="flex items-center gap-1">
              <select
                value={targetBadge}
                onChange={e => setTargetBadge(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-cyan-300 rounded px-2 py-1 font-mono font-bold"
              >
                {personnel.map(p => (
                  <option key={p.badgeId} value={p.badgeId}>{p.badgeId} ({p.currentStatus})</option>
                ))}
              </select>
              <button
                onClick={() => handleSyncToRoster(targetBadge)}
                disabled={syncingRoster}
                className={`${btnPrimary} !px-3.5 !py-1 text-xs font-bold shadow-sm flex items-center gap-1.5`}
              >
                <Satellite size={13} />
                {syncingRoster ? 'Broadcasting...' : `📡 Set ${targetBadge} to Device GPS`}
              </button>
            </div>
          </div>
        </div>
      )}

      {syncNotice && (
        <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={15} />
          {syncNotice}
        </div>
      )}

      {/* Station Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
            <Radio size={12} /> Station Hubs:
          </span>
          {stations.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setStation(s.name);
                setFlyTarget({ lat: s.lat, lng: s.lng, zoom: 13 });
              }}
              className={`${btnGhost} !px-3 !py-1 text-xs font-medium ${station === s.name ? '!border-cyan-500 !text-cyan-500 dark:!text-cyan-400 bg-cyan-500/10' : ''}`}
            >
              📍 {s.name}
            </button>
          ))}
        </div>

        {myAccuracy && (
          <div className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
            <CheckCircle2 size={12} /> Live Device Position Locked: ±{myAccuracy}m accuracy
          </div>
        )}
      </div>

      {/* Main Map + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-3">
          {!currentStationCfg ? (
            <Empty text="No mapped stations with coordinates found in database. Go to Base & Logistics -> Stations & Hubs to add station coordinates." />
          ) : (
            <Card className="overflow-hidden p-0 border border-slate-700/60 shadow-xl relative">
              <div className="h-[60vh] min-h-[420px] w-full md:h-[70vh]">
                <MapContainer
                  center={[currentStationCfg.lat, currentStationCfg.lng]}
                  zoom={12}
                  scrollWheelZoom
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapFlyController target={flyTarget} />
                  <TileLayer
                    url={
                      mapLayer === 'satellite'
                        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                    attribution="&copy; OpenStreetMap / ESRI Satellite | POLARIS Expedition Command"
                  />

                  {/* Continuous Live GPS Breadcrumbs Trail */}
                  {gpsTrail.length > 1 && (
                    <Polyline
                      positions={gpsTrail}
                      pathOptions={{ color: '#06b6d4', weight: 4, dashArray: '6, 8', opacity: 0.9 }}
                    />
                  )}

                  {/* Stations Markers */}
                  {stations.map(s => (
                    <Marker key={s.id} position={[s.lat, s.lng]}>
                      <Popup>
                        <div className="p-1 text-xs">
                          <p className="font-extrabold text-sm text-cyan-600 dark:text-cyan-400">📍 {s.name}</p>
                          <p className="text-slate-600">{s.type}</p>
                          <p className="font-mono text-[11px] text-slate-500 mt-1">
                            {s.lat.toFixed(4)}°, {s.lng.toFixed(4)}°
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Crevasse / ASPA Danger Polygons */}
                  {zones.map(z => (
                    <Polygon
                      key={z.id}
                      positions={z.polygon}
                      pathOptions={{ color: '#ef4444', fillColor: '#f43f5e', fillOpacity: 0.3, weight: 2 }}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <p className="font-bold text-red-500 flex items-center gap-1">
                            <AlertTriangle size={13} /> {z.name}
                          </p>
                          <p className="text-slate-500 text-[11px]">Geofenced Crevasse / Hazardous Zone</p>
                        </div>
                      </Popup>
                    </Polygon>
                  ))}

                  {/* Field Personnel Markers */}
                  {personnel.filter(p => p.currentCoordinates?.lat && p.currentCoordinates?.lng).map(p => {
                    const isSOS = p.currentStatus === 'SOS_Alert';
                    const isField = p.currentStatus === 'FieldResearch';

                    return (
                      <div key={p._id}>
                        {/* Outer pulsing ring for SOS */}
                        {isSOS && (
                          <CircleMarker
                            center={[p.currentCoordinates.lat, p.currentCoordinates.lng]}
                            radius={22}
                            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.25, weight: 2 }}
                          />
                        )}
                        <CircleMarker
                          center={[p.currentCoordinates.lat, p.currentCoordinates.lng]}
                          radius={isSOS ? 12 : 9}
                          pathOptions={{
                            color: isSOS ? '#ef4444' : isField ? '#06b6d4' : '#10b981',
                            fillColor: isSOS ? '#ef4444' : isField ? '#06b6d4' : '#10b981',
                            fillOpacity: 0.95,
                            weight: 2
                          }}
                        >
                          <Popup>
                            <div className="p-1 text-xs min-w-[140px]">
                              <p className="font-bold text-sm flex items-center gap-1">
                                {isSOS && <Siren size={14} className="text-red-500" />}
                                {p.badgeId}
                              </p>
                              <div className="mt-1">
                                <Pill value={p.currentStatus} />
                              </div>
                              <p className="text-slate-500 mt-1 font-medium">{p.currentLocation || p.assignedFieldZone || 'Field'}</p>
                              <p className="font-mono text-[11px] text-slate-500 mt-1">
                                Lat: {p.currentCoordinates.lat.toFixed(5)}°<br />
                                Lng: {p.currentCoordinates.lng.toFixed(5)}°
                              </p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      </div>
                    );
                  })}

                  {/* User's Current GPS Location */}
                  {myPos && (
                    <>
                      {myAccuracy && (
                        <Circle
                          center={[myPos.lat, myPos.lng]}
                          radius={myAccuracy}
                          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
                        />
                      )}
                      <CircleMarker
                        center={[myPos.lat, myPos.lng]}
                        radius={10}
                        pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 1, weight: 3 }}
                      >
                        <Popup>
                          <div className="p-1 text-xs">
                            <p className="font-bold text-blue-500 flex items-center gap-1">
                              <LocateFixed size={14} /> My Current Device Position
                            </p>
                            <p className="font-mono text-[11px] text-slate-500 mt-1">
                              Accuracy: ±{myAccuracy} meters<br />
                              Lat: {myPos.lat.toFixed(5)}°<br />
                              Lng: {myPos.lng.toFixed(5)}°
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </>
                  )}
                </MapContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Tracked Personnel & Distress Drawer */}
        <div className="flex flex-col gap-3">
          <Card className="p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Users size={14} className="text-cyan-500" />
                Tracked Personnel ({personnel.length})
              </span>
              <span className="text-[11px] font-mono text-slate-500">Live Radar</span>
            </div>

            {personnel.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No active roster deployments.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {personnel.map(p => {
                  const hasCoords = p.currentCoordinates?.lat && p.currentCoordinates?.lng;
                  const isSOS = p.currentStatus === 'SOS_Alert';

                  return (
                    <div
                      key={p._id}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                        isSOS
                          ? 'border-red-500 bg-red-500/10 animate-pulse'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-cyan-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          {isSOS && <Siren size={13} className="text-red-500" />}
                          {p.badgeId}
                        </span>
                        <Pill value={p.currentStatus} />
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between">
                        <span>{p.currentLocation || 'Base Station'}</span>
                        {hasCoords ? (
                          <span className="text-emerald-500 font-mono font-semibold">● GPS Online</span>
                        ) : (
                          <span className="text-slate-400 font-mono">○ No GPS yet</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="font-mono text-[10px] text-slate-400">
                          {hasCoords ? `${p.currentCoordinates.lat.toFixed(3)}°, ${p.currentCoordinates.lng.toFixed(3)}°` : 'No GPS yet'}
                        </span>
                        <div className="flex items-center gap-1">
                          {myPos && (
                            <button
                              onClick={() => handleSyncToRoster(p.badgeId)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center gap-1"
                              title={`Broadcast your real device GPS to ${p.badgeId}`}
                            >
                              <Satellite size={10} />
                              Sync GPS
                            </button>
                          )}
                          {hasCoords && (
                            <button
                              onClick={() => {
                                setFlyTarget({
                                  lat: p.currentCoordinates.lat,
                                  lng: p.currentCoordinates.lng,
                                  zoom: 15
                                });
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition-all flex items-center gap-1"
                            >
                              <Crosshair size={11} />
                              Locate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Map Legend */}
          <Card className="p-3 text-xs flex flex-col gap-2">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] font-mono">Tactical Legend</span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Field Research</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Station Habit</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" /> SOS Distress</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Device GNSS</span>
              <span className="col-span-2 flex items-center gap-1.5 text-rose-400 mt-1">
                <AlertTriangle size={12} /> Red Polygons: Crevasses & Danger Zones
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

