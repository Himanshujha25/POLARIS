import { useEffect, useState } from 'react';
<<<<<<< HEAD
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
  Droplets
} from 'lucide-react';
import { api } from '../lib/api';
import { Card, Pill, Spinner, Empty, Field, inputCls, btnGhost, btnPrimary, TableWrap, Th, Td } from '../components/ui';

const REPORT_FORMS = [
  { id: 'readiness', label: 'Mission Overview', icon: LayoutDashboard, formNo: 'MoES/POLAR/GEN-01' },
  { id: 'customs', label: 'Customs & Shipping Manifest', icon: Ship, formNo: 'MoES/POLAR/C-01' },
  { id: 'fuel', label: 'Winter Fuel & Life Support Audit', icon: Fuel, formNo: 'MoES/POLAR/F-04' },
  { id: 'incident', label: 'SAR Incident Muster & Debrief', icon: ShieldAlert, formNo: 'MoES/POLAR/E-09' }
];
=======
import { FileText, Fuel, ShieldCheck, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { Card, Pill, Spinner, Empty, Field, inputCls, btnGhost, btnPrimary } from '../components/ui';
import { exportCargoCustomsManifest, exportLifeSupportFuelAudit } from '../lib/reportGenerator';
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008

export default function Reports() {
  const [exps, setExps] = useState([]);
  const [expId, setExpId] = useState('');
  const [report, setReport] = useState(null);
  const [activeForm, setActiveForm] = useState('readiness');
  const [loading, setLoading] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const e = await api('/api/v1/expeditions');
        setExps(e);
        if (e[0]) setExpId(e[0]._id);
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

  return (
<<<<<<< HEAD
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
          <Field label="">
            <select 
              className={inputCls + ' !py-1.5 text-xs font-semibold'} 
              value={expId} 
              onChange={e => setExpId(e.target.value)}
            >
              {exps.map(x => (
                <option key={x._id} value={x._id}>
                  {x.expeditionCode} — {x.title} ({x.targetStation})
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            onClick={handlePrint}
            className={`${btnPrimary} !py-1.5 !px-3 text-xs flex items-center gap-1.5 shadow-sm`}
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
=======
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Official Mission Reports</h1>
          <p className="text-xs text-slate-500">Government compliance documents for MoES, customs & station audits</p>
        </div>
        <Field label="">
          <select className={inputCls} value={expId} onChange={e => setExpId(e.target.value)}>
            {exps.map(x => <option key={x._id} value={x._id}>{x.expeditionCode} — {x.title}</option>)}
          </select>
        </Field>
      </div>

      {!report && <Empty text="Select an expedition" />}
      {report && (
        <>
          {/* Government Compliance Export Actions */}
          <div className="flex flex-wrap gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#0d1424]">
            <button
              onClick={() => exportCargoCustomsManifest(report.cargo, report.expedition)}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-500/20 dark:text-cyan-300"
            >
              <FileText size={14} /> Official Cargo & Customs Manifest (PDF)
            </button>
            <button
              onClick={() => exportLifeSupportFuelAudit(report.inventory, report.expedition.targetStation)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
            >
              <Fuel size={14} /> Station Winter Life-Support & Fuel Audit (PDF)
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Printer size={14} /> Print Expedition Dossier
            </button>
          </div>

          <Card className="p-4">
            <h2 className="font-bold">Expedition readiness — {report.expedition.expeditionCode}</h2>
            <p className="text-sm text-slate-500">{report.expedition.title} → {report.expedition.targetStation} · Status: {report.expedition.status}</p>
            <p className="mt-1 text-sm">Personnel {report.personnel.total}/{report.personnel.quota} · Requirements {report.requirements.length} · Cargo {report.cargo.length} · Incidents {report.incidents.length}</p>
            <p className="mt-1 text-sm font-semibold">Deployment: {Object.entries(report.personnel.byLocation).map(([l, n]) => `${l}: ${n}`).join(' · ') || '—'}</p>
          </Card>
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008

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
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
          Station Bunker Material Transfers & Consumption (Last 15)
        </h3>
        <TableWrap>
          <table className="w-full text-left">
            <thead>
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
                <tr key={t._id} className="text-xs">
                  <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                  <Td><Pill value={t.type} /></Td>
                  <Td className="font-medium">{t.itemName} ({t.station})</Td>
                  <Td className="font-mono">{t.openingStock} → <b>{t.closingStock}</b> ({t.quantity > 0 ? `+${t.quantity}` : t.quantity})</Td>
                  <Td className="text-slate-500">{t.performedBy?.fullName || 'Station System'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
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
        <select
          className={inputCls + ' !py-1 text-xs'}
          value={inc?._id || ''}
          onChange={e => onSelectIncident(e.target.value)}
        >
          {incidents.map(i => (
            <option key={i._id} value={i._id}>
              {i.incidentCode} — {i.title} ({i.severity} · {i.status})
            </option>
          ))}
        </select>
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

<<<<<<< HEAD
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
=======
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Recent stock transactions</h2>
            {report.recentTransactions.slice(0, 15).map(t => (
              <p key={t._id} className="py-0.5 text-sm">{new Date(t.createdAt).toLocaleString()} · {t.type} · {t.itemName} ({t.station}): {t.openingStock} → {t.closingStock}</p>
            ))}
          </Card>
        </>
>>>>>>> 840a1ffe9b50f745c567833346f598ad8d08e008
      )}
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
