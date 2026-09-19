import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Rocket, Package, Boxes, Users, Wrench, Map as MapIcon,
  Siren, Sun, Moon, LogOut, Snowflake, Bell, UserCog, KeyRound,
  MapPin, Flame, FileBarChart, BarChart3, ScrollText, Settings as SettingsIcon, Radio,
  Wind, Thermometer, Volume2, VolumeX, Terminal, WifiOff, RefreshCw,
  ChevronRight, ChevronDown, MessageSquare, Search, Activity, Check, Sparkles, MessageCircle, Bot,
  Trash2, CheckCircle2, X, AlertTriangle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { subscribeQueue, syncQueue } from '../lib/offlineQueue';
import { Modal, Field, inputCls, btnPrimary } from './ui';
import SearchBox from './SearchBox';
import { DEFAULT_ROLES } from './QuickDemoBar';
import CommandPalette from './CommandPalette';
import FloatingSOS from './FloatingSOS';
import PolarisCopilot from './PolarisCopilot';
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
  const { user, login, logout, liveAlerts, clearLiveAlerts, dismissAlert } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [showFeed, setShowFeed] = useState(false);
  const feedRef = useRef(null);
  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const [showSidebarRoleMenu, setShowSidebarRoleMenu] = useState(false);
  const sidebarRoleRef = useRef(null);
  const [dbUsers, setDbUsers] = useState(DEFAULT_ROLES);

  // Close menus when clicking outside & fetch live DB users
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (sidebarRoleRef.current && !sidebarRoleRef.current.contains(e.target)) {
        setShowSidebarRoleMenu(false);
      }
      if (feedRef.current && !feedRef.current.contains(e.target)) {
        setShowFeed(false);
      }
    }
    if (showProfileMenu || showSidebarRoleMenu || showFeed) {
      document.addEventListener('mousedown', handleClickOutside);
      api('/api/v1/auth/users')
        .then(data => {
          if (Array.isArray(data) && data.length > 0) setDbUsers(data);
        })
        .catch(() => {});
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu, showSidebarRoleMenu]);

  // Tactical HUD additions
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);
  const [isBlizzard, setIsBlizzard] = useState(false);
  const [muted, setMuted] = useState(getAudioMuted());

  // Real-time Antarctic Satellite Weather Poll
  useEffect(() => {
    const fetchWeather = () => {
      api('/api/v1/weather/live')
        .then(data => setLiveWeather(data))
        .catch(err => console.warn('[weather/live fetch notice]', err.message));
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+J / Cmd+J for AI Copilot
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowCopilot(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Offline Outbox Sync Engine
  const [offlineQueueItems, setOfflineQueueItems] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
    <div className={`flex min-h-full bg-[#f8fafc] text-slate-900 dark:bg-[#0B111E] dark:text-slate-100 ${isBlizzard ? 'blizzard-mode' : ''}`}>
      <CommandPalette
        isOpen={showCmdPalette}
        onClose={setShowCmdPalette}
        onToggleBlizzard={() => setIsBlizzard(v => !v)}
        isBlizzard={isBlizzard}
      />
      <FloatingSOS isOpen={showSosModal} onClose={() => setShowSosModal(false)} />
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-[#0d1424] md:flex">
        {/* Sidebar Header with 4-Point Star Logo and Collapse Chevron */}
        <div className="mb-4 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="text-blue-600 dark:text-cyan-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.8 8.8C14.3 10.6 15.7 12 17.5 12.5L22 13.5L17.5 14.5C15.7 15 14.3 16.4 13.8 18.2L12 22L10.2 18.2C9.7 16.4 8.3 15 6.5 14.5L2 13.5L6.5 12.5C8.3 12 9.7 10.6 10.2 8.8L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-base font-black tracking-wide text-slate-900 dark:text-white">POLARIS</p>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">Expedition Command</p>
            </div>
          </div>
          <button
            onClick={() => {}}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {navSections.map(sec => {
            const filtered = sec.links.filter(l => l.roles.includes(user?.role));
            if (filtered.length === 0) return null;
            return (
              <div key={sec.title}>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {sec.title}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {filtered.map(l => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50/90 text-blue-600 font-semibold dark:bg-blue-600/20 dark:text-blue-400'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                        }`
                      }
                    >
                      <l.icon size={17} className="shrink-0" />
                      <span>{l.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        {/* Sidebar Bottom Profile Card with Role Switcher */}
        <div ref={sidebarRoleRef} className="relative mt-2 flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowSidebarRoleMenu(v => !v)}
            className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer w-full"
            title="Switch operational role"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SA'}
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px]">
                  {user?.fullName || 'SuperAdmin'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[110px]">
                  {user?.role === 'SuperAdmin' ? 'Operations Command' : user?.role || 'Operations Command'}
                </span>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showSidebarRoleMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSidebarRoleMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-[#111a2e] z-[100] animate-in fade-in zoom-in-95 duration-150">
              <div className="border-b border-slate-100 px-2 pb-1.5 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Switch Operational Role
                </p>
                <p className="text-[10px] text-slate-400">7 PRD Scopes</p>
              </div>
              <div className="mt-1 flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                {dbUsers.map(u => {
                  const active = user?.username === u.username;
                  return (
                    <button
                      key={u._id || u.username}
                      type="button"
                      onClick={async () => {
                        if (active) return;
                        setShowSidebarRoleMenu(false);
                        try {
                          await login(u.username, 'Test@123');
                          navigate('/command');
                        } catch (err) { alert('Failed to switch: ' + err.message); }
                      }}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-600/20 dark:text-blue-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-1.5">
                        <span className="truncate block font-medium">{u.fullName || u.username}</span>
                        <span className="text-[10px] text-slate-400 block">{u.role}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>{u.role ? u.role.slice(0, 2) : 'OP'}</span>
                    </button>
                  );
                })}
              </div>
              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { setShowSidebarRoleMenu(false); setShowPw(true); setPwMsg(''); }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-colors w-full text-left cursor-pointer"
                >
                  <KeyRound size={13} className="text-slate-400" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={doLogout}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50/60 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Logout</span>
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
        {/* Row 1: Global Master Header Bar (Search + Quick Tools + Profile Avatar) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-[#0d1424]">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="text-blue-600 dark:text-cyan-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L13.8 8.8C14.3 10.6 15.7 12 17.5 12.5L22 13.5L17.5 14.5C15.7 15 14.3 16.4 13.8 18.2L12 22L10.2 18.2C9.7 16.4 8.3 15 6.5 14.5L2 13.5L6.5 12.5C8.3 12 9.7 10.6 10.2 8.8L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <p className="font-extrabold tracking-wide text-slate-900 dark:text-white">POLARIS</p>
          </div>

          {/* Master Search Bar (with ⌘ K) */}
          <div
            onClick={() => setShowCmdPalette(true)}
            className="flex flex-1 max-w-xl items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-1.5 transition-all hover:border-slate-300 hover:bg-white cursor-pointer dark:border-slate-700/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
          >
            <Search size={16} className="text-slate-400 shrink-0" />
            <span className="flex-1 text-xs text-slate-400 dark:text-slate-500 select-none">
              Search missions, stations, assets, personnel...
            </span>
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded-md dark:bg-slate-800 dark:border-slate-700">
              ⌘ K
            </kbd>
          </div>

          {/* Master Top Right Controls */}
          <div className="flex items-center gap-2.5 ml-4">
            {/* AI Copilot Trigger */}
            <button
              onClick={() => setShowCopilot(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold text-xs shadow-xs hover:shadow-cyan-500/10 transition-all cursor-pointer group"
              title="POLARIS AI Polar Intelligence Copilot (Ctrl+J)"
            >
              <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span>AI Copilot</span>
              <span className="hidden md:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-800 dark:text-cyan-200">⌘J</span>
            </button>

            {/* Alert Bell with Live Counter Badge & Dropdown */}
            <div className="relative" ref={feedRef}>
              <button
                onClick={() => setShowFeed(v => !v)}
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                  showFeed
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Live alert notifications"
                aria-label="Live alert notifications"
              >
                <Bell size={18} />
                {liveAlerts && liveAlerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-in zoom-in">
                    {liveAlerts.length > 9 ? '9+' : liveAlerts.length}
                  </span>
                )}
              </button>

              {/* High-End Floating Notification Panel */}
              {showFeed && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-[#0f172a]/95 shadow-2xl backdrop-blur-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-blue-600 dark:text-cyan-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        Notifications
                      </h3>
                      {liveAlerts.length > 0 && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {liveAlerts.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {liveAlerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => clearLiveAlerts()}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Clear all alerts from database"
                        >
                          <Trash2 size={12} />
                          <span>Clear All</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFeed(false)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Body List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                    {liveAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mb-2 stroke-[1.5]" />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          All Clear · No Active Alerts
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Base perimeter, assets and telemetry are nominal.
                        </p>
                      </div>
                    ) : (
                      liveAlerts.map((a, i) => {
                        const isDisaster = a.severity === 'DISASTER';
                        const isCritical = a.severity === 'CRITICAL';
                        return (
                          <div
                            key={a._id || a.id || i}
                            className="group flex items-start justify-between gap-2.5 p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-left"
                          >
                            <div
                              onClick={() => { setShowFeed(false); navigate('/alerts'); }}
                              className="flex-1 cursor-pointer min-w-0"
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                                    isDisaster
                                      ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                                      : isCritical
                                      ? 'bg-red-500/15 text-red-600 border border-red-500/30'
                                      : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                  }`}
                                >
                                  {a.severity || 'ALERT'}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                  {a.type}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                {a.title}
                              </p>
                              {a.message && a.message !== a.title && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                  {a.message}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissAlert(a._id || a.id);
                              }}
                              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Clear / Dismiss this notification from database"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <button
                    type="button"
                    onClick={() => { setShowFeed(false); navigate('/alerts'); }}
                    className="w-full py-2 px-3 text-center text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Alerts & SOS Center</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Emergency SOS Distress Beacon (Header - Synced with Bell style) */}
            <button
              onClick={() => {
                playRadioChirp();
                setShowSosModal(true);
              }}
              className="relative p-2 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Emergency SOS Distress Beacon"
              aria-label="Emergency SOS Beacon"
            >
              <Siren size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>



            {/* Dark / Light Theme Toggle */}
            <button
              onClick={toggle}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User Profile Chip with Dropdown */}
            <div ref={profileMenuRef} className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                title="Account profile & role switcher"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                  {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SA'}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                    {user?.fullName || 'SuperAdmin'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[130px]">
                    {user?.role === 'SuperAdmin' ? 'Operations Command' : user?.role || 'Operations Command'}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 hidden lg:block transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full z-[100] mt-2 w-72 rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl dark:border-slate-800 dark:bg-[#111a2e] animate-in fade-in zoom-in-95 duration-150">
                  <div className="border-b border-slate-100 pb-2 px-1 dark:border-slate-800">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{user?.fullName}</p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{user?.role} · {user?.station || 'Polar Command'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email || 'officer@polaris.moes.gov.in'}</p>
                  </div>

                  {/* Switch Role Section */}
                  <div className="py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1">
                      Switch Role (7 PRD Roles)
                    </p>
                    <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto pr-0.5">
                      {dbUsers.map(u => {
                        const active = user?.username === u.username;
                        return (
                          <button
                            key={u._id || u.username}
                            type="button"
                            onClick={async () => {
                              if (active) return;
                              setShowProfileMenu(false);
                              try {
                                await login(u.username, 'Test@123');
                                navigate('/command');
                              } catch (err) { alert('Failed to switch: ' + err.message); }
                            }}
                            className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-600/20 dark:text-blue-300'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-semibold truncate">{u.fullName || u.username}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{u.role} · {u.station || 'Base'}</p>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                              active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>{u.role ? u.role.slice(0, 2) : 'OP'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-1.5 flex flex-col gap-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowPw(true); setPwMsg(''); }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-colors w-full text-left cursor-pointer"
                    >
                      <KeyRound size={13} className="text-slate-400" />
                      <span>Change Password</span>
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); doLogout(); }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer font-semibold"
                    >
                      <LogOut size={13} />
                      <span>Logout Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Row 2: Polar Tactical Telemetry & HUD Sub-bar */}
        <div className="z-20 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white/70 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-[#0d1424]/80 text-xs">
          {/* Polar Satellite Link Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Radio size={12} />
            <span>SAT-LINK: IRIDIUM NEXT</span>
            <span className="text-emerald-400/80 dark:text-emerald-500/80">•</span>
            <span className="font-normal text-emerald-600 dark:text-emerald-300">Synced</span>
          </div>

          {/* Tactical Weather & Telemetry Pills matching SAT-LINK style */}
          <div className="hidden xl:flex items-center gap-2">
            {/* Real Satellite Temperature Pill */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300"
              title={`Station: ${liveWeather?.primaryStation || 'Bharati Station'} | Real Satellite ECMWF data | Barometer: ${liveWeather?.current?.pressureHpa || 973.4} hPa`}
            >
              <Thermometer size={12} className="text-sky-600 dark:text-sky-400" />
              <span>{liveWeather?.current?.temperature !== undefined ? `${liveWeather.current.temperature}°C` : '-19.1°C'}</span>
              <span className="text-sky-600/70 dark:text-sky-400/70 font-normal text-[10px]">
                (Chill {liveWeather?.current?.apparentTemperature !== undefined ? `${liveWeather.current.apparentTemperature}°C` : '-24.9°C'})
              </span>
            </div>

            {/* Real Wind & Gale Pill */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
              title={`Wind: ${liveWeather?.current?.windKmh || 12.6} km/h | Status: ${liveWeather?.current?.stormStatus || 'Nominal Calm'}`}
            >
              <Wind size={12} className="text-amber-600 dark:text-amber-400" />
              <span>
                {liveWeather?.current?.windKnots !== undefined ? `${liveWeather.current.windKnots}kt` : '7kt'}{' '}
                {liveWeather?.current?.stormStatus ? liveWeather.current.stormStatus.split(' ')[0] : 'Nominal'}
              </span>
            </div>

            {/* Latency Pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
              <Activity size={12} className="text-teal-600 dark:text-teal-400" />
              <span>142ms Lock</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Command Palette Trigger */}
          <button
            onClick={() => setShowCmdPalette(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700/80"
          >
            <Terminal size={12} className="text-cyan-600 dark:text-cyan-400" />
            <span>Command</span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-200/80 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Blizzard Mode Toggle */}
          <button
            onClick={() => {
              playRadioChirp();
              setIsBlizzard(v => !v);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              isBlizzard
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:text-slate-400'
            }`}
          >
            <Snowflake size={12} className={isBlizzard ? 'animate-spin' : ''} />
            <span>Blizzard</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleAudio}
            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-transparent dark:text-slate-400"
            title={muted ? 'Unmute tactical audio' : 'Mute tactical audio'}
          >
            {muted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} className="text-cyan-600 dark:text-cyan-400" />}
          </button>

          <SearchBox />
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-24 md:p-6 md:pb-8">{children}</main>

        {/* Minimal Premium Floating AI Copilot Trigger (Synced with Sidebar Theme Palette) */}
        <button
          onClick={() => setShowCopilot(v => !v)}
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white hover:bg-blue-50/80 text-blue-600 dark:bg-[#0d1424] dark:hover:bg-[#131d33] dark:text-cyan-400 shadow-lg hover:shadow-xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400/60 dark:hover:border-cyan-500/50 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 group"
          title="POLARIS AI Copilot (Ctrl+J)"
          aria-label="Open POLARIS AI Copilot"
        >
          <Bot size={22} className="text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
        </button>

        {/* Polaris AI Copilot Modal/Drawer */}
        <PolarisCopilot
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
          liveWeather={liveWeather}
        />

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
