import { useEffect, useState } from 'react';
import { FileText, Fuel, ShieldCheck, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { Card, Pill, Spinner, Empty, Field, inputCls, btnGhost, btnPrimary } from '../components/ui';
import { exportCargoCustomsManifest, exportLifeSupportFuelAudit } from '../lib/reportGenerator';

export default function Reports() {
  const [exps, setExps] = useState([]);
  const [expId, setExpId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

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
      try { setReport(await api(`/api/v1/reports/expedition/${expId}`)); } catch { setReport(null); }
    })();
  }, [expId]);

  if (loading) return <Spinner />;

  return (
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
        </>
      )}
    </div>
  );
}
