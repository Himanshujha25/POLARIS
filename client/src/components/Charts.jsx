import React, { useState } from 'react';

// WCAG 2.1 AA compliant colorblind-safe Federal / Government palette (No purple/pink AI slop)
const PALETTE = [
  '#2563eb', // Cobalt Blue (Primary)
  '#0d9488', // Deep Teal
  '#059669', // Forest Green
  '#d97706', // Warm Amber
  '#dc2626', // Crimson
  '#475569', // Slate
  '#0284c7', // Sky Blue
  '#4f46e5', // Deep Indigo
];

function formatLabel(str = '') {
  if (!str) return '';
  if (str.toLowerCase() === 'mechnical') return 'Mechanical';
  if (str.toLowerCase() === 'invnetory') return 'Inventory';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Interactive SVG Donut / Pie Chart
 * Minimal, crisp arcs with clear hover states, center metric, and clean percentage legend
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2" role="region" aria-label={title || "Chart"}>
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Status: 100% Nominal">
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
                stroke="#059669"
                strokeWidth={strokeWidth}
                strokeDasharray={`${2 * Math.PI * radius} ${2 * Math.PI * radius}`}
                strokeDashoffset={0}
                className="transition-all duration-200"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
              <span className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400 tracking-tight leading-none">
                0
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                ALL CLEAR
              </span>
              <span className="text-[10px] font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                100% NOMINAL
              </span>
            </div>
          </div>
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-emerald-950 dark:text-emerald-200">Zero Active Distress Incidents</span>
              </div>
              <span className="font-mono tabular-nums text-[10px] font-bold text-emerald-700 dark:text-emerald-400">100%</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 px-1 leading-relaxed text-pretty">
              No SAR emergencies or hazard flags recorded for this station sector. SAR response crews on nominal standby.
            </p>
          </div>
        </div>
      );
    }

    const radius = (size - strokeWidth) / 2;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2" role="region" aria-label={title || "Chart"}>
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={emptyLabel}>
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
            <span className="text-xl font-bold font-mono tabular-nums text-slate-400 dark:text-slate-500 tracking-tight leading-none">
              0
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              {emptyLabel}
            </span>
          </div>
        </div>
        <div className="flex-1 w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{emptyLabel}</p>
          <p className="text-xs leading-relaxed text-pretty">{emptySub}</p>
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2" role="region" aria-label={title || "Data visualization"}>
      {/* SVG Canvas */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 select-none"
          role="img"
          aria-label={title || 'Donut chart'}
        >
          {/* Subtle track background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
          />

          {slices.map((slice, i) => (
            <circle
              key={slice.rawLabel}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={hoveredIdx === i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              className="cursor-pointer transition-all duration-150"
              style={{
                opacity: hoveredIdx === null || hoveredIdx === i ? 1 : 0.65
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight leading-none">
            {activeSlice ? activeSlice.value : (centerValue || total)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1 max-w-[80px] truncate text-balance">
            {activeSlice ? activeSlice.label : (centerLabel || 'Total Units')}
          </span>
          {activeSlice && (
            <span className="text-[10px] font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400 mt-0.5">
              {activeSlice.percent}% of total
            </span>
          )}
        </div>
      </div>

      {/* Legend & Breakdown */}
      <div className="flex-1 w-full space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {slices.map((slice, i) => (
          <div
            key={slice.rawLabel}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              hoveredIdx === i
                ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="size-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="truncate">{slice.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] shrink-0">
              <span className="font-bold text-slate-900 dark:text-white">{slice.value}</span>
              <span className="text-[10px] text-slate-500">({slice.percent}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Interactive Horizontal Bar Graph with Solid Color Fills
 */
export function BarGraph({
  data = [],
  unit = '',
  maxVal = null,
  barColor = 'bg-blue-600 dark:bg-blue-500'
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-xs text-slate-500 italic">
        No metrics logged
      </div>
    );
  }

  const values = data.map(d => Number(d.value ?? d.total ?? 0));
  const highest = maxVal || Math.max(1, ...values);

  return (
    <div className="space-y-3 py-1" role="region" aria-label="Horizontal bar chart">
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
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 transition-colors">
                  {name}
                </span>
                {item.sub && (
                  <span className="text-[10px] text-slate-500 font-mono">({item.sub})</span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] shrink-0">
                <span className="font-bold text-slate-900 dark:text-white">
                  {val.toLocaleString()} {itemUnit}
                </span>
                <span className="text-[10px] text-slate-500">({pct}%)</span>
              </div>
            </div>

            {/* Bar Track & Fill */}
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full ${barColor} transition-all duration-200`}
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
  series = [] // [{ name: 'Fuel (kL)', data: [28, 61, 0], color: '#2563eb' }]
}) {
  const allValues = series.flatMap(s => s.data);
  const max = Math.max(1, ...allValues);

  return (
    <div className="space-y-4 pt-2" role="region" aria-label="Column chart">
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
                    className="relative group flex-1 max-w-[28px] rounded-t-md transition-all duration-200 hover:brightness-110"
                    style={{ height: `${hPct}%`, backgroundColor: s.color }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono tabular-nums whitespace-nowrap z-20 shadow-md">
                      {val.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[70px] text-center">
              {cat}
            </span>
          </div>
        ))}
      </div>

      {/* Series Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {series.map(s => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-xs" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
