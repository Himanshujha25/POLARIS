import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, Copy, Check, ShieldAlert } from 'lucide-react';
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
  const [triageModal, setTriageModal] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageData, setTriageData] = useState(null);
  const [copiedTriage, setCopiedTriage] = useState(false);
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

  const requestAITriage = async (e, incident) => {
    e.preventDefault();
    e.stopPropagation();
    setTriageModal(incident);
    setTriageLoading(true);
    setTriageData(null);
    try {
      const res = await api('/api/v1/ai/triage-incident', {
        method: 'POST',
        body: {
          title: incident.type,
          severity: incident.severity,
          category: incident.type,
          locationName: incident.location,
          description: incident.description
        }
      });
      setTriageData(res);
    } catch (err) {
      setTriageData({ sop: 'Triage generation notice: ' + err.message, provider: 'offline' });
    } finally {
      setTriageLoading(false);
    }
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

      {/* 4 Emergency Readiness KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Active Incidents"
          value={activeCount}
          sub="Unresolved active cases"
          trend={activeCount > 0 ? "Action" : "Clear"}
          trendType={activeCount > 0 ? "warning" : "positive"}
        />
        <StatCard
          label="Critical Distress"
          value={criticalCount}
          sub="Priority P1 events"
          trend={criticalCount > 0 ? "Urgent" : "Nominal"}
          trendType={criticalCount > 0 ? "negative" : "positive"}
        />
        <StatCard
          label="Station Responders"
          value={users.length}
          sub="Trained muster crew"
          trend="Ready"
          trendType="positive"
        />
        <StatCard
          label="Deployable Fleet"
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
          <div key={i._id} className="relative">
            <Link to={`/incidents/${i._id}`} className="block">
              <Card className={`p-3.5 hover:border-red-400 transition-all ${i.severity === 'Critical' ? 'border-red-400 dark:border-red-600' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{i.incidentCode} · {i.type} @ {i.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => requestAITriage(e, i)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition-all cursor-pointer shadow-xs"
                      title="Generate instant AI Emergency SOP with asset dispatch recommendations"
                    >
                      <Sparkles size={12} className="text-rose-600 dark:text-rose-400" />
                      <span>✦ AI SOP Triage</span>
                    </button>
                    <Pill value={i.severity} />
                    <Pill value={i.status} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{i.description}</p>
                <p className="mt-2 text-[11px] text-slate-400">By {i.reportedBy?.fullName || i.reportedBy?.username || 'Station Operator'} · {new Date(i.createdAt).toLocaleString()}</p>
              </Card>
            </Link>
          </div>
        ))}
      </div>

      {/* AI Emergency Triage SOP Modal */}
      {triageModal && (
        <Modal
          title={`🚨 AI Emergency Triage SOP: ${triageModal.incidentCode}`}
          onClose={() => setTriageModal(null)}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{triageModal.type}</span> · <span className="text-slate-500">{triageModal.location}</span>
              </div>
              <Pill value={triageModal.severity} />
            </div>

            {triageLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-slate-500">
                <Loader2 size={24} className="animate-spin text-rose-600" />
                <p>Generating Antarctic Emergency SOP with live asset dispatch recommendations...</p>
              </div>
            ) : triageData ? (
              <div className="flex flex-col gap-2">
                <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
                  {triageData.sop}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400">
                    Model: {triageData.model || 'POLARIS Emergency Heuristics'} ({triageData.provider})
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(triageData.sop);
                      setCopiedTriage(true);
                      setTimeout(() => setCopiedTriage(false), 2000);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    {copiedTriage ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedTriage ? 'Copied' : 'Copy SOP'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

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
