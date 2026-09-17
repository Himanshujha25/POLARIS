import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Siren } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, StatCard, Pill, Spinner, Empty, btnGhost } from '../../components/ui';

export default function EmergencyDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [i, a] = await Promise.all([api('/api/v1/incidents?active=true'), api('/api/v1/alerts/active')]);
        setIncidents(i); setAlerts(a);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;
  const critical = incidents.filter(i => i.severity === 'Critical');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Emergency Operations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Incidents, roll call readiness, response</p>
        </div>
        <Link to="/incidents" className={btnGhost + ' text-xs'}>All incidents</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Active Incidents" value={incidents.length} icon={<Flame size={20} />} accent="text-red-500" />
        <StatCard label="Critical" value={critical.length} icon={<Siren size={20} />} accent="text-red-500" />
        <StatCard label="Unacked Alerts" value={alerts.length} icon={<Siren size={20} />} accent="text-amber-500" />
      </div>

      {incidents.length === 0 && <Empty text="No active incidents — all clear" />}
      <div className="flex flex-col gap-2">
        {incidents.map(i => (
          <Link key={i._id} to={`/incidents/${i._id}`}>
            <Card className="p-3 hover:border-red-400">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{i.incidentCode} · {i.type} @ {i.location}</p>
                <Pill value={i.severity} />
              </div>
              <p className="text-xs text-slate-500">{i.status} · {new Date(i.createdAt).toLocaleString()}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
