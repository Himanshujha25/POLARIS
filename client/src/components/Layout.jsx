import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, Package, Boxes, Users, Wrench, Map as MapIcon,
  Siren, Sun, Moon, LogOut, Snowflake, Bell, UserCog,
  MapPin, Flame, FileBarChart, BarChart3, ScrollText, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SearchBox from './SearchBox';

// PRD persona scopes (Master PRD Section 5)
const SA = 'SuperAdmin', EM = 'ExpeditionManager', LO = 'LogisticsOfficer',
  IO = 'InventoryOfficer', PO = 'PersonnelOfficer', AO = 'AssetOfficer', EO = 'EmergencyOfficer';
const ALL = [SA, EM, LO, IO, PO, AO, EO];
const links = [
  { to: '/command', label: 'Command', icon: LayoutDashboard, end: true, roles: ALL },
  { to: '/expeditions', label: 'Expeditions', icon: Rocket, roles: ALL },
  { to: '/locations', label: 'Locations', icon: MapPin, roles: [SA, EM, LO] },
  { to: '/cargo', label: 'Cargo', icon: Package, roles: [SA, EM, LO] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: [SA, EM, IO] },
  { to: '/personnel', label: 'Personnel', icon: Users, roles: [SA, EM, PO] },
  { to: '/assets', label: 'Assets', icon: Wrench, roles: [SA, EM, AO] },
  { to: '/incidents', label: 'Emergency', icon: Flame, roles: [SA, EM, EO] },
  { to: '/map', label: 'Polar Map', icon: MapIcon, roles: ALL },
  { to: '/alerts', label: 'Alerts & SOS', icon: Siren, roles: ALL },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ALL },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: [SA, EM] },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText, roles: [SA, EM] },
  { to: '/users', label: 'Team & Roles', icon: UserCog, roles: [SA] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: [SA] },
];

function navCls({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-cyan-600/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;
}

export default function Layout({ children }) {
  const { user, logout, liveAlerts } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [showFeed, setShowFeed] = useState(false);

  const doLogout = () => { logout(); navigate('/'); };
  const visibleLinks = links.filter(l => l.roles.includes(user?.role));

  return (
    <div className="flex min-h-full bg-slate-100 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1424] md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <Snowflake className="text-cyan-500" size={26} />
          <div>
            <p className="text-lg font-extrabold tracking-wide">POLARIS</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Polar Expedition Command</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {visibleLinks.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navCls}>
              <l.icon size={18} /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <p className="font-semibold">{user?.fullName}</p>
          <p className="text-slate-500 dark:text-slate-400">{user?.role} · {user?.station}</p>
          <button onClick={doLogout} className="mt-2 flex items-center gap-1 font-medium text-red-500">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-[#0d1424]/90 sm:px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Snowflake className="text-cyan-500" size={22} />
            <p className="font-extrabold tracking-wide">POLARIS</p>
          </div>
          <div className="flex-1" />
          <SearchBox />
          <button
            onClick={() => setShowFeed(v => !v)}
            className="relative rounded-lg border border-slate-200 p-2 dark:border-slate-700"
            title="Live alert feed"
          >
            <Bell size={18} />
            {liveAlerts.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                {liveAlerts.length}
              </span>
            )}
          </button>
          <button onClick={toggle} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700" title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={doLogout} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700 md:hidden" title="Logout">
            <LogOut size={18} />
          </button>
        </header>

        {/* Live feed dropdown */}
        {showFeed && (
          <div className="sticky top-[52px] z-30 mx-3 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-[#111a2e] sm:mx-4">
            {liveAlerts.length === 0 && <p className="p-2 text-sm text-slate-500">No live alerts yet. Trigger a simulation from Alerts page.</p>}
            {liveAlerts.map((a, i) => (
              <div key={a._id || i} className="border-b border-slate-100 p-2 text-sm last:border-0 dark:border-slate-800">
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-slate-500">{a.type} · {a.severity}</p>
              </div>
            ))}
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-3 pb-24 sm:p-4 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-[#0d1424] md:hidden">
          {visibleLinks.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 [&.active]:text-cyan-500">
              <l.icon size={20} /> {l.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
