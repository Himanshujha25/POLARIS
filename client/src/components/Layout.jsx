import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, Package, Boxes, Users, Wrench, Map as MapIcon,
  Siren, Sun, Moon, LogOut, Snowflake, Bell, UserCog, KeyRound,
  MapPin, Flame, FileBarChart, BarChart3, ScrollText, Settings as SettingsIcon,
  Volume2, VolumeX, Bot, CheckCircle2, ChevronRight, X, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { subscribeQueue, syncQueue } from '../lib/offlineQueue';
import { Modal, Field, inputCls, btnPrimary } from './ui';
import SearchBox from './SearchBox';
import QuickDemoBar from './QuickDemoBar';
import CommandPalette from './CommandPalette';
import FloatingSOS from './FloatingSOS';
import PolarisCopilot from './PolarisCopilot';
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
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-700 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-400'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`;
}

export default function Layout({ children }) {
  const { user, logout, liveAlerts, clearLiveAlerts, dismissAlert } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [showFeed, setShowFeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  // AI Copilot & SOS Modal states
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  // Global hotkey Ctrl+J / Cmd+J for AI Copilot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowCopilot(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tactical HUD additions
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [muted, setMuted] = useState(getAudioMuted());

  // Offline Outbox Sync Engine
  const [, setOfflineQueueItems] = useState([]);
  const [, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeQueue(setOfflineQueueItems);
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncQueue(api);
    } catch (err) {
      console.warn('[Sync] Notice:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
    <div className="flex h-dvh w-full overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100">
      {/* Skip Link for Keyboard & Screen Reader Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <CommandPalette
        isOpen={showCmdPalette}
        onClose={setShowCmdPalette}
      />
      <FloatingSOS
        isOpen={showSosModal}
        onClose={() => setShowSosModal(false)}
      />

      {/* Desktop sidebar - permanently pinned to left */}
      <aside
        aria-label="Expedition Command Navigation"
        className="hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0d1424] md:flex select-none"
      >
        <div className="mb-4 flex items-center gap-2 px-2 pt-1 shrink-0">
          <Snowflake className="text-blue-700 dark:text-blue-400" size={24} aria-hidden="true" />
          <div>
            <p className="text-base font-extrabold tracking-wide text-slate-900 dark:text-white">POLARIS</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Expedition Command</p>
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
                      <l.icon size={16} aria-hidden="true" /> {l.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60 shrink-0 border border-slate-100 dark:border-slate-800">
          <p className="font-bold text-slate-900 dark:text-white">{user?.fullName}</p>
          <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">{user?.role} · {user?.station}</p>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={doLogout}
              className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-600"
            >
              <LogOut size={13} aria-hidden="true" /> Logout
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => { setShowPw(true); setPwMsg(''); }}
              className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              <KeyRound size={13} aria-hidden="true" /> Password
            </button>
          </div>
        </div>
      </aside>

      {showPw && (
        <Modal title="Change password" onClose={() => setShowPw(false)}>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <Field label="Current password"><input type="password" className={inputCls} required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></Field>
            <Field label="New password (min 8 chars)"><input type="password" className={inputCls} required minLength={8} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password"><input type="password" className={inputCls} required value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} /></Field>
            {pwMsg && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{pwMsg}</p>}
            <button className={btnPrimary}>Update password</button>
          </form>
        </Modal>
      )}

      <div className="flex min-w-0 flex-1 flex-col h-dvh overflow-hidden">
        {/* Top header - permanently pinned to top */}
        <header
          role="banner"
          className="shrink-0 z-30 flex h-14 w-full items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-xs dark:border-slate-800 dark:bg-[#0d1424]/95 sm:px-4"
        >
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <Snowflake className="text-blue-700 dark:text-blue-400 shrink-0" size={20} aria-hidden="true" />
              <p className="font-extrabold tracking-wider text-sm text-slate-900 dark:text-white">POLARIS</p>
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
              type="button"
              onClick={toggleAudio}
              className="flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={muted ? 'Unmute tactical audio & sirens' : 'Mute tactical audio & sirens'}
              aria-label={muted ? 'Unmute tactical audio' : 'Mute tactical audio'}
            >
              {muted ? <VolumeX size={16} className="text-red-600" aria-hidden="true" /> : <Volume2 size={16} className="text-blue-700 dark:text-blue-400" aria-hidden="true" />}
            </button>

            {/* Quick Persona & Role Switcher */}
            <QuickDemoBar />

            {/* Live Alerts Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFeed(v => !v)}
                className={`relative flex size-9 items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  showFeed
                    ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-200'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                title="Live alert feed"
                aria-label="Live alert notifications"
              >
                <Bell size={16} aria-hidden="true" />
                {liveAlerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold font-mono tabular-nums text-white">
                    {liveAlerts.length > 9 ? '9+' : liveAlerts.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showFeed && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f172a] shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-blue-700 dark:text-blue-400" aria-hidden="true" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Notifications
                      </h3>
                      {liveAlerts.length > 0 && (
                        <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums text-red-800 dark:bg-red-950 dark:text-red-300">
                          {liveAlerts.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {liveAlerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => clearLiveAlerts()}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} aria-hidden="true" />
                          <span>Clear All</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFeed(false)}
                        aria-label="Close notifications"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {liveAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <CheckCircle2 size={28} className="text-emerald-600 mb-2" aria-hidden="true" />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          All Clear · No Active Alerts
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Base perimeter, assets and telemetry are nominal.
                        </p>
                      </div>
                    ) : (
                      liveAlerts.map((a, i) => (
                        <div
                          key={a._id || a.id || i}
                          className="group flex items-start justify-between gap-2.5 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div
                            onClick={() => { setShowFeed(false); navigate('/alerts'); }}
                            className="flex-1 cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900">
                                {a.severity || 'ALERT'}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {a.type || 'Telemetry'}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                              {a.title}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissAlert(a._id || a.id);
                            }}
                            aria-label="Dismiss alert"
                            className="shrink-0 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setShowFeed(false); navigate('/alerts'); }}
                    className="w-full py-2 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Alerts & SOS Center</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            {/* Emergency SOS Distress Beacon Trigger */}
            <button
              type="button"
              onClick={() => {
                playRadioChirp();
                setShowSosModal(true);
              }}
              className="relative flex size-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 transition-colors cursor-pointer"
              title="Emergency SOS Distress Beacon"
              aria-label="Emergency SOS Distress Beacon"
            >
              <Siren size={16} aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggle}
              className="flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" aria-hidden="true" /> : <Moon size={16} className="text-slate-700" aria-hidden="true" />}
            </button>

            {/* Mobile Logout */}
            <button
              type="button"
              onClick={doLogout}
              className="flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-red-400 md:hidden transition-colors cursor-pointer"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Real-Time Polar Satellite Connectivity Banner */}
        <div className="shrink-0">
          <OfflineSyncBanner />
        </div>

        {/* Main Operational Surface */}
        <div className="flex-1 overflow-y-auto w-full min-h-0">
          <main
            id="main-content"
            tabIndex={-1}
            role="main"
            className="mx-auto w-full max-w-6xl min-w-0 p-3 pb-24 sm:p-4 md:pb-8 outline-none"
          >
            {children}
          </main>
        </div>

        {/* Floating AI Copilot Trigger */}
        <button
          type="button"
          onClick={() => setShowCopilot(v => !v)}
          className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-all cursor-pointer"
          title="POLARIS AI Copilot (Ctrl+J)"
          aria-label="Open POLARIS AI Copilot"
        >
          <Bot size={22} aria-hidden="true" />
        </button>

        <PolarisCopilot
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
        />

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Mobile Navigation"
          className="shrink-0 flex gap-1 overflow-x-auto border-t border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-[#0d1424] md:hidden"
        >
          {allLinks.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 [&.active]:text-blue-700 dark:[&.active]:text-blue-400"
            >
              <l.icon size={18} aria-hidden="true" /> {l.label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
