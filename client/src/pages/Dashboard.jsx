import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Users, Siren, Boxes, Package, Clock, Wrench, Flame } from 'lucide-react';
import { api } from '../lib/api';
import { Card, StatCard, Pill, Spinner, btnGhost } from '../components/ui';

// PRD #7: operational KPIs from real records — no hardcoded numbers
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [exps, personnel, alerts, forecast, cargo, assets, incidents] = await Promise.all([
          api('/api/v1/expeditions'),
          api('/api/v1/personnel'),
          api('/api/v1/alerts/active'),
          api('/api/v1/inventory/forecast'),
          api('/api/v1/cargo'),
          api('/api/v1/assets'),
          api('/api/v1/incidents?active=true')
        ]);
        setData({ exps, personnel, alerts, forecast, cargo, assets, incidents });
      } catch { /* show empty */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  const { exps = [], personnel = [], alerts = [], forecast = [], cargo = [], assets = [], incidents = [] } = data || {};

  const activeExps = exps.filter(e => !['Completed', 'Cancelled', 'Decommissioned'].includes(e.status));
  const plannedExps = exps.filter(e => ['Draft', 'Planning', 'Ready'].includes(e.status));
  const inTransit = cargo.filter(c => c.status === 'InTransit');
  const delayed = cargo.filter(c => ['DelayedWeather', 'Delayed'].includes(c.status) || (c.status === 'InTransit' && c.eta && new Date(c.eta) < new Date()));
  const invAlerts = forecast.filter(f => f.risk === 'RISK' || ['CriticalDepletion', 'Exhausted'].includes(f.status));
  const underMaint = assets.filter(a => ['ScheduledMaintenance', 'UnderMaintenance', 'EmergencyOffline', 'Damaged'].includes(a.condition));

  const atStation = personnel.filter(p => p.currentStatus === 'StationHab').length;
  const inField = personnel.filter(p => p.currentStatus === 'FieldResearch').length;
  const moving = personnel.filter(p => p.currentStatus === 'InTransit').length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">Expedition Command Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Live mission status · all data from real API</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active Expeditions" value={activeExps.length} sub={`${plannedExps.length} planned`} icon={<Rocket size={20} />} />
        <StatCard label="Cargo In Transit" value={inTransit.length} sub={`${delayed.length} delayed`} icon={<Package size={20} />} />
        <StatCard label="Inventory Alerts" value={invAlerts.length} sub="RISK / critical" icon={<Boxes size={20} />} accent="text-amber-500" />
        <StatCard label="Personnel Deployed" value={personnel.length} sub={`${atStation} station · ${inField} field · ${moving} transit`} icon={<Users size={20} />} />
        <StatCard label="Assets in Maintenance" value={underMaint.length} sub={`${assets.length} total`} icon={<Wrench size={20} />} accent="text-amber-500" />
        <StatCard label="Active Emergencies" value={incidents.length} sub="open incidents" icon={<Flame size={20} />} accent="text-red-500" />
        <StatCard label="Critical Alerts" value={alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'DISASTER').length} sub={`${alerts.length} unacknowledged`} icon={<Siren size={20} />} accent="text-red-500" />
        <StatCard label="Delayed Shipments" value={delayed.length} sub="need attention" icon={<Clock size={20} />} accent="text-red-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Active Alerts</h2>
            <Link to="/alerts" className={btnGhost + ' !px-3 !py-1 text-xs'}>Open SOS Center</Link>
          </div>
          {alerts.length === 0 && <p className="py-4 text-center text-sm text-emerald-600 dark:text-emerald-400">All clear — no unacknowledged alerts.</p>}
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {alerts.slice(0, 8).map(a => (
              <div key={a._id} className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Pill value={a.severity} />
                </div>
                <p className="text-xs text-slate-500">{a.type} · {new Date(a.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Resupply Risk (SAFE / RISK)</h2>
            <Link to="/inventory" className={btnGhost + ' !px-3 !py-1 text-xs'}>Inventory</Link>
          </div>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {[...forecast].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8).map(f => (
              <div key={f.id} className="rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{f.itemName} <span className="font-normal text-slate-500">({f.station})</span></p>
                  <Pill value={f.risk || f.status} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{f.why}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-bold">Expeditions</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {exps.map(e => (
            <Link key={e._id} to={`/expeditions/${e._id}`} className="rounded-lg border border-slate-200 p-3 hover:border-cyan-500 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="font-bold">{e.expeditionCode}</p>
                <Pill value={e.status} />
              </div>
              <p className="text-sm text-slate-500">{e.title} → {e.targetStation}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
