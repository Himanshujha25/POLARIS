import { useEffect, useState } from 'react';
import { Search, Biohazard } from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';

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
  const [form, setForm] = useState({
    trackingNumber: '',
    title: '',
    category: 'Provisions',
    weightKg: 100,
    expeditionId: '',
    isHazmat: false,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Cargo Tracking</h1>
        {canEdit && <button className={btnPrimary} onClick={() => setShowCreate(true)}>+ Register Cargo</button>}
      </div>

      <Card className="p-3">
        <form onSubmit={lookup} className="flex gap-2">
          <input className={inputCls} placeholder="QR / tracking no. e.g. CRG-2027-BHR-001" value={track} onChange={e => setTrack(e.target.value)} />
          <button className={btnPrimary} aria-label="Track"><Search size={18} /></button>
        </form>
        {tracked && (
          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-800/50">
            {tracked.error ? <p className="text-red-500">{tracked.error}</p> : (
              <p><b>{tracked.trackingNumber}</b> · {tracked.title} · <Pill value={tracked.status} /> · {tracked.currentNode}</p>
            )}
          </div>
        )}
      </Card>

      <div className="flex gap-2 overflow-x-auto">
        {['', 'Staged', 'InTransit', 'DeliveredStation', 'DelayedWeather'].map(s => (
          <button key={s} onClick={() => setStatusF(s)} className={`${btnGhost} whitespace-nowrap !px-3 !py-1 text-xs ${statusF === s ? '!border-cyan-500 !text-cyan-600' : ''}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {list.length === 0 && <Empty />}
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map(c => (
          <Card key={c._id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{c.trackingNumber}</p>
              <Pill value={c.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm mt-0.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{c.title}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400">{c.weightKg} kg</span>
              {c.isHazmat && (
                <span
                  className="inline-flex items-center gap-1 rounded border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 shadow-xs"
                  title="Hazardous Materials (HAZMAT: Class 3 Fuel, Lithium, Cryogenics)"
                >
                  <Biohazard size={13} className="text-amber-500 shrink-0" />
                  <span>HAZMAT</span>
                </span>
              )}
            </div>
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
        <Modal title="Register Cargo & Manifest" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Tracking Number / QR"><input className={inputCls} required placeholder="e.g. CRG-2027-BHR-002" value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></Field>
            <Field label="Consignment Title"><input className={inputCls} required placeholder="e.g. Winter Provisions Container #4" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>Provisions</option><option>HazardousFuel</option><option>ScientificInstruments</option><option>HeavySpares</option><option>MedicalLifeSupport</option>
                </select>
              </Field>
              <Field label="Total Weight (kg)">
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
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <input
                type="checkbox"
                checked={form.isHazmat}
                onChange={e => setForm({ ...form, isHazmat: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="inline-flex items-center gap-1.5">
                <Biohazard size={14} className="text-amber-500 shrink-0" />
                <span>Classify as Hazardous Material (HAZMAT: Polar Fuel, Batteries, Cryogenics)</span>
              </span>
            </label>
            <button className={btnPrimary}>Register Cargo Manifest</button>
          </form>
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
