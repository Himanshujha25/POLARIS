import React, { useState } from 'react';

const PALETTE = [
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // purple-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

function formatLabel(str = '') {
  if (!str) return '';
  // Fix known typos or camelCase
  if (str.toLowerCase() === 'mechnical') return 'Mechanical';
  if (str.toLowerCase() === 'invnetory') return 'Inventory';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Interactive SVG Donut / Pie Chart
 * Minimal, crisp arcs with refined hover states, center metric, and clean percentage legend
 */
export function DonutChart({
  data = {},
  title = '',
  centerValue = '',
  centerLabel = '',
  size = 180,
  strokeWidth = 18,
  colors = PALETTE,
  nominalIfEmpty = false,
  emptyLabel = 'Standby Buffer',
  emptySub = 'Zero active records'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const rawEntries = Object.entries(data).filter(([, val]) => Number(val) > 0);
  const total = rawEntries.reduce((acc, [, val]) => acc + Number(val), 0);

  if (rawEntries.length === 0 || total === 0) {
    if (nominalIfEmpty) {
      const radius = (size - strokeWidth) / 2;
      return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-emerald-500/20 dark:text-emerald-500/10"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#10b981"
                strokeWidth={strokeWidth}
                strokeDasharray={`${2 * Math.PI * radius} ${2 * Math.PI * radius}`}
                strokeDashoffset={0}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                0
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mt-1">
                ALL CLEAR
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                100% NOMINAL
              </span>
            </div>
          </div>
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Zero Active Distress Incidents</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">100%</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 leading-relaxed">
              No SAR emergencies or hazard flags recorded for this station sector. SAR response crews on nominal standby.
            </p>
          </div>
        </div>
      );
    }

    const radius = (size - strokeWidth) / 2;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray="4 6"
              className="text-slate-200 dark:text-slate-800"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
            <span className="text-xl font-bold text-slate-400 dark:text-slate-500 tracking-tight leading-none">
              0
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
              {emptyLabel}
            </span>
          </div>
        </div>
        <div className="flex-1 w-full p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{emptyLabel}</p>
          <p className="text-[11px] leading-relaxed">{emptySub}</p>
        </div>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = rawEntries.map(([rawLabel, value], i) => {
    const val = Number(value);
    const percent = val / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -(accumulatedPercent * circumference);
    accumulatedPercent += percent;
    const color = colors[i % colors.length];
    const label = formatLabel(rawLabel);

    return {
      rawLabel,
      label,
      value: val,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      color
    };
  });

  const activeSlice = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
      {/* SVG Donut Circle */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
          />

          {/* Slices */}
          {slices.map((slice, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-200 ease-out cursor-pointer"
                style={{
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.35
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {activeSlice ? activeSlice.value.toLocaleString() : (centerValue || total.toLocaleString())}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-[120px] leading-tight truncate">
            {activeSlice ? activeSlice.label : (centerLabel || 'Total')}
          </span>
          {activeSlice && (
            <span className="text-[11px] font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {activeSlice.percent}%
            </span>
          )}
        </div>
      </div>

      {/* Interactive Legend with Percentages */}
      <div className="flex-1 w-full space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {slices.map((slice, i) => (
          <div
            key={slice.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              hoveredIdx === i
                ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {slice.value.toLocaleString()}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">
                {slice.percent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Interactive Horizontal Bar Graph with Gradient Fills and Tooltips
 */
export function BarGraph({
  data = [],
  unit = '',
  maxVal = null,
  colorGradient = 'from-cyan-500 to-blue-600'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-xs text-slate-400 italic">
        No metrics logged
      </div>
    );
  }

  const values = data.map(d => Number(d.value ?? d.total ?? 0));
  const highest = maxVal || Math.max(1, ...values);

  return (
    <div className="space-y-3 py-1">
      {data.map((item, i) => {
        const name = item.name || item._id || item.label || 'Item';
        const val = Number(item.value ?? item.total ?? 0);
        const itemUnit = item.unit || unit || '';
        const pct = Math.min(100, Math.round((val / highest) * 100));

        return (
          <div
            key={name + i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="group space-y-1 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-cyan-500 transition-colors">
                  {name}
                </span>
                {item.sub && (
                  <span className="text-[10px] text-slate-400 font-mono">({item.sub})</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                <span className="font-bold text-slate-900 dark:text-white">
                  {val.toLocaleString()} {itemUnit}
                </span>
                <span className="text-[10px] text-slate-400">({pct}%)</span>
              </div>
            </div>

            {/* Bar Track & Fill */}
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${colorGradient} transition-all duration-300 shadow-xs`}
                style={{
                  width: `${pct}%`,
                  opacity: hoveredIdx === null || hoveredIdx === i ? 1 : 0.65
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Vertical Columns Comparison Bar Chart
 */
export function ColumnChart({
  categories = [],
  series = [] // [{ name: 'Fuel (kL)', data: [28, 61, 0], color: '#06b6d4' }]
}) {
  const allValues = series.flatMap(s => s.data);
  const max = Math.max(1, ...allValues);

  return (
    <div className="space-y-4 pt-2">
      <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pb-2 px-2">
        {categories.map((cat, ci) => (
          <div key={cat} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full flex items-end justify-center gap-1.5 h-full max-h-36">
              {series.map(s => {
                const val = s.data[ci] || 0;
                const hPct = Math.max(4, Math.round((val / max) * 100));

                return (
                  <div
                    key={s.name}
                    className="relative group flex-1 max-w-[28px] rounded-t-md transition-all duration-300 hover:brightness-110"
                    style={{ height: `${hPct}%`, backgroundColor: s.color }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-mono font-bold whitespace-nowrap shadow-md z-20">
                      {val.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate text-center max-w-[80px]">
              {cat}
            </span>
          </div>
        ))}
      </div>

      {/* Series Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {series.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600 dark:text-slate-400 font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
