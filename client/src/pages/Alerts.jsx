import { useEffect, useState } from 'react';
import { Siren, FlaskConical } from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const [sos, setSos] = useState({ badgeId: '', message: '' });
  const [simBusy, setSimBusy] = useState('');

  const canAck = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([api('/api/v1/alerts/active'), api('/api/v1/personnel')]);
      setAlerts(a); setPersonnel(p);
      if (!sos.badgeId && p[0]) setSos(s => ({ ...s, badgeId: p[0].badgeId }));
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useLiveRefresh(load);

  const sendSos = async (e) => {
    e.preventDefault();
    await api('/api/v1/alerts/sos', { method: 'POST', body: { badgeId: sos.badgeId, message: sos.message } });
    setShowSos(false); setSos(s => ({ ...s, message: '' })); load();
  };

  const ack = async (id) => {
    await api(`/api/v1/alerts/${id}/acknowledge`, { method: 'PATCH' });
    load();
  };

  const simulate = async (scenario) => {
    setSimBusy(scenario);
    try {
      const res = await api('/api/v1/alerts/simulate-telemetry', { method: 'POST', body: { scenario } });
      alert(`Simulation done: ${res.alert?.title || scenario}`);
    } catch (err) { alert(err.message); }
    setSimBusy(''); load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Alerts & SOS Center</h1>
        <button onClick={() => setShowSos(true)} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">
          <Siren size={16} /> Trigger SOS
        </button>
      </div>

      <Card className="border-amber-300 p-4 dark:border-amber-700">
        <h2 className="mb-2 flex items-center gap-1 font-bold"><FlaskConical size={18} /> Mission Simulation (SIH demo)</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button disabled={!!simBusy} onClick={() => simulate('crevasse-stray')} className={btnGhost + ' text-xs'}>{simBusy === 'crevasse-stray' ? '…' : 'Simulate Crevasse Stray'}</button>
          <button disabled={!!simBusy} onClick={() => simulate('deadman-timeout')} className={btnGhost + ' text-xs'}>{simBusy === 'deadman-timeout' ? '…' : 'Simulate Dead-Man Timeout'}</button>
          <button disabled={!!simBusy} onClick={() => simulate('fuel-drop')} className={btnGhost + ' text-xs'}>{simBusy === 'fuel-drop' ? '…' : 'Drop Fuel Below Critical'}</button>
        </div>
      </Card>

      {alerts.length === 0 && <Empty text="All clear — no active alerts" />}
      <div className="flex flex-col gap-2">
        {alerts.map(a => (
          <Card key={a._id} className={`p-3 ${a.severity === 'DISASTER' || a.severity === 'CRITICAL' ? 'border-red-400 dark:border-red-600' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{a.title}</p>
              <Pill value={a.severity} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
            <p className="mt-1 text-xs text-slate-500">{a.type} · {new Date(a.createdAt).toLocaleString()}</p>
            {canAck && (
              <button onClick={() => ack(a._id)} className={btnGhost + ' mt-2 !px-3 !py-1 text-xs'}>Acknowledge & resolve</button>
            )}
          </Card>
        ))}
      </div>

      {showSos && (
        <Modal title="Trigger Emergency SOS" onClose={() => setShowSos(false)}>
          <form onSubmit={sendSos} className="flex flex-col gap-3">
            <Field label="Personnel">
              <select className={inputCls} value={sos.badgeId} onChange={e => setSos({ ...sos, badgeId: e.target.value })}>
                {personnel.map(p => <option key={p._id} value={p.badgeId}>{p.badgeId} — {p.userId?.fullName}</option>)}
              </select>
            </Field>
            <Field label="Message"><input className={inputCls} value={sos.message} onChange={e => setSos({ ...sos, message: e.target.value })} placeholder="Medical emergency at Field Camp A" /></Field>
            <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">Broadcast SOS</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
