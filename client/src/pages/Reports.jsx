import { useEffect, useState } from 'react';
import { FileText, Fuel, ShieldCheck, Printer, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../lib/api';
import { Card, StatCard, Pill, Spinner, Empty, Field, inputCls, btnGhost, btnPrimary, CustomSelect, Modal } from '../components/ui';
import { exportCargoCustomsManifest, exportLifeSupportFuelAudit } from '../lib/reportGenerator';

export default function Reports() {
  const [exps, setExps] = useState([]);
  const [expId, setExpId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSitrepModal, setShowSitrepModal] = useState(false);
  const [sitrepLoading, setSitrepLoading] = useState(false);
  const [sitrepData, setSitrepData] = useState(null);
  const [copiedSitrep, setCopiedSitrep] = useState(false);

  const generateAISitrep = async () => {
    setShowSitrepModal(true);
    setSitrepLoading(true);
    setSitrepData(null);
    try {
      const res = await api('/api/v1/ai/sitrep-summary', { method: 'POST' });
      setSitrepData(res);
    } catch (err) {
      setSitrepData({ sitrep: 'SITREP generation notice: ' + err.message, provider: 'offline' });
    } finally {
      setSitrepLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await api('/api/v1/expeditions');
        setExps(list);
        if (list[0]?._id) setExpId(list[0]._id);
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
      } catch { /* ignore */ }
    })();
  }, [expId]);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            GOVERNANCE & COMPLIANCE
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Official Mission Reports & Audits
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Government of India MoES / NCPOR compliance manifests, winter life-support audits & customs dossiers
          </p>
        </div>

        <div className="w-full sm:w-80">
          <CustomSelect
            value={expId}
            onChange={setExpId}
            options={exps.map(x => ({
              value: x._id,
              label: `${x.expeditionCode} — ${x.title}`
            }))}
            className="w-full"
            align="right"
          />
        </div>
      </div>

      {!report && <Empty text="Select an expedition from the dropdown above to view official compliance dossier." />}
      {report && (
        <>
          {/* 4 Report Readiness KPI StatCards */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <StatCard
              label="Personnel Quota"
              value={`${report.personnel?.total || 0} / ${report.personnel?.quota || 35}`}
              sub="Deployed expedition crew"
              trend="Optimal"
              trendType="positive"
            />
            <StatCard
              label="Cargo Manifested"
              value={report.cargo?.length || 0}
              sub="ISO containers & crates"
              trend="Tracked"
              trendType="positive"
            />
            <StatCard
              label="Requirements Linked"
              value={report.requirements?.length || 0}
              sub="Pre-expedition requisitions"
              trend="Verified"
              trendType="positive"
            />
            <StatCard
              label="Incidents Recorded"
              value={report.incidents?.length || 0}
              sub="Mission safety events"
              trend={report.incidents?.length > 0 ? "Review" : "Clear"}
              trendType={report.incidents?.length > 0 ? "warning" : "positive"}
            />
          </div>

          {/* Government Compliance Export Actions */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#111a2e]">
            <button
              onClick={generateAISitrep}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition-all hover:opacity-90 cursor-pointer"
              title="Generate official 24-hour NCPOR & Ministry SITREP from live station data"
            >
              <Sparkles size={15} className="text-cyan-200 animate-pulse" />
              <span>✦ Generate 24h AI SITREP Briefing</span>
            </button>
            <button
              onClick={() => exportCargoCustomsManifest(report.cargo, report.expedition)}
              className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 cursor-pointer"
            >
              <FileText size={15} />
              <span>Official Cargo & Customs Manifest (PDF)</span>
            </button>
            <button
              onClick={() => exportLifeSupportFuelAudit(report.inventory, report.expedition.targetStation)}
              className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-bold text-amber-700 transition-all hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 cursor-pointer"
            >
              <Fuel size={15} />
              <span>Station Winter Life-Support & Fuel Audit (PDF)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Expedition Dossier</span>
            </button>
          </div>

          <Card className="p-5">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Expedition Readiness Dossier — {report.expedition.expeditionCode}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {report.expedition.title} → <b>{report.expedition.targetStation}</b> · Status: <Pill value={report.expedition.status} />
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Station Deployment: {Object.entries(report.personnel.byLocation).map(([l, n]) => `${l}: ${n} crew`).join(' · ') || 'None deployed'}
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-2 font-bold">Requirements vs received</h2>
              {report.requirements.map(r => (
                <p key={r._id} className="py-0.5 text-sm">{r.item}: {r.receivedQty}/{r.requiredQty} {r.unit} <span className={r.pendingQty > 0 ? 'text-amber-500' : 'text-emerald-500'}>(pending {r.pendingQty})</span></p>
              ))}
              {report.requirements.length === 0 && <Empty />}
            </Card>
            <Card className="p-4">
              <h2 className="mb-2 font-bold">Incidents</h2>
              {report.incidents.map(i => (
                <p key={i._id} className="py-0.5 text-sm">{i.incidentCode} · {i.type} · {i.severity} · <Pill value={i.status} /></p>
              ))}
              {report.incidents.length === 0 && <Empty text="No incidents" />}
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="mb-2 font-bold">Recent stock transactions</h2>
            {report.recentTransactions.slice(0, 15).map(t => (
              <p key={t._id} className="py-0.5 text-sm">{new Date(t.createdAt).toLocaleString()} · {t.type} · {t.itemName} ({t.station}): {t.openingStock} → {t.closingStock}</p>
            ))}
          </Card>

          {/* AI 24h SITREP Modal */}
          {showSitrepModal && (
            <Modal
              title="✦ 24-Hour NCPOR Executive SITREP (AI Generated)"
              onClose={() => setShowSitrepModal(false)}
            >
              <div className="flex flex-col gap-3">
                {sitrepLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-slate-500">
                    <Loader2 size={24} className="animate-spin text-cyan-600" />
                    <p>Compiling live station weather, inventory & incident metrics for NCPOR / MoES briefing...</p>
                  </div>
                ) : sitrepData ? (
                  <div className="flex flex-col gap-2">
                    <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
                      {sitrepData.sitrep}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-slate-400">
                        Model: {sitrepData.model || 'Polaris SITREP Engine'} ({sitrepData.provider})
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sitrepData.sitrep);
                          setCopiedSitrep(true);
                          setTimeout(() => setCopiedSitrep(false), 2000);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        {copiedSitrep ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        <span>{copiedSitrep ? 'Copied' : 'Copy SITREP'}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
