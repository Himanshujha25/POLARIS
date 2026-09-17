import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner, Empty, Field, inputCls, btnPrimary, ErrorNote } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (user?.role !== 'SuperAdmin') return <Navigate to="/command" replace />;

  const load = async () => {
    setLoading(true);
    try {
      const s = await api('/api/v1/settings');
      setSettings(s);
      setValues(Object.fromEntries(s.map(x => [x.key, x.value])));
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (key) => {
    setError(''); setSaved(false);
    try {
      await api(`/api/v1/settings/${key}`, { method: 'PATCH', body: { value: values[key] } });
      setSaved(true); load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">System Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Runtime config — applies within minutes, no redeploy</p>
      </div>
      <ErrorNote message={error} />
      {saved && <p className="rounded-lg bg-emerald-500/10 p-2 text-sm text-emerald-600">Saved</p>}
      {settings.length === 0 && <Empty />}
      <div className="grid gap-3 sm:grid-cols-2">
        {settings.map(s => (
          <Card key={s.key} className="p-4">
            <p className="font-mono text-sm font-bold">{s.key}</p>
            <p className="text-xs text-slate-500">{s.description} {s.fromDefault && '(default)'}</p>
            <div className="mt-2 flex gap-2">
              <input className={inputCls} value={values[s.key] || ''} onChange={e => setValues({ ...values, [s.key]: e.target.value })} />
              <button onClick={() => save(s.key)} className={btnPrimary}>Save</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
