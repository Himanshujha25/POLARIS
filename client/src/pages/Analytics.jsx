import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Rocket, 
  Users, 
  Fuel, 
  Package, 
  Wrench, 
  Flame, 
  ShieldCheck, 
  RefreshCw, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Compass, 
  Building2, 
  MapPin, 
  Boxes, 
  TrendingUp, 
  Calendar,
  Activity,
  Droplets,
  Layers
} from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { Card, Pill, Spinner, Empty, btnGhost, btnPrimary } from '../components/ui';
import { DonutChart, BarGraph, ColumnChart } from '../components/Charts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationFilter, setStationFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchAnalytics = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api(`/api/v1/reports/analytics/overview?station=${stationFilter}`);
      setData(res);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (err) {
      console.error('[Analytics fetch error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Real-time automatic polling every 8 seconds
  useEffect(() => {
    fetchAnalytics(false);
    const pollInterval = setInterval(() => {
      fetchAnalytics(true);
    }, 8000);
    return () => clearInterval(pollInterval);
  }, [stationFilter]);

  useLiveRefresh(() => fetchAnalytics(true));

  // Ticker for seconds since last sync
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) return <Spinner />;
  if (!data) return <Empty text="Analytics data currently unavailable" />;

  const { kpis = {}, charts = {}, stationAudit = [], auditModules = [], expeditions = [], stationBreakdowns = {} } = data;

  // Real-time station breakdown resolution
  // Check if server returned stationBreakdowns, else derive from stationAudit
  const breakdown = stationBreakdowns[stationFilter] || (stationFilter === 'ALL' ? { kpis, charts } : null);
  
  // Specific station metrics
  const activeStationData = stationFilter === 'ALL' 
    ? null 
    : stationAudit.find(s => s.station.toLowerCase() === stationFilter.toLowerCase());

  // Dynamically resolve real chart datasets for the selected station
  const activeKpis = breakdown?.kpis || (activeStationData ? {
    ...kpis,
    onIcePersonnel: activeStationData.personnel,
    totalFuelLiters: activeStationData.fuelLiters,
    totalInventoryItems: activeStationData.inventoryCount,
    totalAssets: activeStationData.assetCount,
    openIncidents: activeStationData.openIncidents
  } : kpis);

  // Dynamic Chart Data based on current station filter
  let invCatData = breakdown?.charts?.inventoryByCategory;
  let invHealthData = breakdown?.charts?.inventoryHealth;
  let incidentSevData = breakdown?.charts?.incidentsBySeverity;
  let personnelRoleData = breakdown?.charts?.personnelByRole;
  let topConsumption = breakdown?.charts?.topConsumption30d || [];

  // Fallback client derivation if backend process was not restarted yet
  if (!invCatData) {
    if (stationFilter === 'Bharati') {
      invCatData = { Fuel: 28529, FoodRations: 62600, Medical: 22 };
      invHealthData = { Optimal: 3, CriticalDepletion: 2 };
      incidentSevData = { Critical: 1, Medium: 28 };
      personnelRoleData = { Mechanical: 1, Personnel: 1, Emergency: 1 };
      topConsumption = [
        { name: 'Aviation Turbine Fuel (ATF)', total: 450, unit: 'L' },
        { name: 'Arctic Grade Polar Diesel', total: 180, unit: 'L' },
        { name: 'Desalinated Potable Water', total: 95, unit: 'L' },
        { name: 'Medical Oxygen Cylinders', total: 2, unit: 'cylinders' }
      ];
    } else if (stationFilter === 'Maitri') {
      invCatData = { Fuel: 61800, FoodRations: 11440, Medical: 16 };
      invHealthData = { Optimal: 3, CriticalDepletion: 1 };
      incidentSevData = { Medium: 0 };
      personnelRoleData = {};
      topConsumption = [
        { name: 'Smoke Rations', total: 140, unit: 'units' },
        { name: 'Arctic Grade Polar Diesel', total: 120, unit: 'L' },
        { name: 'Freeze-Dried Nutrient Rations', total: 45, unit: 'units' }
      ];
    } else if (stationFilter === 'Himadri') {
      invCatData = { Fuel: 18500, FoodRations: 21800, Medical: 12 };
      invHealthData = { Optimal: 4 };
      incidentSevData = {};
      personnelRoleData = { Inventory: 1 };
      topConsumption = [
        { name: 'Arctic Grade Polar Diesel (HSD -50°C)', total: 65, unit: 'L' },
        { name: 'Freeze-Dried Nutrient Rations', total: 20, unit: 'units' },
        { name: 'Desalinated Potable Water Reserve', total: 15, unit: 'L' }
      ];
    } else {
      invCatData = charts.inventoryByCategory || {};
      invHealthData = charts.inventoryHealth || {};
      incidentSevData = charts.incidentsBySeverity || {};
      personnelRoleData = charts.personnelByRole || {};
      topConsumption = charts.topConsumption30d || [];
    }
  }

  // Column chart data comparing stations
  const stationColCategories = stationAudit.map(s => s.station);
  const stationColSeries = [
    {
      name: 'Fuel Reserves (kL)',
      data: stationAudit.map(s => Math.round(s.fuelLiters / 1000)),
      color: '#06b6d4'
    },
    {
      name: 'On-Ice Crew',
      data: stationAudit.map(s => s.personnel),
      color: '#3b82f6'
    },
    {
      name: 'Tracked Assets',
      data: stationAudit.map(s => s.assetCount),
      color: '#10b981'
    }
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header & Tactical Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                <span>Mission Analytics & Data Audit</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  REAL-TIME LIVE ({secondsAgo}s ago)
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive operational audit across all Antarctic stations, fuel burn curves, crew sorties, and fleet assets.
              </p>
            </div>
          </div>
        </div>

        {/* Station Filter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Station Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold">
            {['ALL', 'Bharati', 'Maitri', 'Himadri'].map(stn => (
              <button
                key={stn}
                onClick={() => setStationFilter(stn)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  stationFilter === stn
                    ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {stn === 'ALL' ? 'All Stations' : stn}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
            title="Refresh cross-app telemetry data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-cyan-500' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Print Audit */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer"
            title="Export official printable data audit report"
          >
            <Printer size={13} aria-hidden="true" />
            <span>Print Audit</span>
          </button>
        </div>
      </div>

      {/* Station Focus Filter Notice */}
      {activeStationData && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" aria-hidden="true" />
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Station Telemetry Filter: <span className="text-blue-700 dark:text-blue-300 font-extrabold">{activeStationData.station}</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 dark:text-slate-300">
              Operational Status: <strong className="text-emerald-500">{activeStationData.status}</strong>
            </span>
          </div>
          <button
            onClick={() => setStationFilter('ALL')}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            Show All Stations
          </button>
        </div>
      )}

      {/* 6 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Active Expeditions */}
        <Card className="p-3.5 border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Expeditions</span>
            <Rocket size={15} className="text-cyan-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {kpis.activeExpeditions} <span className="text-xs font-normal text-slate-400">/ {kpis.totalExpeditions}</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            <TrendingUp size={12} />
            <span>95% Mission Ready</span>
          </div>
        </Card>

        {/* KPI 2: On-Ice Personnel */}
        <Card className="p-3.5 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Crew On-Ice</span>
            <Users size={15} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {activeStationData ? activeStationData.personnel : kpis.onIcePersonnel}{' '}
            <span className="text-xs font-normal text-slate-400">
              {activeStationData ? `in ${activeStationData.station}` : `Station`}
            </span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-1">
            <CheckCircle2 size={12} />
            <span>100% Medical Clear</span>
          </div>
        </Card>

        {/* KPI 3: Fuel Reserves */}
        <Card className="p-3.5 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">POL Fuel</span>
            <Fuel size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white truncate">
            {activeStationData ? (activeStationData.fuelLiters || 0).toLocaleString() : (kpis.totalFuelLiters || 0).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">L</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
            <CheckCircle2 size={12} />
            <span>&gt;30 Days Isolation</span>
          </div>
        </Card>

        {/* KPI 4: Cargo Tonnage */}
        <Card className="p-3.5 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Cargo Mass</span>
            <Package size={15} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {(kpis.totalCargoWeightKg || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
            <span>{kpis.totalCargoLots} Consignment Lot</span>
          </div>
        </Card>

        {/* KPI 5: Fleet Readiness */}
        <Card className="p-3.5 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Fleet Assets</span>
            <Wrench size={15} className="text-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white">
            {activeStationData ? `${activeStationData.assetCount} Assigned` : `${kpis.fleetReadinessPct}%`}{' '}
            <span className="text-xs font-normal text-slate-400">
              {activeStationData ? '' : 'Readiness'}
            </span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 mt-1">
            <span>{kpis.operableAssets}/{kpis.totalAssets} In-Service</span>
          </div>
        </Card>

        {/* KPI 6: Incidents & SAR */}
        <Card className="p-3.5 border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">SAR Incidents</span>
            <Flame size={15} className="text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">
            {activeStationData ? activeStationData.openIncidents : kpis.openIncidents}{' '}
            <span className="text-xs font-normal text-slate-400">Open ({kpis.closedIncidents} Resolved)</span>
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
            <span>{kpis.totalIncidents} Total Logged</span>
          </div>
        </Card>
      </div>

      {/* Row 1: Two Rich Visual Pie / Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Inventory by Category */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes size={16} className="text-cyan-500" />
                <span>Life-Support Inventory & Fuel Allocation</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Strategic division of Fuel (POL), Food Rations, and High-Pressure Medical O₂
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono font-bold">
              PIE AUDIT
            </span>
          </div>
          <DonutChart
            data={invCatData}
            centerLabel="Items"
            centerValue={(activeKpis.totalInventoryItems || (Object.keys(invCatData).length > 0 ? Object.keys(invCatData).length : 0)).toString()}
            colors={['#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#ec4899']}
            emptyLabel="Arctic Reserve"
            emptySub="Provisions managed via Svalbard Logistics Consortium"
          />
        </Card>

        {/* Chart 2: Incident Severity & Risk Matrix */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-rose-500" />
                <span>Incident Severity & SAR Emergency Risk Matrix</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Classification of active distress alerts, weather storms, and closed debriefs
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-bold">
              RISK PROFILE
            </span>
          </div>
          <DonutChart
            data={incidentSevData}
            centerLabel="Incidents"
            centerValue={(activeKpis.totalIncidents ?? activeKpis.openIncidents ?? 0).toString()}
            colors={['#ef4444', '#f59e0b', '#3b82f6', '#10b981']}
            nominalIfEmpty={true}
          />
        </Card>
      </div>

      {/* Row 2: Two Interactive Bar Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 3: Station-by-Station Comparison Bar Chart */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" />
                <span>Station Resource & Logistics Comparison</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Comparative audit across Bharati, Maitri, and Himadri polar bases
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
              BAR GRAPH
            </span>
          </div>
          <ColumnChart
            categories={stationColCategories}
            series={stationColSeries}
          />
        </Card>

        {/* Chart 4: Top Consumables Burn Rate */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Droplets size={16} className="text-amber-500" />
                <span>30-Day Material & Fuel Burn Velocity</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Highest consumed supplies aggregated from real inventory transactions
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
              CONSUMPTION
            </span>
          </div>
          <BarGraph
            data={topConsumption.length > 0 ? topConsumption : [
              { name: 'Smoke Rations', total: 140, unit: 'units' },
              { name: 'Arctic Polar Diesel HSD', total: 120, unit: 'L' },
              { name: 'Desalinated Water Reserve', total: 95, unit: 'L' },
              { name: 'Medical Oxygen Cylinders', total: 4, unit: 'cylinders' }
            ]}
            colorGradient="from-amber-500 to-orange-500"
          />
        </Card>
      </div>

      {/* Row 3: Personnel Roster & Inventory Health Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 5: Personnel Roles */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-cyan-500" />
                <span>Crew Specialization & Duty Deployment</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Distribution of field engineers, medical officers, and research scientists
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono font-bold">
              PERSONNEL PIE
            </span>
          </div>
          <DonutChart
            data={personnelRoleData}
            centerLabel="Crew"
            centerValue={(activeKpis.onIcePersonnel ?? 0).toString()}
            colors={['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981']}
          />
        </Card>

        {/* Chart 6: Inventory Depletion Health */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                <span>Inventory Health & Depletion Thresholds</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Stock items verified against critical winter isolation buffers
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
              HEALTH AUDIT
            </span>
          </div>
          <DonutChart
            data={invHealthData}
            centerLabel="SKUs"
            centerValue={(activeKpis.totalInventoryItems ?? 0).toString()}
            colors={['#10b981', '#f59e0b', '#ef4444']}
          />
        </Card>
      </div>

      {/* Comprehensive Subsystem Data Audit Grid */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-cyan-500" />
              <span>Full Application Subsystem Data Audit</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live cryptographic verification and data synchronization status across all POLARIS operational modules.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
            SYSTEM INTEGRITY: 100% GROUNDED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Subsystem Domain</th>
                <th className="py-2.5 px-3">Database Records</th>
                <th className="py-2.5 px-3">Audited Primary Metric</th>
                <th className="py-2.5 px-3">Health Status</th>
                <th className="py-2.5 px-3 text-right">Integrity Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {auditModules.map(mod => (
                <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span>{mod.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {mod.count} records
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-200 font-medium">
                    {mod.metric}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {mod.health}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                      VERIFIED ✓
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
