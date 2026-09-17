export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111a2e] ${className}`}>
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
  return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">{children}</div>;
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

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-[#111a2e] sm:rounded-2xl sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
        </div>
        {children}
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
  'rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50';

export const btnGhost =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';
