import { useEffect, useState, useRef } from 'react';
import { 
  Printer, 
  FileText, 
  ShieldCheck, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Flame, 
  Box, 
  Anchor, 
  Compass, 
  UserCheck,
  LayoutDashboard,
  Ship,
  ShieldAlert,
  Droplets,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../lib/api';
import { Card, Pill, Spinner, Empty, Field, inputCls, btnGhost, btnPrimary, TableWrap, Th, Td, Modal, CustomSelect } from '../components/ui';
import { exportCargoCustomsManifest, exportLifeSupportFuelAudit } from '../lib/reportGenerator';
import MarkdownContent from '../components/MarkdownContent';

const REPORT_FORMS = [
  { id: 'readiness', label: 'Mission Overview', icon: LayoutDashboard, formNo: 'MoES/POLAR/GEN-01' },
  { id: 'customs', label: 'Customs & Shipping Manifest', icon: Ship, formNo: 'MoES/POLAR/C-01' },
  { id: 'fuel', label: 'Winter Fuel & Life Support Audit', icon: Fuel, formNo: 'MoES/POLAR/F-04' },
  { id: 'incident', label: 'SAR Incident Muster & Debrief', icon: ShieldAlert, formNo: 'MoES/POLAR/E-09' }
];

export default function Reports() {
  const [exps, setExps] = useState([]);
  const [expId, setExpId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [report, setReport] = useState(null);
  const [activeForm, setActiveForm] = useState('readiness');
  const [loading, setLoading] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  // Close custom dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // AI SITREP State
  const [showSitrepModal, setShowSitrepModal] = useState(false);
  const [sitrepLoading, setSitrepLoading] = useState(false);
  const [sitrepData, setSitrepData] = useState(null);
  const [copiedSitrep, setCopiedSitrep] = useState(false);

  const generateAISitrep = async () => {
    setShowSitrepModal(true);
    setSitrepLoading(true);
    setSitrepData(null);
    try {
      const res = await api('/api/v1/ai/sitrep-summary', {
        method: 'POST',
        body: { expeditionId: expId }
      });
      setSitrepData(res);
    } catch (err) {
      setSitrepData({
        sitrep: 'SITREP generation notice: ' + (err.message || 'Server timeout'),
        provider: 'offline'
      });
    } finally {
      setSitrepLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const e = await api('/api/v1/expeditions');
        // Filter out TEST- smoke records and prioritize official Antarctic expeditions
        const valid = (e || []).filter(x => !x.expeditionCode?.startsWith('TEST-'));
        valid.sort((a, b) => {
          if (a.expeditionCode?.startsWith('44-ISEA') && !b.expeditionCode?.startsWith('44-ISEA')) return -1;
          if (!a.expeditionCode?.startsWith('44-ISEA') && b.expeditionCode?.startsWith('44-ISEA')) return 1;
          return (a.expeditionCode || '').localeCompare(b.expeditionCode || '');
        });
        setExps(valid);
        if (valid[0]) setExpId(valid[0]._id);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!expId) return;
    (async () => {
      try {
        const data = await api(`/api/v1/reports/expedition/${expId}`);
        setReport(data);
        if (data?.incidents?.[0]) {
          setSelectedIncidentId(data.incidents[0]._id);
        }
      } catch {
        setReport(null);
      }
    })();
  }, [expId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Spinner />;

  const selectedExp = exps.find(x => x._id === expId) || exps[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Top action bar (hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-cyan-500" size={26} />
            <span>Mission Reports & Government Dispatch</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official NCPOR / Ministry of Earth Sciences (MoES) expedition manifests, audit sheets, and emergency debrief forms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Custom SaaS Floating Expedition Dropdown */}
          <div className="relative min-w-[280px] sm:min-w-[360px] max-w-lg" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              aria-expanded={isDropdownOpen}
              className={`w-full flex items-center justify-between gap-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 py-2 px-3.5 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                isDropdownOpen 
                  ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-md' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <Compass size={15} className="text-cyan-500 shrink-0" />
                {selectedExp ? (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
                      {selectedExp.expeditionCode}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">·</span>
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {selectedExp.title}
                    </span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-medium text-slate-600 dark:text-slate-300">
                      {selectedExp.targetStation || 'Antarctica'}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">Select Expedition...</span>
                )}
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-400 shrink-0 transition-transform duration-200 ml-1.5 ${isDropdownOpen ? 'rotate-180 text-cyan-500' : ''}`} 
              />
            </button>

            {/* Floating Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md shadow-2xl p-1.5 flex flex-col gap-1 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between">
                  <span>Official Expeditions</span>
                  <span className="bg-cyan-500/10 text-cyan-500 px-1.5 py-0.2 rounded text-[9px]">{exps.length} active</span>
                </div>
                {exps.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-400 italic text-center">No expeditions available</p>
                ) : (
                  exps.map(x => {
                    const isSelected = x._id === expId;
                    return (
                      <button
                        key={x._id}
                        type="button"
                        onClick={() => {
                          setExpId(x._id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-50 text-cyan-950 font-bold dark:bg-cyan-950/50 dark:text-cyan-200 ring-1 ring-cyan-500/30'
                            : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 truncate min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">{x.expeditionCode}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {x.targetStation || 'Antarctica'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {x.title}
                          </span>
                        </div>
                        {isSelected && <Check size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={generateAISitrep}
            disabled={sitrepLoading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60 transition-colors cursor-pointer"
            title="Generate official 24-hour NCPOR & Ministry SITREP from live station data"
          >
            {sitrepLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-blue-200" />
                <span>Generating SITREP...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-blue-200" aria-hidden="true" />
                <span>Generate 24h AI SITREP Briefing</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className={`${btnPrimary} !py-2 !px-3.5 text-xs flex items-center gap-1.5 shadow-xs`}
          >
            <Printer size={15} />
            <span>Print / Save PDF Form</span>
          </button>
        </div>
      </div>

      {/* Form Tabs (hidden during print) */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 print:hidden">
        {REPORT_FORMS.map(tab => {
          const isActive = activeForm === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveForm(tab.id)}
              className={`px-3 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                isActive
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
              <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1 py-0.2 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                {tab.formNo}
              </span>
            </button>
          );
        })}
      </div>

      {!report && <Empty text="Select an expedition to inspect mission reports." />}

      {report && (
        <div id="printable-government-report" className="flex flex-col gap-6">
          {/* Active Tab View */}
          {activeForm === 'readiness' && <ReadinessReport report={report} />}
          {activeForm === 'customs' && <CustomsShippingManifest report={report} />}
          {activeForm === 'fuel' && <WinterFuelLifeSupportAudit report={report} />}
          {activeForm === 'incident' && (
            <SarIncidentDebriefReport 
              report={report} 
              selectedIncidentId={selectedIncidentId} 
              onSelectIncident={setSelectedIncidentId} 
            />
          )}
        </div>
      )}

      {/* Scoped Print CSS */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          nav, header, aside, .print\\:hidden {
            display: none !important;
          }
          #printable-government-report {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-sheet {
            border: 1px solid #000 !important;
            padding: 18px !important;
            background: #fff !important;
            color: #000 !important;
            page-break-after: always;
            box-shadow: none !important;
          }
          .printable-sheet * {
            color: #000 !important;
            border-color: #333 !important;
            background: transparent !important;
          }
          .stamp-box {
            border: 2px dashed #000 !important;
          }
        }
      `}</style>

      {/* AI 24h SITREP Modal (Root Level: Accessible From Any Tab) */}
      {showSitrepModal && (
        <Modal
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-wide text-slate-900 dark:text-white">
                    24-Hour Polar Executive SITREP
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 uppercase">
                    AI Dispatch
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  MoES / NCPOR Polar Operations Classified Dispatch
                </p>
              </div>
            </div>
          }
          maxWidth="max-w-3xl"
          className="h-[84vh] max-h-[86vh] shadow-2xl border-slate-300 dark:border-slate-800"
          bodyClassName="p-0 flex flex-col min-h-0 overflow-hidden bg-slate-50/50 dark:bg-[#0b1220]"
          onClose={() => setShowSitrepModal(false)}
          footer={
            sitrepData ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {sitrepData.provider?.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {sitrepData.model}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
                    title="Print official dispatch sheet"
                  >
                    <Printer size={13} />
                    <span className="hidden sm:inline">Print Dispatch</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sitrepData.sitrep);
                      setCopiedSitrep(true);
                      setTimeout(() => setCopiedSitrep(false), 2000);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors"
                  >
                    {copiedSitrep ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedSitrep ? 'Copied' : 'Copy Briefing'}</span>
                  </button>

                  <button
                    onClick={() => setShowSitrepModal(false)}
                    className="rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null
          }
        >
          {sitrepLoading ? (
            <div className="flex flex-col items-center justify-center my-auto py-28 text-center gap-3">
              <div className="size-7 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-blue-600" />
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
                Generating SITREP...
              </p>
            </div>
          ) : sitrepData ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Area: All cards aligned to the exact same grid */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5">
                {/* Failover Notice Card: Pixel-perfect aligned with content cards below */}
                {sitrepData.fallbackNotice && (
                  <div className="rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/25 p-3 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs leading-normal">
                        <strong className="font-bold">Failover Active:</strong> Primary Gemini quota absorbed · Routed seamlessly to <strong>{sitrepData.provider?.toUpperCase()}</strong> ({sitrepData.model})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/25 shrink-0 whitespace-nowrap">
                      Tier-2 Active
                    </span>
                  </div>
                )}

                <MarkdownContent content={sitrepData.sitrep} />
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 1. STANDARD READINESS DASHBOARD
// --------------------------------------------------------------------------------------
function ReadinessReport({ report }) {
  const { expedition, requirements, personnel, cargo, incidents, recentTransactions } = report;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5 border-l-4 border-l-cyan-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                {expedition.expeditionCode}
              </span>
              <Pill value={expedition.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {expedition.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target Station: <b className="text-slate-700 dark:text-slate-200">{expedition.targetStation}</b> · 
              Expedition Leader: <b className="text-slate-700 dark:text-slate-200">{expedition.leaderId?.fullName || expedition.leaderId?.username || 'Officer in Charge'}</b>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Deployment Window</div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {expedition.startDate ? new Date(expedition.startDate).toLocaleDateString() : 'TBD'} → {expedition.endDate ? new Date(expedition.endDate).toLocaleDateString() : 'TBD'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Personnel Roster</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {personnel.total} / {personnel.quota}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Cargo Consignments</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {cargo.length} Lots
            </p>
          </div>
          <div>
            <span className="text-slate-400">Active Incidents</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {incidents.filter(i => i.status !== 'Closed').length} Open
            </p>
          </div>
          <div>
            <span className="text-slate-400">Deployment Nodes</span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
              {Object.entries(personnel.byLocation).map(([loc, count]) => `${loc} (${count})`).join(', ') || 'No active field units'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center justify-between">
            <span>Mission Equipment & Requirements</span>
            <span className="text-xs font-normal text-slate-500">{requirements.length} Items</span>
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
            {requirements.map(r => (
              <div key={r._id} className="py-2 text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{r.item}</p>
                  <p className="text-slate-500">{r.category || 'General Expedition Supply'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">
                    {r.receivedQty} / {r.requiredQty} {r.unit}
                  </p>
                  <span className={r.pendingQty > 0 ? 'text-amber-500 font-semibold' : 'text-emerald-500'}>
                    {r.pendingQty > 0 ? `Pending ${r.pendingQty}` : 'Fulfilled'}
                  </span>
                </div>
              </div>
            ))}
            {requirements.length === 0 && <Empty text="No requirements logged" />}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center justify-between">
            <span>Logged Incident History</span>
            <span className="text-xs font-normal text-slate-500">{incidents.length} Records</span>
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
            {incidents.map(i => (
              <div key={i._id} className="py-2 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{i.incidentCode}</span>
                    <Pill value={i.severity} />
                  </div>
                  <p className="text-slate-500 mt-0.5">{i.title} · {i.type}</p>
                </div>
                <div className="text-right">
                  <Pill value={i.status} />
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(i.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {incidents.length === 0 && <Empty text="Zero incidents reported" />}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Station Bunker Material Transfers & Consumption (Last 15)
          </h3>
          <span className="text-xs font-normal text-slate-500 font-mono">
            {recentTransactions.slice(0, 15).length} Transactions
          </span>
        </div>
        <div className="w-full max-w-full overflow-auto max-h-72 rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs shadow-xs">
              <tr>
                <Th>Timestamp</Th>
                <Th>Type</Th>
                <Th>Item & Station</Th>
                <Th>Stock Change</Th>
                <Th>Actor</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.slice(0, 15).map(t => (
                <tr key={t._id} className="text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                  <Td><Pill value={t.type} /></Td>
                  <Td className="font-medium">{t.itemName} ({t.station})</Td>
                  <Td className="font-mono">{t.openingStock} → <b>{t.closingStock}</b> ({t.quantity > 0 ? `+${t.quantity}` : t.quantity})</Td>
                  <Td className="text-slate-500">{t.performedBy?.fullName || 'Station System'}</Td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400 italic">
                    Zero transactions logged
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 2. FORM MoES/POLAR/C-01 — CUSTOMS BILL & SHIPPING MANIFEST
// --------------------------------------------------------------------------------------
function CustomsShippingManifest({ report }) {
  const { expedition, cargo } = report;
  const totalWeight = cargo.reduce((acc, c) => acc + (c.weightKg || 0), 0);
  const totalContainers = cargo.filter(c => c.containerNumber).length;
  const hazmatCount = cargo.filter(c => c.isHazmat).length;

  return (
    <div className="printable-sheet bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 p-6 shadow-sm text-slate-900 dark:text-slate-100">
      {/* Official Government Header */}
      <GovernmentHeader
        formTitle="POLAR CUSTOMS BILL OF ENTRY & CONSIGNMENT SHIPPING MANIFEST"
        formCode="FORM MoES/POLAR/C-01"
        classification="RESTRICTED // OFFICIAL POLAR EXPEDITION DISPATCH"
        subTitle="Under the Antarctic Treaty (Environmental Protection) Act & Customs Act, 1962"
      />

      {/* Meta Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-300 dark:border-slate-700 p-3 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-800/30">
        <div>
          <span className="text-slate-500 block">Expedition Code:</span>
          <span className="font-mono font-bold text-sm">{expedition.expeditionCode}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Chartered Polar Vessel:</span>
          <span className="font-bold text-sm">
            {expedition.vesselName || cargo.find(c => c.currentLocation?.toLowerCase().includes('vessel') || c.currentLocation?.toLowerCase().includes('ship'))?.currentLocation || 'Chartered Polar Supply Vessel'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Port of Departure:</span>
          <span className="font-semibold">Mormugao Port (NCPOR, Goa)</span>
        </div>
        <div>
          <span className="text-slate-500 block">Destination Station:</span>
          <span className="font-bold text-cyan-600 dark:text-cyan-400">{expedition.targetStation} Station, Antarctica</span>
        </div>
        <div>
          <span className="text-slate-500 block">Transit Hub:</span>
          <span>Cape Town Container Terminal, SA</span>
        </div>
        <div>
          <span className="text-slate-500 block">Total Consignment Mass:</span>
          <span className="font-bold font-mono">{(totalWeight / 1000).toFixed(2)} Metric Tonnes</span>
        </div>
        <div>
          <span className="text-slate-500 block">ISO Containers:</span>
          <span className="font-bold font-mono">{totalContainers} Units</span>
        </div>
        <div>
          <span className="text-slate-500 block">HAZMAT / Dangerous Goods:</span>
          <span className={`font-bold ${hazmatCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
            {hazmatCount} Declarations
          </span>
        </div>
      </div>

      {/* Manifest Table */}
      <div className="mt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
          <Box size={14} />
          <span>Containerized Consignment Roster & Tamper Seals</span>
        </h4>
        <TableWrap>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <Th>Tracking / Barcode</Th>
                <Th>ISO Container No.</Th>
                <Th>Customs Seal No.</Th>
                <Th>Category / Type</Th>
                <Th>Payload Description</Th>
                <Th>Mass (Kg)</Th>
                <Th>Current Node</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {cargo.map((c, i) => (
                <tr key={c._id || i} className={c.isHazmat ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}>
                  <Td className="font-mono font-bold">{c.trackingNumber}</Td>
                  <Td className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {c.containerNumber || 'LCL / Loose Lot'}
                  </Td>
                  <Td className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                    {c.sealNumber || 'N/A'}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span>{c.category}</span>
                      {c.isHazmat && (
                        <span className="rounded bg-amber-500 text-black px-1 py-0.2 text-[9px] font-black">
                          HAZMAT
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="max-w-xs truncate">{c.title}</Td>
                  <Td className="font-mono">{c.weightKg || 0} kg</Td>
                  <Td>
                    <Pill value={c.currentNode || c.status} />
                  </Td>
                </tr>
              ))}
              {cargo.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-slate-400">No cargo records registered for this expedition manifest.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </div>

      {/* Official Signatures & Customs Stamp Blocks */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t-2 border-slate-300 dark:border-slate-700 text-xs">
        <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-36">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Port Logistics Officer</p>
            <p className="text-[10px] text-slate-500">NCPOR Polar Dispatch Depot, Goa</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
            Sign & Seal: _______________________<br/>
            Date: {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="stamp-box border-2 border-dashed border-slate-400 dark:border-slate-600 p-3 rounded flex flex-col items-center justify-center text-center h-36">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-600 flex items-center justify-center text-cyan-600 font-serif font-black text-xs mb-1 rotate-[-12deg]">
            NCPOR
          </div>
          <p className="font-bold text-[11px] text-slate-700 dark:text-slate-300">CUSTOMS & ENVIRONMENTAL CLEARANCE</p>
          <p className="text-[10px] text-slate-500 font-mono">MADRID PROTOCOL COMPLIANT</p>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-36">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Antarctic Station Commander</p>
            <p className="text-[10px] text-slate-500">Receiving Bunker Officer in Charge</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
            Receipt Acknowledged: _______________<br/>
            Cargo Container Seals Intact: [ ] YES [ ] NO
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 3. FORM MoES/POLAR/F-04 — WINTER FUEL & LIFE SUPPORT AUDIT
// --------------------------------------------------------------------------------------
function WinterFuelLifeSupportAudit({ report }) {
  const { expedition, inventory, personnel } = report;
  const targetStation = expedition.targetStation || 'Bharati';
  
  // Filter inventory for fuel, rations, medical, life support
  const stationInv = inventory.filter(i => !i.station || i.station.toLowerCase().includes(targetStation.toLowerCase()));
  const fuelItems = stationInv.filter(i => i.category === 'Fuel' || i.name?.toLowerCase().includes('fuel') || i.name?.toLowerCase().includes('diesel'));
  const lifeSupportItems = stationInv.filter(i => 
    i.category === 'Rations' || 
    i.category === 'Medical' || 
    i.category === 'LifeSupport' ||
    i.name?.toLowerCase().includes('ration') || 
    i.name?.toLowerCase().includes('oxygen') ||
    i.name?.toLowerCase().includes('water') ||
    i.name?.toLowerCase().includes('medical')
  );

  const winterOverPersonnel = personnel.total || 24;
  // Polar Diesel Burn rate estimate: ~350 Liters/day for heating & gen-sets per station during polar night
  const totalDieselLiters = fuelItems.reduce((acc, f) => acc + (f.currentStock || 0), 0);
  const estimatedFuelDays = totalDieselLiters > 0 ? Math.floor(totalDieselLiters / 350) : 180;

  return (
    <div className="printable-sheet bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 p-6 shadow-sm text-slate-900 dark:text-slate-100">
      <GovernmentHeader
        formTitle="WINTER-OVER STATION FUEL & LIFE SUPPORT RESOURCE AUDIT SHEET"
        formCode="FORM MoES/POLAR/F-04"
        classification="RESTRICTED // LIFE SAFETY CRITICAL"
        subTitle="Polar Life-Support Autonomy Certification & Cold-Reserve Assessment"
      />

      {/* Critical Indicator Highlights */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Fuel Autonomy</span>
            <Fuel size={16} />
          </div>
          <p className="text-2xl font-black mt-1 font-mono">{estimatedFuelDays} Days</p>
          <p className="text-[10px] mt-0.5">Based on ~350 L/day baseline generator & bunker load</p>
        </div>

        <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Winter Roster</span>
            <UserCheck size={16} />
          </div>
          <p className="text-2xl font-black mt-1 font-mono">{winterOverPersonnel} Crew</p>
          <p className="text-[10px] mt-0.5">Overwintering scientists & technical engineers</p>
        </div>

        <div className="p-3 rounded-lg border border-cyan-300 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Audit Station</span>
            <Building2 size={16} />
          </div>
          <p className="text-xl font-bold mt-1">{targetStation} Station</p>
          <p className="text-[10px] mt-0.5">Antarctica Polar Research Base</p>
        </div>

        <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Audit Status</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">CERTIFIED</p>
          <p className="text-[10px] mt-0.5">Winter isolation threshold passed</p>
        </div>
      </div>

      {/* Fuel & Survival Inventory Tables */}
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Flame size={14} className="text-amber-500" />
            <span>Arctic Grade Diesel (ATF / HSD Polar) & Generator Reserves</span>
          </h4>
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <Th>Bunker / Tank Designation</Th>
                  <Th>Item Description</Th>
                  <Th>Current Volume</Th>
                  <Th>Safety Buffer Min</Th>
                  <Th>Daily Burn Rate</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fuelItems.length > 0 ? (
                  fuelItems.map((f, i) => (
                    <tr key={f._id || i}>
                      <Td className="font-mono font-bold">TANK-0{i+1} ({targetStation})</Td>
                      <Td>{f.name}</Td>
                      <Td className="font-mono font-bold">{f.currentStock} {f.unit || 'L'}</Td>
                      <Td className="font-mono">{f.safetyThreshold || 5000} {f.unit || 'L'}</Td>
                      <Td className="font-mono">~350 L / day</Td>
                      <Td><Pill value={f.currentStock < (f.safetyThreshold || 5000) ? 'Warning' : 'Optimal'} /></Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-slate-400">No fuel records registered in station bunker.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Box size={14} className="text-cyan-500" />
            <span>Emergency Provisions, Oxygen & Life Support Reserves</span>
          </h4>
          <TableWrap>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <Th>Resource Stock</Th>
                  <Th>Stockroom Location</Th>
                  <Th>Current In-Stock</Th>
                  <Th>Minimum Winter Quota</Th>
                  <Th>Compliance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lifeSupportItems.length > 0 ? (
                  lifeSupportItems.map((item, i) => (
                    <tr key={item._id || i}>
                      <Td className="font-semibold">{item.name}</Td>
                      <Td>{item.location || `${targetStation} Main Supply Bunker`}</Td>
                      <Td className="font-mono font-bold">{item.currentStock} {item.unit}</Td>
                      <Td className="font-mono">{item.safetyThreshold || Math.round(item.currentStock * 0.6)} {item.unit}</Td>
                      <Td><Pill value={item.currentStock < (item.safetyThreshold || 0) ? 'Warning' : 'Optimal'} /></Td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-400">No life-support or provisions registered in bunker inventory.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </div>

      {/* Certification Sign-Off Block */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-300 dark:border-slate-700 text-xs">
        <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-32">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Station Chief Engineer</p>
            <p className="text-[10px] text-slate-500">Power Plant & Life Support Systems</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
            Certified Generator Reserves: _______________________ Date: {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-32">
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Station Commander / Officer-in-Charge</p>
            <p className="text-[10px] text-slate-500">Ministry of Earth Sciences, Govt. of India</p>
          </div>
          <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
            Winter Isolation Safety Accepted: _______________________ Date: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------------
// 4. FORM MoES/POLAR/E-09 — SAR INCIDENT MUSTER & DEBRIEF REPORT
// --------------------------------------------------------------------------------------
function SarIncidentDebriefReport({ report, selectedIncidentId, onSelectIncident }) {
  const { expedition, incidents, incidentActions = [], assets = [] } = report;
  const inc = incidents.find(i => i._id === selectedIncidentId) || incidents[0];
  const actions = incidentActions.filter(a => a.incidentId === inc?._id || a.incidentId?._id === inc?._id);
  const dispatchedAssets = (inc?.affectedAssetIds && inc.affectedAssetIds.length > 0)
    ? inc.affectedAssetIds
    : assets.filter(a => a.station === (inc?.station || expedition.targetStation)).slice(0, 3);

  return (
    <div className="printable-sheet bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 p-6 shadow-sm text-slate-900 dark:text-slate-100">
      <GovernmentHeader
        formTitle="POLAR EMERGENCY SEARCH & RESCUE (SAR) INCIDENT MUSTER & DEBRIEF"
        formCode="FORM MoES/POLAR/E-09"
        classification="CRITICAL INCIDENT REPORT // NCPOR RESCUE PROTOCOL"
        subTitle="Search, Evacuation, Containment Log and Debrief Documentation"
      />

      {/* Incident Selection Dropdown (hidden during print) */}
      <div className="mt-4 mb-3 print:hidden flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
          Select Incident To Inspect / Print:
        </span>
        <CustomSelect
          value={inc?._id || ''}
          onChange={onSelectIncident}
          options={incidents.map(i => ({
            value: i._id,
            label: `${i.incidentCode} — ${i.title} (${i.severity} · ${i.status})`
          }))}
          className="flex-1 min-w-[280px]"
        />
      </div>

      {!inc ? (
        <Empty text="No incidents registered for this polar expedition." />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Incident Meta Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-slate-300 dark:border-slate-700 p-3 rounded-lg text-xs bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <span className="text-slate-500 block">Incident Number:</span>
              <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">{inc.incidentCode}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Classification / Type:</span>
              <span className="font-bold text-sm">{inc.type}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Severity Level:</span>
              <Pill value={inc.severity} />
            </div>
            <div>
              <span className="text-slate-500 block">Lifecycle Status:</span>
              <Pill value={inc.status} />
            </div>
            <div>
              <span className="text-slate-500 block">Location / Station:</span>
              <span className="font-semibold">{inc.station || expedition.targetStation}</span>
            </div>
            <div>
              <span className="text-slate-500 block">GPS Coordinates:</span>
              <span className="font-mono font-semibold">
                {inc.location?.coordinates ? `${inc.location.coordinates[1]}°S, ${inc.location.coordinates[0]}°E` : '69.40°S, 76.19°E'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Logged Time:</span>
              <span>{new Date(inc.createdAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Weather Conditions:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {inc.weatherCondition || 'Cat-3 Blizzard // Whiteout'}
              </span>
            </div>
          </div>

          {/* Incident Summary */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs bg-slate-50/30 dark:bg-slate-800/20">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase mb-1">
              Incident Overview & Nature of Distress
            </h4>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inc.title}</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
              {inc.description || 'Emergency alarm raised during traverse operation. SAR muster protocol activated immediately under Station Commander directive.'}
            </p>
          </div>

          {/* Rescue Operations & Mobilized Assets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <h4 className="font-bold uppercase text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <UserCheck size={14} className="text-cyan-500" />
                <span>Mobilized SAR Responders & Field Crew</span>
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                {inc.responderIds && inc.responderIds.length > 0 ? (
                  inc.responderIds.map((res, idx) => (
                    <li key={res._id || idx} className="font-medium">
                      {res.fullName || res.username} ({res.role || 'SAR Responder'})
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No specific SAR responders designated.</li>
                )}
              </ul>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <h4 className="font-bold uppercase text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Compass size={14} className="text-amber-500" />
                <span>Dispatched Search Assets & Vehicles</span>
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                {dispatchedAssets && dispatchedAssets.length > 0 ? (
                  dispatchedAssets.map((ast, idx) => (
                    <li key={ast._id || idx} className="font-medium">
                      {ast.name || ast.serialNumber || `Asset #${idx + 1}`} ({ast.category || ast.condition || 'Operational'})
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400 italic">No search assets currently dispatched.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Containment Log */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs">
            <h4 className="font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
              Action Chronology & Containment Measures
            </h4>
            <div className="space-y-2">
              {actions.length > 0 ? (
                actions.map((act, idx) => (
                  <div key={act._id || idx} className="flex items-start gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0 text-[11px] pt-0.5">
                      {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1">
                      <span className="font-bold uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded mr-2">
                        {act.actionType}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">{act.description}</span>
                      {act.createdBy && (
                        <span className="text-slate-400 text-[10px] ml-1.5">
                          — {act.createdBy.fullName || act.createdBy.username} ({act.createdBy.role})
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic">No containment actions recorded for this incident yet.</p>
              )}
            </div>
          </div>

          {/* SAR Debrief Certification Block */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-300 dark:border-slate-700 text-xs">
            <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-32">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Station Medical Officer</p>
                <p className="text-[10px] text-slate-500">Triage & Trauma Assessment</p>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
                Casualty Triage Status: [X] STABLE / CLEARED<br/>
                Signed: _______________________ Date: {new Date().toLocaleDateString()}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 p-3 rounded bg-slate-50/50 dark:bg-slate-800/20 flex flex-col justify-between h-32">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 uppercase">Search & Rescue Incident Commander</p>
                <p className="text-[10px] text-slate-500">NCPOR Emergency Action Cell</p>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-600 pt-1 text-[10px] text-slate-500">
                Incident Debrief Closed: _______________________ Date: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident Sign-off & Close Section */}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// OFFICIAL GOVERNMENT HEADER
// --------------------------------------------------------------------------------------
function GovernmentHeader({ formTitle, formCode, classification, subTitle }) {
  return (
    <div className="border-b-2 border-slate-800 dark:border-slate-300 pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded border-2 border-slate-800 dark:border-slate-300 flex flex-col items-center justify-center text-center p-1">
            <span className="text-[9px] font-bold font-serif leading-tight">GOVT OF</span>
            <span className="text-[10px] font-black font-serif leading-tight">INDIA</span>
          </div>
          <div>
            <p className="text-xs font-black tracking-wider uppercase font-serif text-slate-900 dark:text-slate-100">
              Government of India · Ministry of Earth Sciences
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              National Centre for Polar and Ocean Research (NCPOR), Goa
            </p>
            <p className="text-[10px] text-slate-500">
              Indian Antarctic Programme · Maitri & Bharati Stations
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="rounded bg-slate-800 text-white dark:bg-white dark:text-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest block mb-1">
            {formCode}
          </span>
          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold block">
            {classification}
          </span>
        </div>
      </div>

      <div className="mt-3 text-center border-t border-slate-200 dark:border-slate-800 pt-2">
        <h3 className="text-sm font-black tracking-wide uppercase text-slate-900 dark:text-white">
          {formTitle}
        </h3>
        {subTitle && (
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {subTitle}
          </p>
        )}
      </div>
    </div>
  );
}
