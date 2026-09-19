import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCheck, ChevronDown } from 'lucide-react';

const OFFICIAL_PERSONAS = [
  { username: 'admin', label: 'Super Admin', role: 'SuperAdmin', station: 'Headquarters_Goa', badge: 'MoES HQ' },
  { username: 'commander', label: 'Commander', role: 'ExpeditionManager', station: 'Bharati', badge: 'Mission Leader' },
  { username: 'logistics', label: 'Logistics Head', role: 'LogisticsOfficer', station: 'Headquarters_Goa', badge: 'Supply Chain' },
  { username: 'inventory', label: 'Station Engineer', role: 'InventoryOfficer', station: 'Maitri', badge: 'Life Support' },
  { username: 'emergency', label: 'Emergency Lead', role: 'EmergencyOfficer', station: 'Maitri', badge: 'SAR Command' },
  { username: 'personnel', label: 'Personnel Officer', role: 'PersonnelOfficer', station: 'Bharati', badge: 'Safety & Roster' },
  { username: 'assets', label: 'Asset Engineer', role: 'AssetOfficer', station: 'Maitri', badge: 'Heavy Machinery' },
];

export default function QuickDemoBar() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);

  // In strict production deployment, can be toggled off via VITE_ENABLE_DEMO_SWITCHER=false
  if (import.meta.env.VITE_ENABLE_DEMO_SWITCHER === 'false') {
    return null;
  }

  const switchPersona = async (p) => {
    if (user?.username === p.username) return;
    setSwitching(true);
    setOpen(false);
    try {
      // Each persona is a real deployment account in the database (seeded).
      // No test-username fallbacks: if login fails the error surfaces honestly.
      await login(p.username, 'Test@123');
      navigate('/command');
    } catch (err) {
      console.error('Failed role switch:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-600 transition-colors hover:bg-cyan-500/20 dark:text-cyan-300"
        title="Role Switcher for Official Verification & Demonstrations"
      >
        <UserCheck size={14} />
        <span className="hidden sm:inline">Role:</span>
        <span className="max-w-[120px] truncate font-bold">{user?.role || 'Switch Role'}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-68 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#111a2e]">
          <div className="border-b border-slate-100 px-2 pb-1.5 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              POLARIS Multi-Role Command Switcher
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Official deployment accounts (7 PRD Roles)
            </p>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {OFFICIAL_PERSONAS.map(p => {
              const active = user?.username === p.username;
              return (
                <button
                  key={p.username}
                  type="button"
                  onClick={() => switchPersona(p)}
                  disabled={active || switching}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? 'bg-cyan-500/15 font-bold text-cyan-600 dark:text-cyan-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <p className="font-semibold leading-tight">{p.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{p.role} · {p.station}</p>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    active ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
