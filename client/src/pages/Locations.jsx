import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

const TYPES = ['Station', 'Warehouse', 'Camp', 'Vessel', 'Port', 'Hub', 'Aircraft', 'Temporary', 'Headquarters'];

export default function Locations() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [resupplyId, setResupplyId] = useState(null);
  const [resupplyDate, setResupplyDate] = useState('');
  const [form, setForm] = useState({ name: '', type: 'Camp', parentId: '', region: '' });

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { setList(await api('/api/v1/locations')); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api('/api/v1/locations', { method: 'POST', body: { ...form, parentId: form.parentId || undefined } });
    setShow(false); setForm({ name: '', type: 'Camp', parentId: '', region: '' }); load();
  };

  const saveResupply = async (e) => {
    e.preventDefault();
    await api(`/api/v1/locations/${resupplyId}`, { method: 'PATCH', body: { nextResupplyDate: resupplyDate } });
    setResupplyId(null); load();
  };

  const parentName = (id) => list.find(l => l._id === (id?._id || id))?.name || '—';

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Locations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stations, camps, vessels, hubs — resupply dates drive forecasts</p>
        </div>
        {canEdit && <button className={btnPrimary} onClick={() => setShow(true)}>+ Add location</button>}
      </div>

      {list.length === 0 && <Empty />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(l => (
          <Card key={l._id} className="p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{l.name}</p>
              <Pill value={l.type} />
            </div>
            <p className="text-xs text-slate-500">Parent: {l.parentId ? parentName(l.parentId) : '—'} {l.region && `· ${l.region}`}</p>
            <p className="mt-1 text-xs text-slate-500">
              Next resupply: {l.nextResupplyDate ? new Date(l.nextResupplyDate).toLocaleDateString() : 'not set'}
            </p>
            {canEdit && (
              <button onClick={() => { setResupplyId(l._id); setResupplyDate(l.nextResupplyDate ? l.nextResupplyDate.slice(0, 10) : ''); }} className={btnGhost + ' mt-2 !px-3 !py-1 text-xs'}>
                Set resupply date
              </button>
            )}
          </Card>
        ))}
      </div>

      {show && (
        <Modal title="Add location" onClose={() => setShow(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Name"><input className={inputCls} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Field Camp A" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Parent">
                <select className={inputCls} value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                  <option value="">— none —</option>
                  {list.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Region"><input className={inputCls} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="Antarctica" /></Field>
            <button className={btnPrimary}>Create</button>
          </form>
        </Modal>
      )}

      {resupplyId && (
        <Modal title="Next resupply date" onClose={() => setResupplyId(null)}>
          <form onSubmit={saveResupply} className="flex flex-col gap-3">
            <Field label="Date"><input type="date" className={inputCls} required value={resupplyDate} onChange={e => setResupplyDate(e.target.value)} /></Field>
            <button className={btnPrimary}>Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
