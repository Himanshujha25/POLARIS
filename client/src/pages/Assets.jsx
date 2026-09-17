import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

export default function Assets() {
  const { user } = useAuth();
  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'AssetOfficer'].includes(user?.role);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teleId, setTeleId] = useState(null);
  const [hours, setHours] = useState('');
  const [maintId, setMaintId] = useState(null);
  const [desc, setDesc] = useState('');

  const load = async () => {
    setLoading(true);
    try { setList(await api('/api/v1/assets')); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveTele = async (e) => {
    e.preventDefault();
    await api(`/api/v1/assets/${teleId}/telemetry`, { method: 'PATCH', body: { operatingHours: Number(hours) } });
    setTeleId(null); load();
  };

  const saveMaint = async (e) => {
    e.preventDefault();
    await api(`/api/v1/assets/${maintId}/maintenance`, { method: 'POST', body: { description: desc, partsUsed: [] } });
    setMaintId(null); setDesc(''); load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold sm:text-2xl">Asset Health & Telematics</h1>
      {list.length === 0 && <Empty />}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map(a => (
          <Card key={a._id} className="p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{a.assetTag} · {a.name}</p>
              <Pill value={a.condition} />
            </div>
            <p className="text-xs text-slate-500">{a.station} · {a.type}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{a.operatingHours}/{a.maxHoursBeforeService} hrs</span>
                <span>{Math.max(0, a.maxHoursBeforeService - a.operatingHours)} hrs to service</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (a.operatingHours / a.maxHoursBeforeService) * 100)}%` }} />
              </div>
            </div>
            {a.telemetry && (
              <p className="mt-1 text-xs text-slate-500">
                Eng {a.telemetry.engineTempC ?? '—'}°C · Fuel {a.telemetry.fuelLevelPercent ?? '—'}% · Oil {a.telemetry.oilPressurePsi ?? '—'}psi
              </p>
            )}
            {canEdit && (
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setTeleId(a._id); setHours(a.operatingHours); }} className={btnGhost + ' !px-3 !py-1 text-xs'}>Log hours</button>
                <button onClick={() => setMaintId(a._id)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Maintenance</button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {teleId && (
        <Modal title="Update operating hours" onClose={() => setTeleId(null)}>
          <form onSubmit={saveTele} className="flex flex-col gap-3">
            <Field label="Operating hours"><input type="number" className={inputCls} value={hours} onChange={e => setHours(e.target.value)} /></Field>
            <button className={btnPrimary}>Save</button>
          </form>
        </Modal>
      )}
      {maintId && (
        <Modal title="Record maintenance" onClose={() => setMaintId(null)}>
          <form onSubmit={saveMaint} className="flex flex-col gap-3">
            <Field label="Description"><input className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Oil + filter change" /></Field>
            <button className={btnPrimary}>Complete service</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
