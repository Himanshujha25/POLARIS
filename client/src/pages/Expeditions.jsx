import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';

export default function Expeditions() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ expeditionCode: '', title: '', targetStation: 'Bharati', status: 'Planning', leaderId: '' });
  const [stationOptions, setStationOptions] = useState(['Bharati', 'Maitri', 'Himadri', 'Dakshin_Gangotri']);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = ['SuperAdmin', 'ExpeditionManager'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [e, locs] = await Promise.all([
        api('/api/v1/expeditions'),
        api('/api/v1/locations').catch(() => [])
      ]);
      setList(e);
      if (Array.isArray(locs) && locs.length > 0) {
        const stations = locs.filter(l => l.type === 'Station').map(l => l.name.replace(' Station', ''));
        if (stations.length > 0) setStationOptions(stations);
      }
      try { setUsers(await api('/api/v1/auth/users')); } catch { /* officers without access */ }
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/expeditions', { method: 'POST', body: { ...form, leaderId: form.leaderId || undefined } });
      setShowCreate(false);
      setForm({ expeditionCode: '', title: '', targetStation: stationOptions[0] || 'Bharati', status: 'Planning', leaderId: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const openEdit = (exp) => {
    setEditing(exp._id);
    setForm({ expeditionCode: exp.expeditionCode, title: exp.title, targetStation: exp.targetStation, status: exp.status, leaderId: exp.leaderId?._id || exp.leaderId || '' });
    setError('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/expeditions/${editing}`, { method: 'PATCH', body: { title: form.title, targetStation: form.targetStation, status: form.status, leaderId: form.leaderId || undefined } });
      setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const doDelete = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/v1/expeditions/${deleting}`, { method: 'DELETE' });
      setDeleting(null); load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  if (loading) return <Spinner />;

  const activeCount = list.filter(e => !['Completed', 'Cancelled', 'Decommissioned'].includes(e.status)).length;
  const plannedCount = list.filter(e => ['Draft', 'Planning', 'Ready'].includes(e.status)).length;
  const stationsCount = new Set(list.map(e => e.targetStation)).size;
  const totalQuota = list.reduce((s, e) => s + (e.totalPersonnelQuota || 35), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            OPERATIONS
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Expeditions Command Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Antarctic & Arctic expedition voyages · Real-time mission logs from central database
          </p>
        </div>

        {canEdit && (
          <button className={btnPrimary} onClick={() => setShowCreate(true)}>
            + New Expedition
          </button>
        )}
      </div>

      {/* 4 Mission KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Active Missions"
          value={activeCount}
          sub={`${plannedCount} in planning stages`}
          trend="↑ 1"
          trendType="positive"
        />
        <StatCard
          label="Planned Voyages"
          value={plannedCount}
          sub="Pre-departure staging"
          trend="—"
          trendType="neutral"
        />
        <StatCard
          label="Stations Deployed"
          value={stationsCount}
          sub="Maitri, Bharati, Himadri"
          trend="↑ 2"
          trendType="positive"
        />
        <StatCard
          label="Crew Capacity Quota"
          value={totalQuota}
          sub="Expeditionary personnel total"
          trend="Optimal"
          trendType="positive"
        />
      </div>

      {list.length === 0 && <Empty text="No expeditions yet. Click '+ New Expedition' above to register a polar mission." />}

      {/* Modern Expedition Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map(e => (
          <Card key={e._id} className="p-5 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-xl bg-blue-50 px-2.5 py-1 font-mono text-xs font-black text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30">
                  {e.expeditionCode}
                </span>
                <Pill value={e.status} />
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {e.title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">📍 Station: {e.targetStation}</span>
                <span>•</span>
                <span>❄️ Season: {e.season || '2026-27'}</span>
                <span>•</span>
                <span>👥 Quota: {e.totalPersonnelQuota || 35} crew</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <Link
                to={`/expeditions/${e._id}`}
                className={`${btnPrimary} !px-3.5 !py-1.5 text-xs flex items-center gap-1.5`}
              >
                <span>Mission Workspace</span>
                <span>→</span>
              </Link>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(e)} className={`${btnGhost} !px-2.5 !py-1.5 text-xs`}>
                    Edit
                  </button>
                  <button onClick={() => { setDeleting(e._id); setError(''); }} className={`${btnGhost} !px-2.5 !py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50`}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Modal title="New Expedition" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Expedition Code"><input className={inputCls} required value={form.expeditionCode} onChange={e => setForm({ ...form, expeditionCode: e.target.value })} placeholder="44-IAE" /></Field>
            <Field label="Title"><input className={inputCls} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Target Station (live)">
              <select className={inputCls} value={form.targetStation} onChange={e => setForm({ ...form, targetStation: e.target.value })}>
                {stationOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Expedition manager">
              <select className={inputCls} value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })}>
                <option value="">— none —</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
              </select>
            </Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Create</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit expedition" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <Field label="Title"><input className={inputCls} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Target Station (live)">
              <select className={inputCls} value={form.targetStation} onChange={e => setForm({ ...form, targetStation: e.target.value })}>
                {stationOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Expedition manager">
              <select className={inputCls} value={form.leaderId} onChange={e => setForm({ ...form, leaderId: e.target.value })}>
                <option value="">— none —</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
              </select>
            </Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete expedition?"
          message="This is blocked if personnel, cargo or requirements are linked. Deletion is recorded in the audit log."
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={doDelete}
        />
      )}
      {deleting && <ErrorNote message={error} />}
    </div>
  );
}
