import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api';

const GROUP_LABEL = { expeditions: 'Expeditions', cargos: 'Cargo', assets: 'Assets', personnel: 'Personnel', inventory: 'Inventory', incidents: 'Incidents', locations: 'Locations' };
const GROUP_LINK = {
  expeditions: (x) => `/expeditions/${x._id}`,
  cargos: () => '/cargo',
  assets: () => '/assets',
  personnel: () => '/personnel',
  inventory: () => '/inventory',
  incidents: (x) => `/incidents/${x._id}`,
  locations: () => '/locations'
};
const GROUP_TITLE = {
  expeditions: (x) => `${x.expeditionCode} — ${x.title}`,
  cargos: (x) => `${x.trackingNumber} — ${x.title}`,
  assets: (x) => `${x.assetTag} — ${x.name}`,
  personnel: (x) => `${x.badgeId} — ${x.userId?.fullName || ''}`,
  inventory: (x) => `${x.itemName} (${x.station})`,
  incidents: (x) => `${x.incidentCode} — ${x.type}`,
  locations: (x) => x.name
};

export default function SearchBox({ onOpenPalette }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    try {
      setResults(await api(`/api/v1/search?q=${encodeURIComponent(q.trim())}`));
      setOpen(true);
    } catch { setResults(null); }
  };

  const total = results ? Object.values(results).reduce((s, a) => s + a.length, 0) : 0;

  return (
    <div className="relative">
      <form
        onSubmit={search}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 transition-all focus-within:border-cyan-500/70 focus-within:bg-white focus-within:ring-1 focus-within:ring-cyan-500/30 dark:border-slate-800 dark:bg-slate-900/60 dark:focus-within:bg-[#0d1424]"
      >
        <Search size={15} className="shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search ops, assets, cargo…"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
          className="w-24 border-0 border-none bg-transparent text-xs font-medium shadow-none outline-none ring-0 placeholder:text-slate-400 text-slate-800 focus:border-none focus:outline-none focus:ring-0 dark:text-slate-200 sm:w-36 md:w-44 lg:w-52"
        />
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-300/80 bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-cyan-300"
            title="Open Full Command Terminal (Ctrl+K or /)"
          >
            Ctrl+K
          </button>
        )}
      </form>
      {open && results && (
        <div className="absolute right-0 top-10 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-[#111a2e]">
          <div className="flex items-center justify-between p-1">
            <p className="text-xs font-bold">{total} result(s)</p>
            <button onClick={() => setOpen(false)} className="text-xs text-slate-500">✕</button>
          </div>
          {Object.entries(results).map(([group, items]) => items.length > 0 && (
            <div key={group} className="mt-1">
              <p className="px-1 text-[11px] font-semibold uppercase text-slate-400">{GROUP_LABEL[group]}</p>
              {items.map(x => (
                <Link key={x._id} to={GROUP_LINK[group](x)} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  {GROUP_TITLE[group](x)}
                </Link>
              ))}
            </div>
          ))}
          {total === 0 && <p className="p-2 text-sm text-slate-500">No matches</p>}
        </div>
      )}
    </div>
  );
}
