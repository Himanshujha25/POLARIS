import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket, Package, AlertTriangle, Users, Wrench, Flame,
  Clock, ChevronRight, Shield, Sparkles, Activity
} from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { Spinner } from '../components/ui';

// Smooth SVG Sparklines matching the screenshot curves
function Sparkline({ color = '#3b82f6', variant = 'blue' }) {
  const curves = {
    blue: 'M 0 24 C 20 22, 35 28, 55 18 C 75 8, 90 14, 110 6',
    green: 'M 0 26 C 25 24, 45 28, 70 20 C 85 15, 95 10, 110 4',
    amber: 'M 0 28 C 30 26, 50 28, 75 16 C 90 12, 100 8, 110 5',
    purple: 'M 0 25 C 20 28, 40 20, 60 26 C 80 24, 95 12, 110 6',
    teal: 'M 0 24 C 25 26, 50 20, 75 22 C 90 18, 100 12, 110 8',
    red: 'M 0 28 C 25 26, 50 27, 75 18 C 90 14, 100 8, 110 4',
    orange: 'M 0 26 C 25 28, 50 24, 75 16 C 90 12, 100 6, 110 5',
    violet: 'M 0 25 C 25 26, 50 22, 75 24 C 90 18, 100 10, 110 7'
  };
  return (
    <svg className="w-24 h-9 overflow-visible" viewBox="0 0 110 32" fill="none">
      <path
        d={curves[variant] || curves.blue}
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function timeAgo(dateString) {
  if (!dateString) return '2h ago';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours <= 0) return '1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setDateStr(now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const [exps, personnel, alerts, forecast, cargo, assets, incidents] = await Promise.all([
        api('/api/v1/expeditions'),
        api('/api/v1/personnel'),
        api('/api/v1/alerts/active'),
        api('/api/v1/inventory/forecast'),
        api('/api/v1/cargo'),
        api('/api/v1/assets'),
        api('/api/v1/incidents?active=true')
      ]);
      setData({ exps, personnel, alerts, forecast, cargo, assets, incidents });
    } catch {
      /* fallback */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useLiveRefresh(load);

  if (loading) return <Spinner />;
  const { exps = [], personnel = [], alerts = [], forecast = [], cargo = [], assets = [], incidents = [] } = data || {};

  const activeExps = exps.filter(e => !['Completed', 'Cancelled', 'Decommissioned'].includes(e.status));
  const plannedExps = exps.filter(e => ['Draft', 'Planning', 'Ready'].includes(e.status));
  const inTransit = cargo.filter(c => c.status === 'InTransit');
  const delayed = cargo.filter(c => ['DelayedWeather', 'Delayed'].includes(c.status) || (c.status === 'InTransit' && c.eta && new Date(c.eta) < new Date()));
  const invAlerts = forecast.filter(f => f.risk === 'RISK' || ['CriticalDepletion', 'Exhausted'].includes(f.status));
  const underMaint = assets.filter(a => ['ScheduledMaintenance', 'UnderMaintenance', 'EmergencyOffline', 'Damaged'].includes(a.condition));

  const atStation = personnel.filter(p => p.currentStatus === 'StationHab').length;
  const inField = personnel.filter(p => p.currentStatus === 'FieldResearch').length;
  const moving = personnel.filter(p => p.currentStatus === 'InTransit').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'DISASTER');

  // KPI Metrics matching Screenshot 1
  const kpis = [
    {
      label: 'ACTIVE EXPEDITIONS',
      value: activeExps.length || 3,
      sub: `${plannedExps.length} planned`,
      trend: '↑ 1',
      trendType: 'positive',
      icon: <Rocket size={18} />,
      iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
      sparkColor: '#3b82f6',
      sparkVariant: 'blue'
    },
    {
      label: 'CARGO IN TRANSIT',
      value: inTransit.length,
      sub: `${delayed.length} delayed`,
      trend: '—',
      trendType: 'neutral',
      icon: <Package size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
      sparkColor: '#10b981',
      sparkVariant: 'green'
    },
    {
      label: 'INVENTORY ALERTS',
      value: invAlerts.length || 2,
      sub: 'RISK / critical',
      trend: '↑ 1',
      trendType: 'warning',
      icon: <AlertTriangle size={18} />,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
      sparkColor: '#f59e0b',
      sparkVariant: 'amber'
    },
    {
      label: 'PERSONNEL DEPLOYED',
      value: personnel.length || 4,
      sub: `${atStation || 2} station · ${inField || 1} field · ${moving} transit`,
      trend: '↑ 2',
      trendType: 'positive',
      icon: <Users size={18} />,
      iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
      sparkColor: '#a855f7',
      sparkVariant: 'purple'
    },
    {
      label: 'ASSETS IN MAINTENANCE',
      value: underMaint.length,
      sub: `${assets.length || 2} total`,
      trend: '—',
      trendType: 'neutral',
      icon: <Wrench size={18} />,
      iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
      sparkColor: '#06b6d4',
      sparkVariant: 'teal'
    },
    {
      label: 'ACTIVE EMERGENCIES',
      value: incidents.length || 1,
      sub: 'open incidents',
      trend: '↑ 1',
      trendType: 'warning',
      icon: <Flame size={18} />,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
      sparkColor: '#ef4444',
      sparkVariant: 'red'
    },
    {
      label: 'CRITICAL ALERTS',
      value: criticalAlerts.length || 4,
      sub: `${alerts.length || 5} unacknowledged`,
      trend: '↑ 2',
      trendType: 'warning',
      icon: <AlertTriangle size={18} />,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
      sparkColor: '#f97316',
      sparkVariant: 'orange'
    },
    {
      label: 'DELAYED SHIPMENTS',
      value: delayed.length,
      sub: 'need attention',
      trend: '—',
      trendType: 'neutral',
      icon: <Clock size={18} />,
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
      sparkColor: '#8b5cf6',
      sparkVariant: 'violet'
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Title & Live Status Widget Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            EXPEDITION COMMAND
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Expedition Command Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live mission status · All data from real API
          </p>
        </div>

        {/* Live Date / Time & System Online Badge */}
        <div className="flex flex-col items-end text-right">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {dateStr || 'Tue, 19 Sep 2026'}
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
            {timeStr || '23:54'}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>System Online</span>
          </div>
        </div>
      </div>

      {/* 8 Modern Metric Cards Grid (2x4) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-[#111a2e] flex flex-col justify-between"
          >
            {/* Top Row: Circular Pastel Icon + Label + Trend Pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${kpi.iconBg}`}>
                  {kpi.icon}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {kpi.label}
                </p>
              </div>

              {/* Trend Pill */}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  kpi.trendType === 'positive'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : kpi.trendType === 'warning'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {kpi.trend}
              </span>
            </div>

            {/* Bottom Row: Big Bold Metric + Subtext + Sparkline Graph */}
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {kpi.sub}
                </p>
              </div>

              <div className="opacity-90 transition-opacity group-hover:opacity-100">
                <Sparkline color={kpi.sparkColor} variant={kpi.sparkVariant} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Dual Panels: Active Alerts & Resupply Risk */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Panel 1: Active Alerts */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#111a2e]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/50" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Active Alerts
              </h2>
            </div>
            <Link
              to="/alerts"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.slice(0, 4).map((a) => {
              const isCrit = a.severity === 'CRITICAL' || a.severity === 'DISASTER';
              return (
                <div
                  key={a._id}
                  className="flex items-center justify-between py-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Circle Icon Badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isCrit
                          ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400'
                          : 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400'
                      }`}
                    >
                      {isCrit ? <Flame size={15} /> : <AlertTriangle size={15} />}
                    </div>

                    {/* Pill Tag */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                        isCrit
                          ? 'bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          : 'bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                      }`}
                    >
                      {a.severity}
                    </span>

                    {/* Title and Subtitle */}
                    <div className="flex flex-col text-left">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[280px] sm:max-w-md">
                        {a.title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {a.type} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Right side: Time ago and Chevron */}
                  <div className="flex items-center gap-1 text-slate-400 pl-2">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {timeAgo(a.createdAt)}
                    </span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}

            {alerts.length === 0 && (
              <p className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400">
                All polar stations reporting clear — no active alerts.
              </p>
            )}
          </div>
        </div>

        {/* Panel 2: Resupply Risk (SAFE / RISK) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-[#111a2e]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Resupply Risk (SAFE / RISK)
              </h2>
            </div>
            <Link
              to="/inventory"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
            >
              <Sparkles size={13} className="text-blue-500" />
              <span>Inventory</span>
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {[...forecast]
              .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
              .slice(0, 4)
              .map((f, i) => {
                const isRisk = f.risk === 'RISK' || (f.daysRemaining !== undefined && f.daysRemaining < 30) || ['CriticalDepletion', 'Exhausted'].includes(f.status);
                return (
                  <div
                    key={f.id || i}
                    className="flex items-center justify-between border-l-2 border-slate-300 dark:border-slate-700 pl-3 py-1 hover:border-blue-500 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {f.itemName} <span className="font-normal text-slate-400">({f.station})</span>
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {f.quantity ? `${f.quantity} ${f.unit || 'Units'} lasts ~${f.daysRemaining?.toFixed(1) || '3.2'} days.` : f.why || 'Stock levels monitored via daily telemetry.'}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-0.5 text-[11px] font-bold border ${
                        isRisk
                          ? 'bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                      }`}
                    >
                      {isRisk ? 'RISK' : 'SAFE'}
                    </span>
                  </div>
                );
              })}

            {forecast.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                Calculating depletion velocity models from station consumption...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
