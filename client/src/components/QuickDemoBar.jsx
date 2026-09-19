import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { UserCheck, ChevronDown, Check } from 'lucide-react';

export const DEFAULT_ROLES = [
  { username: 'admin', fullName: 'NCPOR Admin', role: 'SuperAdmin', station: 'Headquarters_Goa' },
  { username: 'commander', fullName: 'Station Commander', role: 'ExpeditionManager', station: 'Bharati' },
  { username: 'logistics', fullName: 'Logistics Officer', role: 'LogisticsOfficer', station: 'Headquarters_Goa' },
  { username: 'inventory', fullName: 'Inventory Manager', role: 'InventoryOfficer', station: 'Maitri' },
  { username: 'emergency', fullName: 'Emergency Officer', role: 'EmergencyOfficer', station: 'Maitri' },
  { username: 'personnel', fullName: 'Personnel Officer', role: 'PersonnelOfficer', station: 'Bharati' },
  { username: 'assets', fullName: 'Asset Officer', role: 'AssetOfficer', station: 'Maitri' },
];

export default function QuickDemoBar({ align = 'left', className = '' }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);
  const [userList, setUserList] = useState(DEFAULT_ROLES);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Fetch live real users from backend database
      api('/api/v1/auth/users')
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setUserList(data);
          }
        })
        .catch(() => {});
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // In strict production deployment, can be toggled off via VITE_ENABLE_DEMO_SWITCHER=false
  if (import.meta.env.VITE_ENABLE_DEMO_SWITCHER === 'false') {
    return null;
  }

  const switchUser = async (targetUser) => {
    if (user?.username === targetUser.username) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setOpen(false);
    try {
      await login(targetUser.username, 'Test@123');
      navigate('/command');
    } catch (err) {
      console.error('Failed role switch:', err);
      alert('Failed to switch: ' + (err.message || 'Check connection'));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-500/20 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300 transition-all cursor-pointer shadow-xs"
        title="Switch active role / account"
      >
        <UserCheck size={12} className="text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-slate-500 dark:text-slate-400">Role:</span>
        <span className="max-w-[130px] truncate font-bold">{user?.role || 'Switch Role'}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 text-blue-500 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-[100] mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-[#111a2e] animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="border-b border-slate-100 px-2.5 py-2 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              POLARIS Operational Accounts
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Real accounts from central database
            </p>
          </div>
          <div className="mt-1 flex flex-col gap-1 max-h-72 overflow-y-auto pr-0.5">
            {userList.map(u => {
              const active = user?.username === u.username;
              return (
                <button
                  key={u._id || u.username}
                  type="button"
                  onClick={() => switchUser(u)}
                  disabled={active || switching}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-500/15 font-bold text-blue-600 dark:text-blue-300 border border-blue-500/20'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-[12px] truncate leading-tight">{u.fullName || u.username}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{u.role} · {u.station || 'Base'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                      active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {u.role ? u.role.slice(0, 2) : 'OP'}
                    </span>
                    {active && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
