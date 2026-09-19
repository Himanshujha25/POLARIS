import { useEffect, useState } from 'react';
import { UserPlus, MapPin, Heart, Thermometer, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog, downloadCSV } from '../components/ui';

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
  const [busy, setBusy] = useState(false);

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

  const generateNextBadgeId = (expId) => {
    const targetExp = exps.find(x => x._id === expId);
    const prefix = targetExp?.expeditionCode ? targetExp.expeditionCode.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() : 'BHR';
    const existingNums = list
      .map(p => {
        const m = p.badgeId?.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    return `${prefix}-${nextNum}`;
  };

  const openDeployModal = () => {
    setError('');
    // Pick the active expedition (e.g. H1-ALPHA) or first open one
    const activeExp = exps.find(x => ['Active', 'ActiveOnStation', 'Planning', 'InTransit'].includes(x.status)) || exps[0];
    const expId = activeExp?._id || '';

    // Find deployed user IDs in this expedition
    const deployedUserIds = new Set(
      list
        .filter(p => p.expeditionId === expId && p.currentStatus !== 'Returned')
        .map(p => (typeof p.userId === 'object' ? p.userId?._id : p.userId))
    );

    // Pick first user not yet deployed
    const availableUser = users.find(u => !deployedUserIds.has(u._id)) || users[0];
    const initialBadge = generateNextBadgeId(expId);
    const initialLoc = locOptions[0] || 'Bharati Station';

    setDepForm({
      expeditionId: expId,
      userId: availableUser?._id || '',
      badgeId: initialBadge,
      roleTitle: availableUser?.role ? `${availableUser.role} Specialist` : 'Field Researcher',
      currentLocation: initialLoc
    });
    setShowDeploy(true);
  };

  const deploy = async (e) => {
    e.preventDefault();
    if (!depForm.expeditionId) {
      setError('Please select an active expedition');
      return;
    }
    if (!depForm.userId) {
      setError('Please select an officer or researcher to deploy');
      return;
    }
    if (!depForm.badgeId?.trim()) {
      setError('Badge ID is required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/v1/personnel', {
        method: 'POST',
        body: {
          ...depForm,
          badgeId: depForm.badgeId.trim().toUpperCase(),
          currentLocation: depForm.currentLocation || locOptions[0] || 'Bharati Station',
          currentStatus: 'StationHab',
          lastCheckIn: new Date().toISOString()
        }
      });
      setShowDeploy(false);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to deploy personnel to expedition');
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Personnel Movement</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{list.length} deployed · check-in from ship, station or field</p>
        </div>
        <div className="flex items-center gap-2">
          {canDeploy && (
            <button
              className={`${btnPrimary} flex items-center gap-1.5 font-semibold shadow-xs`}
              onClick={openDeployModal}
            >
              <UserPlus size={15} />
              <span>Deploy member</span>
            </button>
          )}
          <button onClick={exportCSV} className={btnGhost + ' !px-3 !py-1 text-xs'}>Export CSV</button>
        </div>
      </div>

      {/* Deployment view: kitne / kahan / kaun */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groups).map(([loc, members]) => (
          <Card key={loc} className="p-3">
            <div className="flex items-center justify-between">
              <p className="font-bold flex items-center gap-1.5">
                <MapPin size={14} className="text-cyan-500" />
                <span>{loc}</span>
              </p>
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

      {/* Movement history timeline */}
      <Card className="p-4">
        <h2 className="mb-2 font-bold">Movement history ({movements.length})</h2>
        {movements.length === 0 ? <p className="text-sm text-slate-500">No movements recorded yet</p> : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto border-l-2 border-cyan-500/40 pl-3">
            {movements.slice(0, 30).map(m => (
              <div key={m._id} className="text-sm">
                <p><b>{m.personnelId?.badgeId}</b>: {m.fromLocation || '—'} → <b>{m.toLocation}</b></p>
                <p className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Roster */}
      <Card className="p-0">
        <TableWrap>
          <table className="w-full">
            <thead>
              <tr>
                <Th>Badge</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Vitals (Pulse/Temp)</Th>
                <Th>Location</Th>
                <Th>Last check-in</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                  <Td className="font-mono text-xs font-bold">{p.badgeId}</Td>
                  <Td>{p.userId?.fullName || p.userId?.username}</Td>
                  <Td><Pill value={p.currentStatus} /></Td>
                  <Td>
                    <div className="flex flex-col text-xs leading-tight gap-1">
                      <span className="font-semibold text-rose-500 flex items-center gap-1">
                        <Heart size={10} className="shrink-0" />
                        <span>{p.vitals?.heartRate ? `${p.vitals.heartRate} bpm` : '—'}</span>
                      </span>
                      <span className={`flex items-center gap-1 ${p.vitals?.bodyTempC && p.vitals.bodyTempC < 35 ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                        <Thermometer size={10} className="shrink-0" />
                        <span>{p.vitals?.bodyTempC ? `${p.vitals.bodyTempC}°C` : '—'}</span>
                        {p.vitals?.bodyTempC && p.vitals.bodyTempC < 35 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold ml-0.5">
                            <AlertTriangle size={9} /> Low
                          </span>
                        )}
                      </span>
                    </div>
                  </Td>
                  <Td>{p.currentLocation || '—'}</Td>
                  <Td>{p.lastCheckIn ? new Date(p.lastCheckIn).toLocaleString() : '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => openCheckin(p)} className={btnGhost + ' !px-2 !py-1 text-xs'}>Check-in</button>
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
            </tbody>
          </table>
        </TableWrap>
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
        <Modal title="Deploy Member to Expedition Roster" onClose={() => !busy && setShowDeploy(false)}>
          <form onSubmit={deploy} className="flex flex-col gap-3.5 text-xs">
            <Field label="Target Expedition">
              <select
                className={inputCls}
                required
                value={depForm.expeditionId}
                onChange={e => {
                  const newExpId = e.target.value;
                  const nextBadge = generateNextBadgeId(newExpId);
                  const deployedInNew = new Set(
                    list
                      .filter(p => p.expeditionId === newExpId && p.currentStatus !== 'Returned')
                      .map(p => (typeof p.userId === 'object' ? p.userId?._id : p.userId))
                  );
                  const firstAvail = users.find(u => !deployedInNew.has(u._id)) || users[0];
                  setDepForm(prev => ({
                    ...prev,
                    expeditionId: newExpId,
                    badgeId: nextBadge,
                    userId: firstAvail?._id || prev.userId,
                    roleTitle: firstAvail?.role ? `${firstAvail.role} Specialist` : prev.roleTitle
                  }));
                }}
              >
                {exps.map(x => (
                  <option key={x._id} value={x._id}>
                    {x.expeditionCode} — {x.title} ({x.status})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Select Officer / Researcher to Deploy">
              <select
                className={inputCls}
                required
                value={depForm.userId}
                onChange={e => {
                  const selUser = users.find(u => u._id === e.target.value);
                  setDepForm(prev => ({
                    ...prev,
                    userId: e.target.value,
                    roleTitle: selUser?.role ? `${selUser.role} Specialist` : prev.roleTitle
                  }));
                }}
              >
                <option value="">— select user —</option>
                {users.map(u => {
                  const isAlreadyDeployed = list.some(
                    p => p.expeditionId === depForm.expeditionId &&
                         p.currentStatus !== 'Returned' &&
                         ((p.userId?._id || p.userId) === u._id)
                  );
                  return (
                    <option key={u._id} value={u._id} disabled={isAlreadyDeployed}>
                      {u.fullName || u.username} ({u.role}) {isAlreadyDeployed ? '— [Already Deployed]' : '— Available'}
                    </option>
                  );
                })}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Assigned Badge ID">
                <div className="flex gap-1.5">
                  <input
                    className={`${inputCls} font-mono uppercase font-bold`}
                    required
                    value={depForm.badgeId}
                    onChange={e => setDepForm({ ...depForm, badgeId: e.target.value })}
                    placeholder="BHR-5"
                  />
                  <button
                    type="button"
                    onClick={() => setDepForm(prev => ({ ...prev, badgeId: generateNextBadgeId(prev.expeditionId) }))}
                    className="px-2 py-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 text-[10px] shrink-0 font-medium"
                    title="Generate next available badge code"
                  >
                    Next
                  </button>
                </div>
              </Field>

              <Field label="Expedition Role Title">
                <input
                  className={inputCls}
                  required
                  value={depForm.roleTitle}
                  onChange={e => setDepForm({ ...depForm, roleTitle: e.target.value })}
                  placeholder="e.g. Field Geologist"
                />
              </Field>
            </div>

            <Field label="Initial Deployment Station / Habitat">
              <select
                className={inputCls}
                required
                value={depForm.currentLocation}
                onChange={e => setDepForm({ ...depForm, currentLocation: e.target.value })}
              >
                {(locOptions.length > 0 ? locOptions : ['Bharati Station', 'Maitri Station', 'Himadri Station', 'Cape Town Hub', 'Field Base Alpha']).map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>

            <ErrorNote message={error} />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeploy(false)}
                disabled={busy}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`${btnPrimary} flex items-center gap-1.5`}
              >
                <UserPlus size={14} />
                <span>{busy ? 'Deploying to Roster...' : 'Deploy Member'}</span>
              </button>
            </div>
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
    </div>
  );
}
