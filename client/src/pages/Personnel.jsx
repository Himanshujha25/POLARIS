import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog, downloadCSV } from '../components/ui';

const STATUSES = ['StationHab', 'FieldResearch', 'InTransit', 'MedicalQuarantine', 'SOS_Alert', 'Returned'];

// Locations are 100% API-driven (GET /api/v1/locations). No hardcoded fallback:
// empty list means the dropdown shows an explicit empty-state, never stale names.

export default function Personnel() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [exps, setExps] = useState([]);
  const [users, setUsers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [locOptions, setLocOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkId, setCheckId] = useState(null);
  const [checkForm, setCheckForm] = useState({
    status: 'StationHab',
    location: '',
    lat: '',
    lng: '',
    heartRate: '',
    bodyTempC: '',
    expectedReturn: ''
  });
  const [showDeploy, setShowDeploy] = useState(false);
  const [depForm, setDepForm] = useState({ expeditionId: '', userId: '', badgeId: '', roleTitle: '', currentLocation: '' });
  const [error, setError] = useState('');
  const [editingRoster, setEditingRoster] = useState(null);
  const [rosterForm, setRosterForm] = useState({ roleTitle: '', assignedFieldZone: '', currentStatus: 'StationHab' });
  const [deletingRoster, setDeletingRoster] = useState(null);
  const [gpxPersonnel, setGpxPersonnel] = useState(null);
  const [gpxResult, setGpxResult] = useState(null);
  const [gpxUploading, setGpxUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleGpxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !gpxPersonnel) return;
    setGpxUploading(true);
    setGpxResult(null);
    setError('');
    try {
      const text = await file.text();
      const res = await api(`/api/v1/personnel/${gpxPersonnel._id}/upload-gpx`, {
        method: 'POST',
        body: { gpxData: text }
      });
      setGpxResult(res);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGpxUploading(false);
    }
  };

  const canDeploy = ['SuperAdmin', 'ExpeditionManager', 'PersonnelOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [p, e, m, locs] = await Promise.all([
        api('/api/v1/personnel'),
        api('/api/v1/expeditions'),
        api('/api/v1/personnel/movements'),
        api('/api/v1/locations').catch(() => [])
      ]);
      setList(p); setExps(e); setMovements(m);
      if (Array.isArray(locs) && locs.length > 0) setLocOptions(locs.map(l => l.name));
      if (!depForm.expeditionId && e[0]) setDepForm(f => ({ ...f, expeditionId: e[0]._id }));
      try { setUsers(await api('/api/v1/auth/users')); } catch { /* non-admin can't list */ }
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useLiveRefresh(load);

  // Group by location: kitne / kahan / kaun
  const groups = {};
  list.forEach(p => {
    const loc = p.currentLocation || p.assignedFieldZone || 'Unknown';
    (groups[loc] = groups[loc] || []).push(p);
  });

  const openCheckin = (p) => {
    setCheckId(p._id);
    setCheckForm({
      status: p.currentStatus,
      location: p.currentLocation || '',
      lat: p.currentCoordinates?.lat || '',
      lng: p.currentCoordinates?.lng || '',
      heartRate: p.vitals?.heartRate || '',
      bodyTempC: p.vitals?.bodyTempC || '',
      expectedReturn: p.expectedReturn ? p.expectedReturn.slice(0, 16) : ''
    });
  };

  const doCheckin = async (e) => {
    e.preventDefault();
    const p = list.find(x => x._id === checkId);
    await api('/api/v1/personnel/checkin', {
      method: 'POST',
      body: {
        badgeId: p.badgeId,
        status: checkForm.status,
        location: checkForm.location,
        ...(checkForm.lat && checkForm.lng ? { lat: Number(checkForm.lat), lng: Number(checkForm.lng) } : {}),
        ...(checkForm.heartRate ? { heartRate: Number(checkForm.heartRate) } : {}),
        ...(checkForm.bodyTempC ? { bodyTempC: Number(checkForm.bodyTempC) } : {}),
        ...(checkForm.expectedReturn ? { expectedReturn: checkForm.expectedReturn } : {})
      }
    });
    setCheckId(null); load();
  };

  const deploy = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/personnel', {
        method: 'POST',
        body: { ...depForm, currentStatus: 'StationHab', lastCheckIn: new Date().toISOString() }
      });
      setShowDeploy(false);
      setDepForm({ expeditionId: exps[0]?._id || '', userId: '', badgeId: '', roleTitle: '', currentLocation: locOptions[0] || '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const openRosterEdit = (p) => {
    setEditingRoster(p._id);
    setRosterForm({ roleTitle: p.roleTitle || '', assignedFieldZone: p.assignedFieldZone || '', currentStatus: p.currentStatus });
    setError('');
  };

  const saveRosterEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/personnel/${editingRoster}`, { method: 'PATCH', body: rosterForm });
      setEditingRoster(null); load();
    } catch (err) { setError(err.message); }
  };

  const doDeleteRoster = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/v1/personnel/${deletingRoster}`, { method: 'DELETE' });
      setDeletingRoster(null); load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const exportCSV = () => {
    downloadCSV('polaris-personnel.csv', [
      ['Badge', 'Name', 'Status', 'Location', 'Zone', 'LastCheckin'],
      ...list.map(p => [p.badgeId, p.userId?.fullName || p.userId?.username, p.currentStatus, p.currentLocation, p.assignedFieldZone, p.lastCheckIn])
    ]);
  };

  if (loading) return <Spinner />;

  const atStationCount = list.filter(p => p.currentStatus === 'StationHab').length;
  const inFieldCount = list.filter(p => p.currentStatus === 'FieldResearch').length;
  const inTransitCount = list.filter(p => p.currentStatus === 'InTransit').length;
  const hypothermiaRiskCount = list.filter(p => p.vitals?.bodyTempC && p.vitals.bodyTempC < 35).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            BASE & LOGISTICS
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Personnel Movement & Safety
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Biometric telemetry, GPS station check-ins & handheld satellite GPX trek tracklogs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canDeploy && (
            <button className={btnPrimary} onClick={() => setShowDeploy(true)}>
              + Deploy Member
            </button>
          )}
          <button onClick={exportCSV} className={btnGhost + ' !px-3 !py-2 text-xs font-semibold'}>
            Export CSV
          </button>
        </div>
      </div>

      {/* 4 Personnel KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Total Deployed Crew"
          value={list.length}
          sub="Active expedition personnel"
          trend="↑ 2"
          trendType="positive"
        />
        <StatCard
          label="Station Habitation"
          value={atStationCount}
          sub="Maitri, Bharati & Himadri"
          trend="Optimal"
          trendType="positive"
        />
        <StatCard
          label="Field Excursions"
          value={inFieldCount}
          sub="Scientific glaciology treks"
          trend="Active"
          trendType="positive"
        />
        <StatCard
          label="Hypothermia Alerts"
          value={hypothermiaRiskCount}
          sub="Body temp < 35°C alert"
          trend={hypothermiaRiskCount > 0 ? "Alert" : "Clear"}
          trendType={hypothermiaRiskCount > 0 ? "warning" : "positive"}
        />
      </div>

      {/* Deployment Location Summary Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groups).map(([loc, members]) => (
          <Card key={loc} className="p-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">📍 {loc}</p>
              <span className="rounded-full bg-cyan-600/10 px-2 py-0.5 text-xs font-bold text-cyan-600 dark:text-cyan-300">{members.length}</span>
            </div>
            <ul className="mt-1 text-sm">
              {members.map(m => (
                <li key={m._id} className="flex items-center justify-between py-0.5">
                  <span>{m.badgeId} · {m.userId?.fullName || m.userId?.username}</span>
                  <Pill value={m.currentStatus} />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {list.length === 0 && <Empty text="No personnel deployed yet — use Deploy member" />}

      {/* Active Personnel Roster Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>👥 Active Personnel Roster</span>
              <span className="text-xs font-normal text-slate-500">({list.length} members deployed)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live biometric vitals, GPS check-in status, and satellite track uploads</p>
          </div>
        </div>
        <TableWrap>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-xs uppercase font-semibold text-slate-600 dark:text-slate-300">
                <Th>Badge</Th>
                <Th>Member / Role</Th>
                <Th>Status</Th>
                <Th>Vitals (Pulse/Temp)</Th>
                <Th>Current Station/Field</Th>
                <Th>Last Check-In</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <Td className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">{p.badgeId}</Td>
                  <Td>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{p.userId?.fullName || p.userId?.username}</div>
                    <div className="text-xs text-slate-400">{p.userId?.role || 'Expedition Member'}</div>
                  </Td>
                  <Td><Pill value={p.currentStatus} /></Td>
                  <Td>
                    <div className="flex flex-col text-xs leading-tight">
                      <span className="font-semibold text-rose-500 flex items-center gap-1">
                        ❤️ {p.vitals?.heartRate ? `${p.vitals.heartRate} bpm` : '—'}
                      </span>
                      <span className={`${p.vitals?.bodyTempC && p.vitals.bodyTempC < 35 ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'} flex items-center gap-1`}>
                        🌡️ {p.vitals?.bodyTempC ? `${p.vitals.bodyTempC}°C` : '—'}
                        {p.vitals?.bodyTempC && p.vitals.bodyTempC < 35 && ' ⚠️ Hypothermia Risk'}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-xs max-w-[200px] truncate" title={p.currentLocation || '—'}>
                    📍 {p.currentLocation || '—'}
                  </Td>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">
                    {p.lastCheckIn ? new Date(p.lastCheckIn).toLocaleString() : '—'}
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button onClick={() => openCheckin(p)} className={btnGhost + ' !px-2.5 !py-1 text-xs font-medium'}>
                        📍 Check-in
                      </button>
                      <button
                        onClick={() => { setGpxPersonnel(p); setGpxResult(null); setError(''); }}
                        className={btnGhost + ' !px-2.5 !py-1 text-xs text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/30'}
                        title="Upload Garmin / Satellite handheld GPX track"
                      >
                        🛰️ GPX Trek
                      </button>
                      {canDeploy && (
                        <>
                          <button onClick={() => openRosterEdit(p)} className={btnGhost + ' !px-2 !py-1 text-xs'}>Edit</button>
                          <button onClick={() => { setDeletingRoster(p._id); setError(''); }} className={btnGhost + ' !px-2 !py-1 text-xs text-red-500'}>Remove</button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No personnel currently deployed. Click "+ Deploy member" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {/* Movement history timeline */}
      <Card className="p-4">
        <h2 className="mb-2 font-bold text-sm flex items-center justify-between">
          <span>📜 Personnel Movement & Transit History ({movements.length})</span>
        </h2>
        {movements.length === 0 ? <p className="text-sm text-slate-500">No movements recorded yet</p> : (
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto border-l-2 border-cyan-500/40 pl-3">
            {movements.slice(0, 20).map(m => (
              <div key={m._id} className="text-xs">
                <p>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{m.personnelId?.badgeId}</span>:{' '}
                  <span className="text-slate-500">{m.fromLocation || '—'}</span> → <b className="text-slate-800 dark:text-slate-200">{m.toLocation}</b>
                </p>
                <p className="text-[11px] text-slate-400">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {checkId && (
        <Modal title="Daily Field Check-in & Health Clearance" onClose={() => setCheckId(null)}>
          <form onSubmit={doCheckin} className="flex flex-col gap-3">
            <Field label="Status / Field Phase">
              <select className={inputCls} value={checkForm.status} onChange={e => setCheckForm({ ...checkForm, status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Current Location (live from Base Stations & Camps)">
              <select className={inputCls} required value={checkForm.location} onChange={e => setCheckForm({ ...checkForm, location: e.target.value })}>
                <option value="">— select —</option>
                {locOptions.map(l => <option key={l}>{l}</option>)}
              </select>
              {locOptions.length === 0 && <p className="mt-1 text-xs text-amber-500">No locations in database — create one in the Locations page first.</p>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pulse / Heart Rate (BPM)">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="e.g. 72"
                  value={checkForm.heartRate}
                  onChange={e => setCheckForm({ ...checkForm, heartRate: e.target.value })}
                />
              </Field>
              <Field label="Body Temp (°C)">
                <input
                  type="number"
                  step="0.1"
                  className={inputCls}
                  placeholder="e.g. 36.6"
                  value={checkForm.bodyTempC}
                  onChange={e => setCheckForm({ ...checkForm, bodyTempC: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lat (optional)"><input className={inputCls} value={checkForm.lat} onChange={e => setCheckForm({ ...checkForm, lat: e.target.value })} placeholder="-70.77" /></Field>
              <Field label="Lng (optional)"><input className={inputCls} value={checkForm.lng} onChange={e => setCheckForm({ ...checkForm, lng: e.target.value })} placeholder="11.73" /></Field>
            </div>
            <Field label="Expected Return to Habitat">
              <input
                type="datetime-local"
                className={inputCls}
                value={checkForm.expectedReturn}
                onChange={e => setCheckForm({ ...checkForm, expectedReturn: e.target.value })}
              />
            </Field>
            <button className={btnPrimary}>Submit Check-in & Vitals</button>
          </form>
        </Modal>
      )}

      {showDeploy && (
        <Modal title="Deploy member to expedition" onClose={() => setShowDeploy(false)}>
          <form onSubmit={deploy} className="flex flex-col gap-3">
            <Field label="Expedition">
              <select className={inputCls} value={depForm.expeditionId} onChange={e => setDepForm({ ...depForm, expeditionId: e.target.value })}>
                {exps.map(x => <option key={x._id} value={x._id}>{x.expeditionCode} — {x.title}</option>)}
              </select>
            </Field>
            <Field label="User">
              <select className={inputCls} required value={depForm.userId} onChange={e => setDepForm({ ...depForm, userId: e.target.value })}>
                <option value="">— select user —</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Badge ID"><input className={inputCls} required value={depForm.badgeId} onChange={e => setDepForm({ ...depForm, badgeId: e.target.value })} placeholder="POL-007" /></Field>
              <Field label="Role title"><input className={inputCls} value={depForm.roleTitle} onChange={e => setDepForm({ ...depForm, roleTitle: e.target.value })} placeholder="Glaciologist" /></Field>
            </div>
            <Field label="Starting location (live from Locations)">
              <select className={inputCls} required value={depForm.currentLocation} onChange={e => setDepForm({ ...depForm, currentLocation: e.target.value })}>
                <option value="">— select —</option>
                {locOptions.map(l => <option key={l}>{l}</option>)}
              </select>
              {locOptions.length === 0 && <p className="mt-1 text-xs text-amber-500">No locations in database — create one in the Locations page first.</p>}
            </Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Deploy</button>
          </form>
        </Modal>
      )}

      {editingRoster && (
        <Modal title="Edit roster entry" onClose={() => setEditingRoster(null)}>
          <form onSubmit={saveRosterEdit} className="flex flex-col gap-3">
            <Field label="Role title"><input className={inputCls} value={rosterForm.roleTitle} onChange={e => setRosterForm({ ...rosterForm, roleTitle: e.target.value })} /></Field>
            <Field label="Field zone"><input className={inputCls} value={rosterForm.assignedFieldZone} onChange={e => setRosterForm({ ...rosterForm, assignedFieldZone: e.target.value })} /></Field>
            <Field label="Status">
              <select className={inputCls} value={rosterForm.currentStatus} onChange={e => setRosterForm({ ...rosterForm, currentStatus: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}

      {deletingRoster && (
        <ConfirmDialog
          title="Remove from roster?"
          message="The roster entry is removed but movement history is kept. Recorded in audit log."
          busy={busy}
          onCancel={() => setDeletingRoster(null)}
          onConfirm={doDeleteRoster}
        />
      )}

      {/* Garmin / Satellite GPS GPX Trek Upload Modal */}
      {gpxPersonnel && (
        <Modal title={`Upload Handheld GPS Trek: ${gpxPersonnel.badgeId}`} onClose={() => setGpxPersonnel(null)}>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
              <p><b>Member:</b> {gpxPersonnel.badgeId} — {gpxPersonnel.userId?.fullName || gpxPersonnel.userId?.username}</p>
              <p><b>Current Location:</b> {gpxPersonnel.currentLocation || 'Field'}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Upload a standard <code>.gpx</code> trek file exported from Garmin, inReach, or Iridium Extreme handheld units.
                The system will automatically extract coordinates, elevation, timestamps, and scan for crevasse geofence breaches.
              </p>
            </div>

            <Field label="Select GPX Track File (.gpx)">
              <input
                type="file"
                accept=".gpx,application/gpx+xml,text/xml"
                onChange={handleGpxUpload}
                disabled={gpxUploading}
                className={inputCls}
              />
            </Field>

            {gpxUploading && (
              <div className="flex items-center gap-2 text-xs text-cyan-600">
                <Spinner /> Processing GPX trackpoints and checking danger zones...
              </div>
            )}

            {gpxResult && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs dark:text-emerald-300">
                <p className="font-bold text-emerald-800 dark:text-emerald-200">✅ GPX Trek Ingestion Complete!</p>
                <p>• {gpxResult.pointsCount} trackpoints saved to Polar GIS database.</p>
                <p>• Latest coordinates: Lat {gpxResult.latestCoordinates?.lat}, Lng {gpxResult.latestCoordinates?.lng} (Alt: {gpxResult.latestCoordinates?.altitudeM || 0}m)</p>
                {gpxResult.breaches?.length > 0 ? (
                  <p className="mt-1 font-bold text-red-600 dark:text-red-400">
                    ⚠️ ALERT: Trek traversed hazardous crevasse sectors: {gpxResult.breaches.join(', ')}
                  </p>
                ) : (
                  <p className="mt-1 text-emerald-700 dark:text-emerald-400">✓ All trek waypoints verified safe from marked crevasse fields.</p>
                )}
              </div>
            )}

            <ErrorNote message={error} />
            <button
              type="button"
              onClick={() => setGpxPersonnel(null)}
              className={btnPrimary + ' mt-1'}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
