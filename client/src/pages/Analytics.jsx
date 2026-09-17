import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, Spinner, Empty } from '../components/ui';

function Bars({ data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) return <Empty text="No data" />;
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([k, n]) => (
        <div key={k} className="text-sm">
          <div className="flex justify-between text-xs"><span>{k}</span><b>{n}</b></div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full bg-cyan-500" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setA(await api('/api/v1/reports/analytics/overview')); } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!a) return <Empty text="Analytics unavailable" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold sm:text-2xl">Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4"><h2 className="mb-2 font-bold">Cargo by status</h2><Bars data={a.cargo} /></Card>
        <Card className="p-4"><h2 className="mb-2 font-bold">Personnel distribution</h2><Bars data={a.personnel} /></Card>
        <Card className="p-4"><h2 className="mb-2 font-bold">Inventory health</h2><Bars data={a.inventory} /></Card>
        <Card className="p-4"><h2 className="mb-2 font-bold">Asset condition</h2><Bars data={a.assets} /></Card>
        <Card className="p-4"><h2 className="mb-2 font-bold">Top consumption (30d)</h2><Bars data={Object.fromEntries((a.topConsumption30d || []).map(x => [x._id, x.total]))} /></Card>
        <Card className="p-4">
          <h2 className="mb-2 font-bold">Open incidents</h2>
          <p className="text-3xl font-extrabold text-red-500">{a.openIncidents}</p>
        </Card>
      </div>
    </div>
  );
}
