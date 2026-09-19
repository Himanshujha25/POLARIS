import { useEffect, useState } from 'react';
import { Search, QrCode, ShieldAlert, Printer } from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, StatCard, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';
import { generateLogisticsCodeSVG } from '../lib/qrCode';

const NODES = ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station'];

export default function Cargo() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [exps, setExps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState('');
  const [track, setTrack] = useState('');
  const [tracked, setTracked] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [qrModalCargo, setQrModalCargo] = useState(null);
  const [form, setForm] = useState({
    trackingNumber: '',
    containerNumber: '',
    sealNumber: '',
    title: '',
    category: 'Provisions',
    weightKg: 100,
    tareWeightKg: '',
    expeditionId: '',
    isHazmat: false,
    hazmatClass: '',
    customsDeclarationNumber: '',
    itemsText: ''
  });
  const [timeline, setTimeline] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [receiveCargo, setReceiveCargo] = useState(null);
  const [receiveStation, setReceiveStation] = useState('Maitri');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', weightKg: '', eta: '' });
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        api(`/api/v1/cargo${statusF ? `?status=${statusF}` : ''}`),
        api('/api/v1/expeditions')
      ]);
      setList(c); setExps(e);
      if (!form.expeditionId && e[0]) setForm(f => ({ ...f, expeditionId: e[0]._id }));
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusF]);
  useLiveRefresh(load);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Parse itemsText if provided: e.g. "Rice Rations: 200 Kilograms, High Energy Biscuits: 50 Units"
      const items = form.itemsText
        ? form.itemsText.split(',').map(part => {
            const [namePart, qtyPart] = part.split(':');
            const trimmedName = (namePart || '').trim();
            const [qtyNum, unit] = (qtyPart || '').trim().split(/\s+/);
            return {
              name: trimmedName,
              quantity: Number(qtyNum) || 1,
              unit: unit || 'Units'
            };
          }).filter(it => it.name)
        : [{ name: form.title, quantity: Number(form.weightKg) || 10, unit: 'Units' }];

      await api('/api/v1/cargo', {
        method: 'POST',
        body: {
          ...form,
          weightKg: Number(form.weightKg),
          items
        }
      });
      setShowCreate(false);
      setForm(f => ({ ...f, trackingNumber: '', title: '', itemsText: '' }));
      load();
    } catch (err) { setError(err.message); }
  };

  const openEdit = (c) => {
    setEditing(c._id);
    setEditForm({ title: c.title, weightKg: c.weightKg || '', eta: c.eta ? c.eta.slice(0, 10) : '' });
    setError('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/cargo/${editing}`, {
        method: 'PATCH',
        body: { title: editForm.title, weightKg: Number(editForm.weightKg) || 0, eta: editForm.eta || undefined }
      });
      setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const doDelete = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/v1/cargo/${deleting}`, { method: 'DELETE' });
      setDeleting(null); load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const advance = async (c) => {
    const idx = NODES.indexOf(c.currentNode);
    const next = NODES[Math.min(NODES.length - 1, idx + 1)];
    await api(`/api/v1/cargo/${c._id}/stage`, { method: 'PATCH', body: { node: next, location: next.replace(/_/g, ' ') } });
    load();
  };

  const lookup = async (e) => {
    e.preventDefault();
    try { setTracked(await api(`/api/v1/cargo/track/${track.trim()}`)); }
    catch { setTracked({ error: 'Not found' }); }
  };

  const openTimeline = async (c) => {
    setTimeline(c);
    try { setTimelineEvents(await api(`/api/v1/cargo/${c._id}/timeline`)); } catch { setTimelineEvents([]); }
  };

  const openReceive = (c) => {
    setReceiveCargo(c);
    setReceiveStation(c.currentNode === 'Bharati_Station' ? 'Bharati' : 'Maitri');
  };

  const doReceive = async (e) => {
    e.preventDefault();
    try {
      const res = await api(`/api/v1/cargo/${receiveCargo._id}/receive`, { method: 'POST', body: { station: receiveStation } });
      alert(`Received — inventory updated: ${res.receipts.map(r => `${r.item} x${r.qty}`).join(', ') || 'none'}`);
    } catch (err) { alert(err.message); }
    setReceiveCargo(null); load();
  };

  if (loading) return <Spinner />;

  const inTransitCount = list.filter(c => c.status === 'InTransit').length;
  const deliveredCount = list.filter(c => c.status === 'DeliveredStation').length;
  const hazmatCount = list.filter(c => c.isHazmat).length;
  const totalWeight = list.reduce((s, c) => s + (c.weightKg || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Category Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            BASE & LOGISTICS
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Cargo Manifests & Custody
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ISO polar containers, customs declarations & tamper-proof barcode seal tracking
          </p>
        </div>

        {canEdit && (
          <button className={btnPrimary} onClick={() => setShowCreate(true)}>
            + Register Cargo Container
          </button>
        )}
      </div>

      {/* 4 Logistics KPI StatCards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Total Cargo Units"
          value={list.length}
          sub={`${totalWeight.toLocaleString()} kg manifest payload`}
          trend="↑ 2"
          trendType="positive"
        />
        <StatCard
          label="In Sea / Air Transit"
          value={inTransitCount}
          sub="Vessel & airlift en route"
          trend="—"
          trendType="neutral"
        />
        <StatCard
          label="Delivered Stations"
          value={deliveredCount}
          sub="Bharati & Maitri inventory"
          trend="Optimal"
          trendType="positive"
        />
        <StatCard
          label="HAZMAT Cryo / Fuel"
          value={hazmatCount}
          sub="Class 3 & Class 9 sealed"
          trend={hazmatCount > 0 ? "Inspect" : "Clear"}
          trendType={hazmatCount > 0 ? "warning" : "positive"}
        />
      </div>

      {/* Search & Barcode Lookup Card */}
      <Card className="p-3">
        <form onSubmit={lookup} className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Scan barcode / enter tracking or container no. e.g. CRG-CONT-44-FUEL..."
            value={track}
            onChange={e => setTrack(e.target.value)}
          />
          <button className={btnPrimary} aria-label="Track">
            <Search size={16} />
          </button>
        </form>
        {tracked && (
          <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
            {tracked.error ? (
              <p className="text-rose-500 font-semibold">{tracked.error}</p>
            ) : (
              <p className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600 dark:text-cyan-400">{tracked.trackingNumber}</span>
                <span>·</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{tracked.title}</span>
                <span>·</span>
                <Pill value={tracked.status} />
                <span className="text-slate-500 text-xs">({tracked.currentNode})</span>
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['', 'Staged', 'InTransit', 'DeliveredStation', 'DelayedWeather'].map(s => (
          <button
            key={s}
            onClick={() => setStatusF(s)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              statusF === s
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300'
            }`}
          >
            {s === '' ? 'All Containers' : s === 'DeliveredStation' ? 'Delivered Station' : s}
          </button>
        ))}
      </div>

      {list.length === 0 && <Empty />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map(c => (
          <Card key={c._id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-bold">{c.trackingNumber}</p>
                {c.containerNumber && (
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    CONT: {c.containerNumber}
                  </span>
                )}
                {c.sealNumber && (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    🔒 SEAL: {c.sealNumber}
                  </span>
                )}
              </div>
              <Pill value={c.status} />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <span className="font-medium">{c.title}</span>
              <span>·</span>
              <span>{c.weightKg} kg</span>
              {c.isHazmat && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <ShieldAlert size={12} /> HAZMAT {c.hazmatClass ? `(${c.hazmatClass})` : ''}
                </span>
              )}
            </div>

            {c.customsDeclarationNumber && (
              <p className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Customs Ref: {c.customsDeclarationNumber}
              </p>
            )}

            {c.items && c.items.length > 0 && (
              <div className="mt-1.5 rounded bg-slate-50 p-2 text-xs dark:bg-slate-800/40">
                <p className="font-semibold text-slate-500 dark:text-slate-400">📦 Manifest / Container Items ({c.items.length}):</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.items.map((it, idx) => (
                    <span key={idx} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium dark:border-slate-700 dark:bg-slate-800">
                      {it.name}: <b>{it.quantity} {it.unit}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">NCPOR Goa → Port → Ship → Ice Shelf → Station</p>
            <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Now: {c.currentNode} · ETA {c.eta ? new Date(c.eta).toLocaleDateString() : '—'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setQrModalCargo(c)} className={btnGhost + ' !px-2.5 !py-1 text-xs flex items-center gap-1 text-cyan-600 dark:text-cyan-400'}>
                <QrCode size={13} /> QR Seal
              </button>
              <button onClick={() => openTimeline(c)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Timeline</button>
              {canEdit && c.status !== 'DeliveredStation' && (
                <button onClick={() => advance(c)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Advance → next node</button>
              )}
              {canEdit && (c.currentNode === 'Bharati_Station' || c.currentNode === 'Maitri_Station') && c.status !== 'DeliveredStation' && (
                <button onClick={() => openReceive(c)} className={btnPrimary + ' !px-3 !py-1 text-xs'}>Receive at station</button>
              )}
              {canEdit && (
                <>
                  <button onClick={() => openEdit(c)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Edit</button>
                  <button onClick={() => { setDeleting(c._id); setError(''); }} className={btnGhost + ' !px-3 !py-1 text-xs text-red-500'}>Delete</button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Modal title="Register ISO Container & Cargo Manifest" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Consignment Title"><input className={inputCls} required placeholder="e.g. Winter Provisions Container #4" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tracking Number / QR"><input className={inputCls} required placeholder="e.g. CRG-2027-BHR-002" value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></Field>
              <Field label="ISO Container Number"><input className={inputCls} placeholder="e.g. IN-NCPOR-44-C01" value={form.containerNumber} onChange={e => setForm({ ...form, containerNumber: e.target.value })} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Security Seal Number"><input className={inputCls} placeholder="e.g. SEAL-98421" value={form.sealNumber} onChange={e => setForm({ ...form, sealNumber: e.target.value })} /></Field>
              <Field label="Customs Declaration Number"><input className={inputCls} placeholder="e.g. CUS-IND-2026-092" value={form.customsDeclarationNumber} onChange={e => setForm({ ...form, customsDeclarationNumber: e.target.value })} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>Provisions</option><option>HazardousFuel</option><option>ScientificInstruments</option><option>HeavySpares</option><option>MedicalLifeSupport</option>
                </select>
              </Field>
              <Field label="Gross Cargo Weight (kg)">
                <input type="number" className={inputCls} required value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} />
              </Field>
            </div>

            <Field label="Expedition Mission">
              <select className={inputCls} value={form.expeditionId} onChange={e => setForm({ ...form, expeditionId: e.target.value })}>
                {exps.map(x => <option key={x._id} value={x._id}>{x.expeditionCode}</option>)}
              </select>
            </Field>

            <Field label="Itemized Manifest (e.g. Arctic Rations: 300 Kilograms, Freeze Dried Meals: 150 Units)">
              <textarea
                className={inputCls}
                rows={2}
                placeholder="ItemName: Quantity Unit, AnotherItem: Quantity Unit"
                value={form.itemsText}
                onChange={e => setForm({ ...form, itemsText: e.target.value })}
              />
            </Field>

            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isHazmat}
                  onChange={e => setForm({ ...form, isHazmat: e.target.checked })}
                  className="rounded border-slate-300"
                />
                ⚠️ Classify as Hazardous Material (HAZMAT)
              </label>
              {form.isHazmat && (
                <Field label="HAZMAT Classification / Class">
                  <input
                    className={inputCls}
                    placeholder="e.g. Class 3 Flammable Liquid (HSD) or Class 9 Lithium Batteries"
                    value={form.hazmatClass}
                    onChange={e => setForm({ ...form, hazmatClass: e.target.value })}
                  />
                </Field>
              )}
            </div>

            <button className={btnPrimary}>Register Cargo Manifest</button>
          </form>
        </Modal>
      )}

      {/* Container QR & Seal Code Modal */}
      {qrModalCargo && (
        <Modal title={`Container Seal & QR: ${qrModalCargo.trackingNumber}`} onClose={() => setQrModalCargo(null)}>
          <div className="flex flex-col items-center gap-3 p-2 text-center">
            <div
              className="rounded-xl border-2 border-slate-800 p-3 shadow-inner bg-white"
              dangerouslySetInnerHTML={{
                __html: generateLogisticsCodeSVG(
                  qrModalCargo.qrPayload || `${qrModalCargo.trackingNumber}|${qrModalCargo.containerNumber || 'C0'}|${qrModalCargo.sealNumber || 'S0'}`
                )
              }}
            />
            <div className="text-left w-full space-y-1 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50 font-mono">
              <p><b>TRACKING:</b> {qrModalCargo.trackingNumber}</p>
              <p><b>CONTAINER:</b> {qrModalCargo.containerNumber || 'UNCONTAINERIZED PALLET'}</p>
              <p><b>SEAL NO:</b> {qrModalCargo.sealNumber || 'N/A'}</p>
              <p><b>HAZMAT:</b> {qrModalCargo.isHazmat ? `YES (${qrModalCargo.hazmatClass || 'Class 3'})` : 'NO'}</p>
              <p><b>CURRENT NODE:</b> {qrModalCargo.currentNode}</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => window.print()}
                className={btnGhost + ' flex-1 flex items-center justify-center gap-1.5'}
              >
                <Printer size={14} /> Print Barcode Label
              </button>
              <button
                onClick={() => setQrModalCargo(null)}
                className={btnPrimary + ' flex-1'}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit cargo" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <Field label="Title"><input className={inputCls} required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)"><input type="number" className={inputCls} value={editForm.weightKg} onChange={e => setEditForm({ ...editForm, weightKg: e.target.value })} /></Field>
              <Field label="ETA"><input type="date" className={inputCls} value={editForm.eta} onChange={e => setEditForm({ ...editForm, eta: e.target.value })} /></Field>
            </div>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete cargo?"
          message="The shipment and its tracking timeline will be removed. Recorded in audit log."
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={doDelete}
        />
      )}

      {timeline && (
        <Modal title={`Timeline — ${timeline.trackingNumber}`} onClose={() => setTimeline(null)}>
          {timelineEvents.length === 0 ? <p className="text-sm text-slate-500">No events yet</p> : (
            <div className="flex flex-col gap-2 border-l-2 border-cyan-500/40 pl-3">
              {timelineEvents.map(ev => (
                <div key={ev._id} className="text-sm">
                  <p><b>{ev.eventType}</b>{ev.toNode ? ` → ${ev.toNode}` : ''}{ev.location ? ` @ ${ev.location}` : ''}</p>
                  <p className="text-xs text-slate-500">{ev.reason || ''} · {ev.createdBy?.username || ''} · {new Date(ev.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {receiveCargo && (
        <Modal title={`Receive ${receiveCargo.trackingNumber}`} onClose={() => setReceiveCargo(null)}>
          <form onSubmit={doReceive} className="flex flex-col gap-3">
            <p className="text-sm text-slate-500">
              Station receipt unpacks these items directly into the station's live inventory with official verified <b>RECEIPT</b> ledger transactions.
            </p>
            {receiveCargo.items && receiveCargo.items.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/50">
                <p className="font-bold text-slate-700 dark:text-slate-200">📦 Manifest items being unpacked:</p>
                <ul className="mt-1.5 space-y-1">
                  {receiveCargo.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between border-b border-slate-200/60 pb-0.5 last:border-0 dark:border-slate-700">
                      <span>{it.name}</span>
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">{it.quantity} {it.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                Will unpack as: <b>{receiveCargo.title}</b> ({receiveCargo.weightKg || 10} Units)
              </div>
            )}
            <Field label="Receiving Station Bunkers">
              <select className={inputCls} value={receiveStation} onChange={e => setReceiveStation(e.target.value)}>
                <option>Bharati</option><option>Maitri</option><option>Himadri</option>
              </select>
            </Field>
            <button className={btnPrimary}>Confirm Receipt & Unpack to Inventory</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
