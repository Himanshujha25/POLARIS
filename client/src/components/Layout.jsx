import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, Package, Boxes, Users, Wrench, Map as MapIcon,
  Siren, Sun, Moon, LogOut, Snowflake, Bell, UserCog, KeyRound,
  MapPin, Flame, FileBarChart, BarChart3, ScrollText, Settings as SettingsIcon, Radio,
  Wind, Thermometer, Volume2, VolumeX, Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { Modal, Field, inputCls, btnPrimary } from './ui';
import SearchBox from './SearchBox';
import QuickDemoBar from './QuickDemoBar';
import CommandPalette from './CommandPalette';
import FloatingSOS from './FloatingSOS';
import PolarTelemetryCapsule from './PolarTelemetryCapsule';
import OfflineSyncBanner from './OfflineSyncBanner';
import { setAudioMuted, getAudioMuted, playRadioChirp } from '../lib/audio';

// PRD persona scopes (Master PRD Section 5)
const SA = 'SuperAdmin', EM = 'ExpeditionManager', LO = 'LogisticsOfficer',
  IO = 'InventoryOfficer', PO = 'PersonnelOfficer', AO = 'AssetOfficer', EO = 'EmergencyOfficer';
const ALL = [SA, EM, LO, IO, PO, AO, EO];
const navSections = [
  {
    title: 'OPERATIONS',
    links: [
      { to: '/command', label: 'Command', icon: LayoutDashboard, end: true, roles: ALL },
      { to: '/expeditions', label: 'Expeditions Hub', icon: Rocket, roles: ALL },
      { to: '/map', label: 'Polar Map', icon: MapIcon, roles: ALL },
      { to: '/incidents', label: 'Emergency', icon: Flame, roles: [SA, EM, EO] },
      { to: '/alerts', label: 'Alerts & SOS', icon: Siren, roles: ALL },
    ]
  },
  {
    title: 'BASE & LOGISTICS',
    links: [
      { to: '/locations', label: 'Stations & Hubs', icon: MapPin, roles: [SA, EM, LO] },
      { to: '/inventory', label: 'Central Inventory', icon: Boxes, roles: [SA, EM, IO] },
      { to: '/cargo', label: 'Cargo Manifests', icon: Package, roles: [SA, EM, LO] },
      { to: '/personnel', label: 'Personnel Roster', icon: Users, roles: [SA, EM, PO] },
      { to: '/assets', label: 'Station Assets', icon: Wrench, roles: [SA, EM, AO] },
    ]
  },
  {
    title: 'GOVERNANCE',
    links: [
      { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ALL },
      { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: [SA, EM] },
      { to: '/users', label: 'Team & Roles', icon: UserCog, roles: [SA] },
      { to: '/audit', label: 'Audit Logs', icon: ScrollText, roles: [SA, EM] },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: [SA] },
    ]
  }
];

function navCls({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  // Tactical HUD additions
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [muted, setMuted] = useState(getAudioMuted());

  const toggleAudio = () => {
    const next = !muted;
    setMuted(next);
    setAudioMuted(next);
    if (!next) playRadioChirp();
  };

  const doLogout = () => { logout(); navigate('/'); };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('New passwords do not match'); return; }
    try {
      await api('/api/v1/auth/password', { method: 'PATCH', body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword } });
      setShowPw(false);
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { setPwMsg(err.message); }
  };
  const allLinks = navSections.flatMap(s => s.links).filter(l => l.roles.includes(user?.role));

  return (
    <div className="flex min-h-full w-full max-w-full overflow-x-hidden bg-slate-100 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      <CommandPalette
        isOpen={showCmdPalette}
        onClose={setShowCmdPalette}
      />
      <FloatingSOS />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0d1424] md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <Snowflake className="text-cyan-500" size={26} />
          <div>
            <p className="text-base font-extrabold tracking-wide">POLARIS</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Expedition Command</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {navSections.map(sec => {
            const filtered = sec.links.filter(l => l.roles.includes(user?.role));
            if (filtered.length === 0) return null;
            return (
              <div key={sec.title}>
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {sec.title}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {filtered.map(l => (
                    <NavLink key={l.to} to={l.to} end={l.end} className={navCls}>
                      <l.icon size={16} /> {l.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
          <p className="font-semibold">{user?.fullName}</p>
          <p className="text-slate-500 dark:text-slate-400">{user?.role} · {user?.station}</p>
          <button onClick={doLogout} className="mt-2 flex items-center gap-1 font-medium text-red-500">
            <LogOut size={14} /> Logout
          </button>
          <button onClick={() => { setShowPw(true); setPwMsg(''); }} className="mt-1.5 flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
            <KeyRound size={14} /> Change password
          </button>
        </div>
      </aside>

      {showPw && (
        <Modal title="Change password" onClose={() => setShowPw(false)}>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <Field label="Current password"><input type="password" className={inputCls} required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></Field>
            <Field label="New password (min 8 chars)"><input type="password" className={inputCls} required minLength={8} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password"><input type="password" className={inputCls} required value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} /></Field>
            {pwMsg && <p className="text-sm text-red-500">{pwMsg}</p>}
            <button className={btnPrimary}>Update password</button>
          </form>
        </Modal>
      )}

      <div className="flex min-w-0 flex-1 flex-col w-full max-w-full overflow-x-hidden">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 w-full max-w-full items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#0d1424]/95 sm:px-4">
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <Snowflake className="text-cyan-500 shrink-0" size={20} />
              <p className="font-extrabold tracking-wider text-sm">POLARIS</p>
            </div>

            {/* Dynamic Polar Telemetry Capsule (Live Stations, Weather & Sat-Link) */}
            <PolarTelemetryCapsule userStation={user?.station} />
          </div>

          {/* Right Action Controls Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Integrated SearchBox & Command Trigger */}
            <SearchBox onOpenPalette={() => setShowCmdPalette(true)} />

            {/* Tactical Audio & Siren Mute Toggle */}
            <button
              onClick={toggleAudio}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              title={muted ? 'Unmute tactical audio & sirens' : 'Mute tactical audio & sirens'}
            >
              {muted ? <VolumeX size={16} className="text-red-500" /> : <Volume2 size={16} className="text-cyan-500" />}
            </button>

            {/* Quick Persona & Role Switcher */}
            <QuickDemoBar />

            {/* Live Alerts Notification Bell */}
            <button
              onClick={() => setShowFeed(v => !v)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              title="Live alert feed"
            >
              <Bell size={16} />
              {liveAlerts.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
                  {liveAlerts.length}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
            </button>

            {/* Mobile Logout */}
            <button
              onClick={doLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-red-400 md:hidden transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Real-Time Polar Satellite Connectivity & Offline Outbox Banner */}
        <OfflineSyncBanner />

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

        <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 p-3 pb-24 sm:p-4 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-[#0d1424] md:hidden">
          {allLinks.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 [&.active]:text-cyan-500">
              <l.icon size={20} /> {l.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
