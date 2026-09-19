import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Siren, 
  ShieldAlert, 
  Users, 
  Compass, 
  Truck, 
  UserCheck, 
  CheckCircle2, 
  Plus, 
  X,
  MapPin
} from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, btnDanger } from '../components/ui';

const TYPES = ['Medical', 'Fire', 'VehicleEquipment', 'Communication', 'Supply', 'WeatherEnvironment', 'Personnel', 'Other'];
const SEVS = ['Low', 'Medium', 'High', 'Critical'];

const DEFAULT_LOCATIONS = [
  'Bharati Station',
  'Maitri Station',
  'Himadri Station (Svalbard)',
  'Larsemann Hills Nunatak',
  'Schirmacher Oasis Field Camp',
  'Dakshin Gangotri Ice Shelf',
  'Priority Traverse Zone Alpha',
  'Custom Coordinates / Other'
];

export default function Incidents() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
<<<<<<< HEAD
  const [exps, setExps] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allAssets, setAllAssets] = useState([]);
  const [allPersonnel, setAllPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [show, setShow] = useState(false);

  const [form, setForm] = useState({
    expeditionId: '',
    type: 'Medical',
    severity: 'High',
    location: 'Bharati Station',
    customLocation: '',
    description: '',
    responderIds: [],
    affectedAssetIds: [],
    affectedPersonnelIds: []
=======
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    type: 'Medical',
    severity: 'High',
    location: '',
    description: '',
    responderIds: [],
    affectedAssetIds: []
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
  });

  const canCreate = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
<<<<<<< HEAD
    try {
      const [incidents, expeditions, u, assets, personnel] = await Promise.all([
        api(`/api/v1/incidents${showActive ? '?active=true' : ''}`),
        api('/api/v1/expeditions').catch(() => []),
        api('/api/v1/auth/users').catch(() => []),
        api('/api/v1/assets').catch(() => []),
        api('/api/v1/personnel').catch(() => [])
      ]);
      setList(incidents || []);
      setExps(expeditions || []);
      setAllUsers(Array.isArray(u) ? u : []);
      setAllAssets(Array.isArray(assets) ? assets : []);
      setAllPersonnel(Array.isArray(personnel) ? personnel : []);

      if (expeditions?.length > 0 && !form.expeditionId) {
        setForm(f => ({ ...f, expeditionId: expeditions[0]._id }));
      }
=======
    setLoading(true);
    try {
      const [incList, uList, aList, locList] = await Promise.all([
        api(`/api/v1/incidents${showActive ? '?active=true' : ''}`),
        api('/api/v1/auth/users').catch(() => []),
        api('/api/v1/assets').catch(() => []),
        api('/api/v1/locations').catch(() => [])
      ]);
      setList(incList);
      setUsers(Array.isArray(uList) ? uList : []);
      setAssets(Array.isArray(aList) ? aList : []);
      setLocations(Array.isArray(locList) ? locList.map(l => l.name) : []);
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [showActive]);
  useLiveRefresh(load);

  const toggleResponder = (uid) => {
    setForm(f => ({
      ...f,
      responderIds: f.responderIds.includes(uid)
<<<<<<< HEAD
        ? f.responderIds.filter(id => id !== uid)
=======
        ? f.responderIds.filter(x => x !== uid)
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
        : [...f.responderIds, uid]
    }));
  };

  const toggleAsset = (aid) => {
    setForm(f => ({
      ...f,
      affectedAssetIds: f.affectedAssetIds.includes(aid)
<<<<<<< HEAD
        ? f.affectedAssetIds.filter(id => id !== aid)
=======
        ? f.affectedAssetIds.filter(x => x !== aid)
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
        : [...f.affectedAssetIds, aid]
    }));
  };

<<<<<<< HEAD
  const togglePersonnel = (pid) => {
    setForm(f => ({
      ...f,
      affectedPersonnelIds: f.affectedPersonnelIds.includes(pid)
        ? f.affectedPersonnelIds.filter(id => id !== pid)
        : [...f.affectedPersonnelIds, pid]
    }));
  };

  const create = async (e) => {
    e.preventDefault();
    const finalLocation = form.location === 'Custom Coordinates / Other'
      ? form.customLocation.trim() || 'Unspecified Remote Field Site'
      : form.location;

    const payload = {
      expeditionId: form.expeditionId || (exps[0] ? exps[0]._id : undefined),
      type: form.type,
      severity: form.severity,
      location: finalLocation,
      description: form.description,
      responderIds: form.responderIds,
      affectedAssetIds: form.affectedAssetIds,
      affectedPersonnelIds: form.affectedPersonnelIds
    };

    try {
      const res = await api('/api/v1/incidents', { method: 'POST', body: payload });
      alert(res.autoRollCall 
        ? `Incident ${res.incident?.incidentCode || ''} created + auto roll-call: ${res.autoRollCall} personnel logged` 
        : 'Emergency incident created and alert sounded across polar network');
      setShow(false);
      setForm({
        expeditionId: exps[0]?._id || '',
        type: 'Medical',
        severity: 'High',
        location: 'Bharati Station',
        customLocation: '',
        description: '',
        responderIds: [],
        affectedAssetIds: [],
        affectedPersonnelIds: []
      });
      load();
    } catch (err) {
      alert('Error creating incident: ' + (err.message || 'Server error'));
    }
=======
  const create = async (e) => {
    e.preventDefault();
    const res = await api('/api/v1/incidents', { method: 'POST', body: form });
    alert(res.autoRollCall ? `Incident created + auto roll-call: ${res.autoRollCall} people at location` : 'Incident created');
    setShow(false);
    setForm({ type: 'Medical', severity: 'High', location: '', description: '', responderIds: [], affectedAssetIds: [] });
    load();
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl flex items-center gap-2">
            <Siren className="text-rose-500" size={24} />
            <span>Emergency SAR Incidents & Distress Log</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time incident response muster, resource mobilization, and distress containment under NCPOR safety protocol.
          </p>
        </div>

        {canCreate && (
          <button 
            type="button"
            className={`${btnDanger} flex items-center gap-1.5 shadow-sm font-bold text-xs !py-2 !px-3.5`}
            onClick={() => setShow(true)}
          >
            <AlertTriangle size={15} />
            <span>+ Report Emergency Incident</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setShowActive(true)} 
          className={`${btnGhost} !px-3 !py-1 text-xs ${showActive ? '!border-cyan-500 !text-cyan-600 font-bold bg-cyan-50/40 dark:bg-cyan-950/20' : ''}`}
        >
          Active Distress ({list.filter(i => !['Resolved', 'Closed'].includes(i.status)).length})
        </button>
        <button 
          onClick={() => setShowActive(false)} 
          className={`${btnGhost} !px-3 !py-1 text-xs ${!showActive ? '!border-cyan-500 !text-cyan-600 font-bold bg-cyan-50/40 dark:bg-cyan-950/20' : ''}`}
        >
          All Expeditions History ({list.length})
        </button>
      </div>

      {list.length === 0 && <Empty text={showActive ? 'No active incidents — all polar stations clear' : 'No incident logs recorded'} />}

      {/* Incident List */}
      <div className="flex flex-col gap-2.5">
        {list.map(i => {
          const isCritical = i.severity === 'Critical';
          const respondersCount = i.responderIds?.length || 0;
          const assetsCount = i.affectedAssetIds?.length || 0;
          const casualtiesCount = i.affectedPersonnelIds?.length || 0;

          return (
            <Link key={i._id} to={`/incidents/${i._id}`}>
              <Card className={`p-3.5 hover:border-red-400 transition-all ${isCritical ? 'border-red-500/80 bg-red-500/5' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">{i.incidentCode}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{i.type}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <MapPin size={12} className="text-cyan-500" />
                      {i.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Pill value={i.severity} />
                    <Pill value={i.status} />
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {i.description || 'No detailed distress notes registered.'}
                </p>

                {/* Mobilized Resources Badges */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span>Logged by <b>{i.reportedBy?.fullName || i.reportedBy?.username || 'Station Operator'}</b> · {new Date(i.createdAt).toLocaleString()}</span>

                  <div className="ml-auto flex flex-wrap items-center gap-2 font-mono">
                    {respondersCount > 0 && (
                      <span className="rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 border border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                        <UserCheck size={11} /> {respondersCount} Responders
                      </span>
                    )}
                    {assetsCount > 0 && (
                      <span className="rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Truck size={11} /> {assetsCount} Vehicles
                      </span>
                    )}
                    {casualtiesCount > 0 && (
                      <span className="rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <Users size={11} /> {casualtiesCount} Personnel
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Report Incident Modal with Direct Pickers */}
      {show && (
        <Modal title="Report Emergency Incident & Mobilize SAR" onClose={() => setShow(false)}>
          <form onSubmit={create} className="flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Field label="Expedition">
                <select 
                  className={inputCls} 
                  value={form.expeditionId} 
                  onChange={e => setForm({ ...form, expeditionId: e.target.value })}
                >
                  {exps.map(x => (
                    <option key={x._id} value={x._id}>{x.expeditionCode} ({x.targetStation})</option>
                  ))}
                </select>
              </Field>

              <Field label="Incident Classification">
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Severity Level">
                <select className={inputCls} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
<<<<<<< HEAD

            {/* Direct Location Picker */}
            <div className="flex flex-col gap-1.5">
              <Field label="Location / Station / Field Sector">
                <select 
                  className={inputCls} 
                  value={form.location} 
                  onChange={e => setForm({ ...form, location: e.target.value })}
                >
                  {DEFAULT_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </Field>

              {form.location === 'Custom Coordinates / Other' && (
                <input
                  className={inputCls}
                  required
                  placeholder="e.g. 69°24'S, 76°11'E — Larsemann Ridge Crevasse Zone"
                  value={form.customLocation}
                  onChange={e => setForm({ ...form, customLocation: e.target.value })}
                />
              )}
            </div>

            <Field label="Distress Description / Nature of Hazard">
              <textarea
                className={inputCls + ' resize-none'}
                rows={2}
                required
                placeholder="Brief summary of event: snowcat engine fire, missing scientist during whiteout, crevasse fall..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Field>

            {/* DIRECT PICKER 1: Mobilized Responders */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-cyan-500" />
                  <span>Mobilize Responders ({form.responderIds.length} Selected)</span>
                </span>
                <span className="text-[10px] text-slate-400">Click chips to assign</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allUsers.map(u => {
                  const isSelected = form.responderIds.includes(u._id);
                  return (
=======
            <Field label="Location (Base Station / Field Camp)">
              <div className="flex flex-col gap-1.5">
                {locations.length > 0 && (
                  <select
                    className={inputCls}
                    value={locations.includes(form.location) ? form.location : ''}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  >
                    <option value="">— select from known bases/stations —</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
                <input
                  className={inputCls}
                  required
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="Or enter coordinates/field sector: e.g. Crevasse Zone East"
                />
              </div>
            </Field>

            <Field label="Description & Nature of Hazard">
              <textarea
                className={inputCls}
                rows={2}
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe injuries, vehicle status, blizzard conditions..."
              />
            </Field>

            {users.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign Immediate Responders ({form.responderIds.length} selected):
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  {users.map(u => (
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleResponder(u._id)}
<<<<<<< HEAD
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={12} className="text-cyan-500" /> : <Plus size={12} />}
                      <span>{u.fullName || u.username}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({u.role})</span>
                    </button>
                  );
                })}
                {allUsers.length === 0 && <p className="text-xs text-slate-400 italic">No operators found.</p>}
              </div>
            </div>

            {/* DIRECT PICKER 2: Dispatched Rescue Assets */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Truck size={14} className="text-amber-500" />
                  <span>Dispatch Rescue Assets / Vehicles ({form.affectedAssetIds.length} Selected)</span>
                </span>
                <span className="text-[10px] text-slate-400">Click chips to attach</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allAssets.map(a => {
                  const isSelected = form.affectedAssetIds.includes(a._id);
                  return (
=======
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        form.responderIds.includes(u._id)
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {form.responderIds.includes(u._id) ? '✓ ' : '+ '}{u.fullName} ({u.role})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {assets.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Deploy Rescue Vehicles & Machinery ({form.affectedAssetIds.length} selected):
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                  {assets.map(a => (
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => toggleAsset(a._id)}
<<<<<<< HEAD
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={12} className="text-amber-500" /> : <Plus size={12} />}
                      <span className="font-mono">{a.assetTag}</span>
                      <span>{a.name}</span>
                      <span className="text-[10px] text-slate-400">({a.condition})</span>
                    </button>
                  );
                })}
                {allAssets.length === 0 && <p className="text-xs text-slate-400 italic">No assets registered.</p>}
              </div>
            </div>

            {/* DIRECT PICKER 3: Affected Personnel / Casualties */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users size={14} className="text-rose-500" />
                  <span>Affected Crew / Casualties ({form.affectedPersonnelIds.length} Selected)</span>
                </span>
                <span className="text-[10px] text-slate-400">Auto roll-call if none picked</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allPersonnel.map(p => {
                  const isSelected = form.affectedPersonnelIds.includes(p._id);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => togglePersonnel(p._id)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={12} className="text-rose-500" /> : <Plus size={12} />}
                      <span className="font-mono font-bold">{p.badgeId}</span>
                      <span>{p.userId?.fullName || p.currentLocation || 'Field Member'}</span>
                    </button>
                  );
                })}
                {allPersonnel.length === 0 && <p className="text-xs text-slate-400 italic">No personnel deployed.</p>}
              </div>
            </div>

            <button type="submit" className={`${btnDanger} w-full py-2 font-bold mt-1 text-xs uppercase tracking-wider`}>
              Transmit Emergency Distress & Activate Roll-Call
            </button>
=======
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        form.affectedAssetIds.includes(a._id)
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {form.affectedAssetIds.includes(a._id) ? '✓ ' : '+ '}{a.assetTag} · {a.name} ({a.condition})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className={btnPrimary}>Create Emergency Incident + Auto Roll-Call</button>
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
          </form>
        </Modal>
      )}
    </div>
  );
}
