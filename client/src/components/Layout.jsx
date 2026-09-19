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
  const [isBlizzard, setIsBlizzard] = useState(false);
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
    <div className={`flex min-h-full bg-slate-100 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100 ${isBlizzard ? 'blizzard-mode' : ''}`}>
      <CommandPalette
        isOpen={showCmdPalette}
        onClose={setShowCmdPalette}
        onToggleBlizzard={() => setIsBlizzard(v => !v)}
        isBlizzard={isBlizzard}
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-[#0d1424]/90 sm:px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Snowflake className="text-cyan-500" size={22} />
            <p className="font-extrabold tracking-wide">POLARIS</p>
          </div>

          {/* Polar Satellite Link Indicator */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Radio size={12} />
            <span>SAT-LINK: IRIDIUM NEXT</span>
          </div>

          {/* Tactical Weather & Latency HUD Bar */}
          <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-full border border-slate-700/60 bg-slate-800/40 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-cyan-400">
              <Thermometer size={12} /> -34°C (Chill -48°C)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Wind size={12} /> 42kt CAT-2 Gale
            </span>
            <span>•</span>
            <span className="text-emerald-400">142ms Lock</span>
          </div>

          <div className="flex-1" />

          {/* Command Palette Trigger */}
          <button
            onClick={() => setShowCmdPalette(true)}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg hover:border-cyan-500/60 hover:text-cyan-400 transition-all"
            title="Open Command Palette (Ctrl+K or /)"
          >
            <Terminal size={13} className="text-cyan-500" />
            <span className="hidden md:inline">Command</span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-200 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Blizzard Mode Toggle */}
          <button
            onClick={() => {
              playRadioChirp();
              setIsBlizzard(v => !v);
            }}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              isBlizzard
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm'
                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-cyan-400'
            }`}
            title="Toggle Polar Blizzard High-Contrast Mode for extreme snow visibility"
          >
            <Snowflake size={13} className={isBlizzard ? 'animate-spin' : ''} />
            <span>Blizzard</span>
          </button>

          {/* Audio Squelch / Siren Mute Toggle */}
          <button
            onClick={toggleAudio}
            className="rounded-lg border border-slate-200 p-2 dark:border-slate-700 text-slate-400 hover:text-slate-100"
            title={muted ? 'Unmute tactical audio & sirens' : 'Mute tactical audio & sirens'}
          >
            {muted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-cyan-400" />}
          </button>

          <SearchBox />
          <QuickDemoBar />
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
