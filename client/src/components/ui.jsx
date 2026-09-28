import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#111a2e] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, accent = 'text-blue-600 dark:text-blue-400' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-balance">{label}</p>
        {icon && <span className={`${accent} shrink-0`} aria-hidden="true">{icon}</span>}
      </div>
      <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 text-pretty">{sub}</p>}
    </Card>
  );
}

// Government-grade high-contrast status tokens (WCAG 2.1 AA compliant contrast >= 4.5:1)
const pillColors = {
  CriticalDepletion: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  CRITICAL: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  DISASTER: 'bg-red-600 text-white border-red-700',
  Exhausted: 'bg-red-600 text-white border-red-700',
  Warning: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  WARNING: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Optimal: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Operational: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  INFO: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  SOS_Alert: 'bg-red-600 text-white border-red-700',
  FieldResearch: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  InTransit: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  DelayedWeather: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  DeliveredStation: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  ScheduledMaintenance: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
};

export function Pill({ value }) {
  const cls = pillColors[value] || 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      {value}
    </span>
  );
}

export function TableWrap({ children, ariaLabel = 'Data table' }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel}
      className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-800 dark:bg-[#111a2e]"
    >
      {children}
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap bg-slate-50 px-3.5 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-900/70 dark:text-slate-300 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`whitespace-nowrap px-3.5 py-2.5 text-sm tabular-nums text-slate-800 dark:text-slate-200 ${className}`}>
      {children}
    </td>
  );
}

export function Spinner({ label = 'Loading data...' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-2 py-10">
      <div className="size-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400" />
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

// Structural skeletons for loading states (Baseline UI requirement)
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200/80 dark:bg-slate-800 ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-5 rounded-full" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40" />
    </Card>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full rounded-xl border border-slate-200 p-4 space-y-3 dark:border-slate-800">
      <div className="flex gap-4 border-b border-slate-100 pb-3 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Baseline UI: MUST give empty states one clear next action
export function Empty({ text = 'No records found', actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-balance">{text}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
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
  const modalRef = useRef(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs dark:bg-slate-950/80"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidth} max-h-[90dvh] flex flex-col rounded-xl bg-white shadow-xl dark:bg-[#111a2e] border border-slate-200 dark:border-slate-800 ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 shrink-0 bg-white dark:bg-[#111a2e]">
          <h2 id="modal-title" className="text-base font-bold text-slate-900 dark:text-white truncate pr-2 text-balance">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div className={`flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/80 dark:bg-slate-900/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children }) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-500';

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';

export const btnGhost =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';

export const btnDanger =
  'inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer';

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}

// Accessible AlertDialog for destructive actions (Baseline UI requirement)
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-700 dark:text-slate-300 text-pretty">{message}</p>
      <div className="mt-5 flex justify-end gap-2.5">
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={btnDanger}>
          {busy ? 'Processing…' : confirmLabel}
        </button>
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
 * Universal Global Accessible Dropdown Component (WAI-ARIA combobox/listbox pattern)
 */
export function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  disabled = false,
  icon = null,
  ariaLabel = 'Select option'
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
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
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-slate-400 shrink-0" aria-hidden="true">{icon}</span>}
          {selectedOpt?.icon && <span className="shrink-0" aria-hidden="true">{selectedOpt.icon}</span>}
          <span className="truncate">
            {selectedOpt ? selectedOpt.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 z-50 mt-1 min-w-[180px] max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {normalizedOptions.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange && onChange(opt.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0" aria-hidden="true">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                  {opt.sub && <span className="text-[10px] text-slate-500 font-normal">({opt.sub})</span>}
                </div>
                {isSelected && <Check size={14} className="text-blue-700 dark:text-blue-300 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
          {normalizedOptions.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-500 italic text-center">
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
