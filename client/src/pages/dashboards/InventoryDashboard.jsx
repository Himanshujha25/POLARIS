import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, AlertTriangle, Wrench, Fuel } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, Pill, Spinner, Empty, btnGhost } from '../../components/ui';

export default function InventoryDashboard() {
  const [forecast, setForecast] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [f, a] = await Promise.all([api('/api/v1/inventory/forecast'), api('/api/v1/assets')]);
        setForecast(f); setAssets(a);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  const critical = forecast.filter(f => f.status === 'CriticalDepletion' || f.status === 'Exhausted');
  const warning = forecast.filter(f => f.status === 'Warning');
  const dueService = assets.filter(a => a.maxHoursBeforeService - a.operatingHours <= 25);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Station Engineering</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Life support + machine health</p>
        </div>
        <Link to="/inventory" className={btnGhost + ' text-xs'}>Manage stock</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock Lines" value={forecast.length} icon={<Boxes size={20} />} />
        <StatCard label="Critical" value={critical.length} icon={<AlertTriangle size={20} />} accent="text-red-500" />
        <StatCard label="Warning" value={warning.length} icon={<Fuel size={20} />} accent="text-amber-500" />
        <StatCard label="Machines Due Service" value={dueService.length} icon={<Wrench size={20} />} accent="text-amber-500" />
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-bold">Runout watch (lowest days first)</h2>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {[...forecast].sort((a, b) => a.daysRemaining - b.daysRemaining).map(f => (
            <div key={f.id} className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{f.itemName} <span className="font-normal text-slate-500">({f.station})</span></p>
                <Pill value={f.status} />
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={`h-full ${f.daysRemaining < 30 ? 'bg-red-500' : f.daysRemaining < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, f.daysRemaining)}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">~{f.daysRemaining} days · {f.currentStock} {f.unit}</p>
            </div>
          ))}
          {forecast.length === 0 && <Empty />}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-bold">Machines due service</h2>
        {dueService.length === 0 ? <Empty text="All machines healthy" /> : (
          <div className="flex flex-col gap-2">
            {dueService.map(a => (
              <div key={a._id} className="flex items-center justify-between rounded-lg bg-amber-500/10 p-2 text-sm">
                <p className="font-semibold">{a.assetTag} · {a.name}</p>
                <p className="text-xs text-slate-500">{Math.max(0, a.maxHoursBeforeService - a.operatingHours)} hrs left</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
