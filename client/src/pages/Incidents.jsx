import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

const TYPES = ['Medical', 'Fire', 'VehicleEquipment', 'Communication', 'Supply', 'WeatherEnvironment', 'Personnel', 'Other'];
const SEVS = ['Low', 'Medium', 'High', 'Critical'];

export default function Incidents() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActive, setShowActive] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: 'Medical', severity: 'High', location: '', description: '' });

  const canCreate = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { setList(await api(`/api/v1/incidents${showActive ? '?active=true' : ''}`)); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [showActive]);

  const create = async (e) => {
    e.preventDefault();
    const res = await api('/api/v1/incidents', { method: 'POST', body: form });
    alert(res.autoRollCall ? `Incident created + auto roll-call: ${res.autoRollCall} people at location` : 'Incident created');
    setShow(false); setForm({ type: 'Medical', severity: 'High', location: '', description: '' }); load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Emergency Incidents</h1>
        {canCreate && <button className={btnPrimary} onClick={() => setShow(true)}>+ Report incident</button>}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowActive(true)} className={`${btnGhost} !px-3 !py-1 text-xs ${showActive ? '!border-cyan-500 !text-cyan-600' : ''}`}>Active</button>
        <button onClick={() => setShowActive(false)} className={`${btnGhost} !px-3 !py-1 text-xs ${!showActive ? '!border-cyan-500 !text-cyan-600' : ''}`}>All incl. history</button>
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
            <Field label="Location"><input className={inputCls} required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Field Camp A" /></Field>
            <Field label="Description"><input className={inputCls} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
            <button className={btnPrimary}>Create + auto roll-call</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
