import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, btnDanger } from '../components/ui';

const TYPES = ['Medical', 'Fire', 'VehicleEquipment', 'Communication', 'Supply', 'WeatherEnvironment', 'Personnel', 'Other'];
const SEVS = ['Low', 'Medium', 'High', 'Critical'];

export default function Incidents() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
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
  });

  const canCreate = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
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
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [showActive]);
  useLiveRefresh(load);

  const toggleResponder = (uid) => {
    setForm(f => ({
      ...f,
      responderIds: f.responderIds.includes(uid)
        ? f.responderIds.filter(x => x !== uid)
        : [...f.responderIds, uid]
    }));
  };

  const toggleAsset = (aid) => {
    setForm(f => ({
      ...f,
      affectedAssetIds: f.affectedAssetIds.includes(aid)
        ? f.affectedAssetIds.filter(x => x !== aid)
        : [...f.affectedAssetIds, aid]
    }));
  };

  const create = async (e) => {
    e.preventDefault();
    const res = await api('/api/v1/incidents', { method: 'POST', body: form });
    alert(res.autoRollCall ? `Incident created + auto roll-call: ${res.autoRollCall} people at location` : 'Incident created');
    setShow(false);
    setForm({ type: 'Medical', severity: 'High', location: '', description: '', responderIds: [], affectedAssetIds: [] });
    load();
  };

  if (loading) return <Spinner />;

  const activeCount = list.filter(i => !['Resolved', 'Closed'].includes(i.status)).length;
  const criticalCount = list.filter(i => ['Critical', 'Disaster', 'High'].includes(i.severity)).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            OPERATIONS & SAFETY
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Emergency Response & Incident Command
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Polar SAR search & rescue, automated station roll-call muster & medical casualty triage
          </p>
        </div>

        {canCreate && (
          <button className={btnDanger} onClick={() => setShow(true)}>
            + Report Emergency Incident
          </button>
        )}
      </div>

      {/* 4 Emergency KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Active Incidents"
          value={activeCount}
          sub="Ongoing SAR & field responses"
          trend={activeCount > 0 ? "Active" : "Clear"}
          trendType={activeCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Critical / High Severity"
          value={criticalCount}
          sub="Immediate life-safety priority"
          trend={criticalCount > 0 ? "Priority" : "Nominal"}
          trendType={criticalCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="SAR Responders Assigned"
          value={users.length}
          sub="Medical & search team ready"
          trend="Ready"
          trendType="positive"
        />
        <StatCard
          label="Rescue Vehicles Ready"
          value={assets.length}
          sub="PistenBully & snowmobiles"
          trend="Optimal"
          trendType="positive"
        />
      </div>

      {/* Active Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowActive(true)}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            showActive
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
          }`}
        >
          Active Incidents
        </button>
        <button
          onClick={() => setShowActive(false)}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            !showActive
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
          }`}
        >
          All (Including Resolved History)
        </button>
      </div>

      {list.length === 0 && <Empty text={showActive ? 'No active incidents — all clear' : 'No incidents yet'} />}
      <div className="flex flex-col gap-2">
        {list.map(i => (
          <Link key={i._id} to={`/incidents/${i._id}`}>
            <Card className={`p-3 hover:border-red-400 ${i.severity === 'Critical' ? 'border-red-400 dark:border-red-600' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">{i.incidentCode} · {i.type} @ {i.location}</p>
                <div className="flex gap-1"><Pill value={i.severity} /><Pill value={i.status} /></div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{i.description}</p>
              <p className="mt-1 text-xs text-slate-500">By {i.reportedBy?.fullName || i.reportedBy?.username} · {new Date(i.createdAt).toLocaleString()}</p>
            </Card>
          </Link>
        ))}
      </div>

      {show && (
        <Modal title="Report emergency incident" onClose={() => setShow(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Severity">
                <select className={inputCls} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVS.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
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
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleResponder(u._id)}
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
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => toggleAsset(a._id)}
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
          </form>
        </Modal>
      )}
    </div>
  );
}
