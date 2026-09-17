import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Ship, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, Pill, Spinner, Empty, btnGhost } from '../../components/ui';

export default function CargoDashboard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setList(await api('/api/v1/cargo')); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  const inTransit = list.filter(c => c.status === 'InTransit');
  const delivered = list.filter(c => c.status === 'DeliveredStation');
  const delayed = list.filter(c => c.status === 'DelayedWeather' || (c.status === 'InTransit' && c.eta && new Date(c.eta) < new Date()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Logistics Command</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Supply chain · Goa → Station pipeline</p>
        </div>
        <Link to="/cargo" className={btnGhost + ' text-xs'}>Manage cargo</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Shipments" value={list.length} icon={<Package size={20} />} />
        <StatCard label="In Transit" value={inTransit.length} icon={<Ship size={20} />} />
        <StatCard label="Delivered" value={delivered.length} icon={<CheckCircle size={20} />} accent="text-emerald-500" />
        <StatCard label="Need Attention" value={delayed.length} icon={<AlertTriangle size={20} />} accent="text-red-500" />
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-bold">Needs attention (delayed / ETA passed)</h2>
        {delayed.length === 0 ? <Empty text="Pipeline flowing — nothing delayed" /> : (
          <div className="flex flex-col gap-2">
            {delayed.map(c => (
              <div key={c._id} className="rounded-lg bg-red-500/5 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{c.trackingNumber} · {c.title}</p>
                  <Pill value={c.status} />
                </div>
                <p className="text-xs text-slate-500">At {c.currentNode} · ETA {c.eta ? new Date(c.eta).toLocaleDateString() : '—'}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-bold">Live pipeline</h2>
        <div className="flex flex-col gap-2">
          {inTransit.map(c => (
            <div key={c._id} className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
              <p className="font-semibold">{c.trackingNumber} · {c.title}</p>
              <p className="text-xs text-cyan-600 dark:text-cyan-400">Now: {c.currentNode} → next hop pending</p>
            </div>
          ))}
          {inTransit.length === 0 && <Empty text="Nothing in transit" />}
        </div>
      </Card>
    </div>
  );
}
