import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-[#111a2e] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent = 'text-blue-600 dark:text-blue-400', trend = null, trendType = 'neutral' }) {
  return (
    <Card className="p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800/60">
              <span className={accent}>{icon}</span>
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trendType === 'positive'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                : trendType === 'warning'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

const pillColors = {
  CriticalDepletion: 'bg-rose-50 text-rose-600 border border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  CRITICAL: 'bg-rose-50 text-rose-600 border border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  DISASTER: 'bg-rose-600 text-white shadow-xs font-bold',
  Exhausted: 'bg-rose-600 text-white shadow-xs font-bold',
  RISK: 'bg-rose-50 text-rose-600 border border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  SAFE: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Warning: 'bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  WARNING: 'bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Optimal: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Operational: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  INFO: 'bg-sky-50 text-sky-600 border border-sky-200/70 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  SOS_Alert: 'bg-rose-600 text-white font-bold animate-pulse shadow-xs',
  FieldResearch: 'bg-cyan-50 text-cyan-700 border border-cyan-200/70 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
  StationHab: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  InTransit: 'bg-sky-50 text-sky-600 border border-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  DelayedWeather: 'bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  DeliveredStation: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  ScheduledMaintenance: 'bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Ready: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400',
  Active: 'bg-blue-50 text-blue-600 border border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400',
  Planned: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  Staged: 'bg-blue-50 text-blue-600 border border-blue-200/70 dark:bg-blue-500/15 dark:text-blue-400'
};

export function Pill({ value }) {
  const cls = pillColors[value] || 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{value}</span>;
}

export function TableWrap({ children }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-[#111a2e]">{children}</div>;
}

export function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap bg-slate-50/80 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400 ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 border-b border-slate-100 last:border-0 dark:border-slate-800/60 dark:text-slate-200 ${className}`}>{children}</td>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  );
}

export function Empty({ text = 'No records found' }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{text}</p>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#111a2e] sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white';

export const btnPrimary =
  'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-500 hover:shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer';

export const btnGhost =
  'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer';

export const btnDanger =
  'rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-rose-500 active:scale-98 disabled:opacity-50 cursor-pointer';

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-500/10 dark:text-rose-400">{message}</p>;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className={btnGhost}>Cancel</button>
        <button onClick={onConfirm} disabled={busy} className={btnDanger}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  align = 'left'
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const items = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) return opt;
    return { value: opt, label: opt };
  });

  const activeItem = items.find(i => String(i.value) === String(value)) || items[0];

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800 cursor-pointer min-w-[140px]"
      >
        <span className="truncate">{activeItem?.label || placeholder}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180 text-blue-500' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-50 mt-1.5 min-w-full w-max max-w-xs rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-[#111a2e] animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="max-h-60 overflow-y-auto pr-0.5 space-y-0.5">
            {items.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between gap-3 w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-600/20 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
