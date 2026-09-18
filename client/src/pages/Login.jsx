import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PublicHeader, { ThemeToggle } from '../components/PublicHeader';
import { Card, inputCls, btnPrimary } from '../components/ui';

const demoUsers = ['admin', 'commander', 'logistics', 'inventory', 'emergency', 'personnel', 'assets'];

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Test@123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  // Already signed in → straight to command
  useEffect(() => {
    if (!loading && user) navigate('/command', { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      try {
        await login(username, password);
      } catch (err) {
        if (username === 'emergency') {
          await login('rahul', password);
        } else {
          throw err;
        }
      }
      navigate('/command');
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      {/* Header — same shared header as landing: brand left, actions right */}
      <PublicHeader
        center={null}
        actions={
          <>
            <Link to="/" className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> Back
            </Link>
            <ThemeToggle />
          </>
        }
      />

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6">
          <div className="mb-4">
            <h1 className="text-xl font-extrabold">Welcome back</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Polar Expedition Command · NCPOR</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input className={inputCls} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className={btnPrimary} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
            <p className="mb-1 font-semibold text-slate-500 dark:text-slate-400">Quick fill (works after you create these users in Team & Roles)</p>
            <div className="flex flex-wrap gap-1">
              {demoUsers.map(u => (
                <button key={u} onClick={() => setUsername(u)} className="rounded-full border border-slate-300 px-2 py-0.5 dark:border-slate-600">{u}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
