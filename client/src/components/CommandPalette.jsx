import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Users, Compass, ShieldAlert, Boxes, Wrench,
  Package, Activity, Siren, Volume2, Snowflake, ArrowRight, X
} from 'lucide-react';
import { api } from '../lib/api';
import { playRadioChirp, startSiren, stopSiren } from '../lib/audio';

export default function CommandPalette({ isOpen, onClose, onToggleBlizzard, isBlizzard }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [personnel, setPersonnel] = useState([]);
  const [stations, setStations] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      api('/api/v1/personnel/active-locations')
        .then(res => setPersonnel(res || []))
        .catch(() => {});
      api('/api/v1/locations/map')
        .then(res => setStations(res?.stations || []))
        .catch(() => {});
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global keybindings: Ctrl+K or / or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        onClose(true);
      } else if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const QUICK_PAGES = [
    { title: 'Polar Tactical Map', path: '/map', icon: Compass, category: 'Navigation' },
    { title: 'Expeditions Command Hub', path: '/expeditions', icon: Activity, category: 'Operations' },
    { title: 'Station Assets & Telematics', path: '/assets', icon: Wrench, category: 'Logistics' },
    { title: 'Central Inventory & Life Support', path: '/inventory', icon: Boxes, category: 'Logistics' },
    { title: 'Cargo Manifest & Custody', path: '/cargo', icon: Package, category: 'Logistics' },
    { title: 'Alerts & Emergency Dispatch', path: '/alerts', icon: ShieldAlert, category: 'Safety' },
    { title: 'Incident Response Command', path: '/incidents', icon: Siren, category: 'Safety' },
    { title: 'Base Stations & Mapped Hubs', path: '/locations', icon: MapPin, category: 'Navigation' }
  ];

  const matchedPages = QUICK_PAGES.filter(p => !q || p.title.toLowerCase().includes(q));
  const matchedPersonnel = personnel.filter(p => !q || p.badgeId.toLowerCase().includes(q) || (p.currentLocation && p.currentLocation.toLowerCase().includes(q)));
  const matchedStations = stations.filter(s => !q || s.name.toLowerCase().includes(q));

  const handleSelect = (path) => {
    playRadioChirp();
    navigate(path);
    onClose(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 dark:bg-slate-950/75 backdrop-blur-sm p-4 transition-all"
      onClick={() => onClose(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white dark:border-cyan-500/30 dark:bg-[#111a2e] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/50">
          <Search size={18} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, badge ID (e.g. BHR-1), station, or jump to page..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 outline-none font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-200/70 border border-slate-300 rounded dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700">
            ESC
          </kbd>
          <button
            onClick={() => onClose(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 flex flex-col gap-1 text-xs">
          {/* Quick Action Commands */}
          <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Actions
          </div>
          <button
            onClick={() => {
              onToggleBlizzard?.();
              onClose(false);
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 transition-all text-left"
          >
            <span className="flex items-center gap-2">
              <Snowflake size={14} className="text-cyan-600 dark:text-cyan-400" />
              <span>Toggle Polar Blizzard Mode (Extreme High-Contrast)</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              {isBlizzard ? 'ACTIVE' : 'OFF'}
            </span>
          </button>
          <button
            onClick={() => {
              startSiren();
              setTimeout(stopSiren, 2500);
              onClose(false);
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/15 dark:hover:text-red-400 transition-all text-left"
          >
            <span className="flex items-center gap-2">
              <Siren size={14} className="text-red-600 dark:text-red-400" />
              <span>Test Emergency Klaxon Alarm Siren (2.5s Audio Pulse)</span>
            </span>
            <Volume2 size={13} className="text-slate-400 dark:text-slate-500" />
          </button>

          {/* Personnel Matches */}
          {matchedPersonnel.length > 0 && (
            <>
              <div className="px-2 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Crew Members & Field Telemetry ({matchedPersonnel.length})
              </div>
              {matchedPersonnel.slice(0, 5).map(p => (
                <button
                  key={p._id}
                  onClick={() => handleSelect(`/map?badge=${p.badgeId}`)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <Users size={14} className="text-cyan-600 dark:text-cyan-400" />
                    <span className="font-bold font-mono text-cyan-600 dark:text-cyan-300">{p.badgeId}</span>
                    <span className="text-slate-500 dark:text-slate-400">({p.currentStatus})</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-[200px]">· {p.currentLocation || 'Field'}</span>
                  </span>
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                    Locate on Radar <ArrowRight size={11} />
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Station Matches */}
          {matchedStations.length > 0 && (
            <>
              <div className="px-2 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Stations & Polar Outposts
              </div>
              {matchedStations.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelect('/map')}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                    <span className="text-slate-400 dark:text-slate-500">({s.type})</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    {s.lat.toFixed(2)}°, {s.lng.toFixed(2)}°
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Pages */}
          <div className="px-2 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Operations & Navigation
          </div>
          {matchedPages.map(p => (
            <button
              key={p.path}
              onClick={() => handleSelect(p.path)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-cyan-500/15 dark:hover:text-cyan-300 transition-all text-left"
            >
              <span className="flex items-center gap-2">
                <p.icon size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium">{p.title}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{p.category}</span>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/90 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 flex items-center justify-between font-mono">
          <span>Navigate with mouse or keyboard</span>
          <span>POLARIS Command 2.0</span>
        </div>
      </div>
    </div>
  );
}
