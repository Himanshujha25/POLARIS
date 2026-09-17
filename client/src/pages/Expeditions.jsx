import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

export default function Expeditions() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ expeditionCode: '', title: '', targetStation: 'Bharati', status: 'Planning' });

  const canEdit = ['SuperAdmin', 'ExpeditionManager'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { setList(await api('/api/v1/expeditions')); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api('/api/v1/expeditions', { method: 'POST', body: form });
    setShowCreate(false);
    setForm({ expeditionCode: '', title: '', targetStation: 'Bharati', status: 'Planning' });
    load();
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
            <Link to={`/expeditions/${e._id}`} className={btnGhost + ' mt-3 inline-block !px-3 !py-1 text-xs'}>Open dossier</Link>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Modal title="New Expedition" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Expedition Code"><input className={inputCls} required value={form.expeditionCode} onChange={e => setForm({ ...form, expeditionCode: e.target.value })} placeholder="44-IAE" /></Field>
            <Field label="Title"><input className={inputCls} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Target Station">
              <select className={inputCls} value={form.targetStation} onChange={e => setForm({ ...form, targetStation: e.target.value })}>
                <option>Bharati</option><option>Maitri</option><option>Himadri</option><option>Dakshin_Gangotri</option>
              </select>
            </Field>
            <button className={btnPrimary}>Create</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
