import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold sm:text-2xl">Expeditions</h1>
        {canEdit && <button className={btnPrimary} onClick={() => setShowCreate(true)}>+ New Expedition</button>}
      </div>
      {list.length === 0 && <Empty text="No expeditions yet" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map(e => (
          <Card key={e._id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{e.expeditionCode}</p>
              <Pill value={e.status} />
            </div>
            <p className="mt-1 text-sm">{e.title}</p>
            <p className="text-xs text-slate-500">→ {e.targetStation} · quota {e.totalPersonnelQuota} · {e.cargoCapacityKg}kg</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/expeditions/${e._id}`} className={btnGhost + ' !px-3 !py-1 text-xs'}>Open dossier</Link>
              {canEdit && (
                <>
                  <button onClick={() => openEdit(e)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Edit</button>
                  <button onClick={() => { setDeleting(e._id); setError(''); }} className={btnGhost + ' !px-3 !py-1 text-xs text-red-500'}>Delete</button>
                </>
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
