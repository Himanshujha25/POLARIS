import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-slate-800 dark:bg-[#111a2e] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent = 'text-cyan-500' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <span className={accent}>{icon}</span>}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </Card>
  );
}

const pillColors = {
  CriticalDepletion: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  DISASTER: 'bg-red-600 text-white',
  Exhausted: 'bg-red-600 text-white',
  Warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Optimal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  Operational: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  INFO: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  SOS_Alert: 'bg-red-600 text-white',
  FieldResearch: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  InTransit: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  DelayedWeather: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  DeliveredStation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  ScheduledMaintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

export function Pill({ value }) {
  const cls = pillColors[value] || 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{value}</span>;
}

export function TableWrap({ children }) {
  return <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">{children}</div>;
}

export function Th({ children }) {
  return <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-sm text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
    </div>
  );
}

export function Empty({ text = 'No records found' }) {
  return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{text}</p>;
}

export function Modal({ 
  title, 
  onClose, 
  children, 
  footer,
  className = '', 
  maxWidth = 'max-w-lg',
  bodyClassName = 'p-4 sm:p-5 overflow-y-auto' 
}) {
  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[88vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#111a2e] border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 shrink-0 bg-white dark:bg-[#111a2e]">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-xl leading-none flex items-center justify-center w-7 h-7"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className={`flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>

        {/* Fixed Footer if provided */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white';

export const btnPrimary =
  'rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-shadow duration-200 hover:bg-cyan-500 hover:shadow-sm disabled:opacity-50';

export const btnGhost =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-shadow duration-200 hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

export const btnDanger =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-shadow duration-200 hover:bg-red-500 hover:shadow-sm disabled:opacity-50';

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-400">{message}</p>;
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
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

/**
 * Universal Global Dropdown Component (Synchronized across the entire POLARIS app)
 * Replaces ugly unstyled native OS <select> with a smooth, dark/light synced popover menu
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  disabled = false,
  icon = null
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label, icon }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value ?? opt.label ?? '',
        label: opt.label ?? opt.value ?? '',
        icon: opt.icon ?? null,
        sub: opt.sub ?? null
      };
    }
    return { value: opt, label: String(opt), icon: null };
  });

  const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value)) || null;

  // Handle outside click & escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>}
          {selectedOpt?.icon && <span className="shrink-0">{selectedOpt.icon}</span>}
          <span className="truncate">
            {selectedOpt ? selectedOpt.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-cyan-500' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 min-w-[170px] max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          {normalizedOptions.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange && onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                  {opt.sub && <span className="text-[10px] text-slate-400 font-normal">({opt.sub})</span>}
                </div>
                {isSelected && <Check size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />}
              </button>
            );
          })}
          {normalizedOptions.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 italic text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Dropdown = CustomSelect;
export const Select = CustomSelect;
