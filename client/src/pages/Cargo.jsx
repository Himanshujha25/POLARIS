import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost } from '../components/ui';

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
  const [form, setForm] = useState({ trackingNumber: '', title: '', category: 'Provisions', weightKg: 100, expeditionId: '' });
  const [timeline, setTimeline] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [receiveCargo, setReceiveCargo] = useState(null);
  const [receiveStation, setReceiveStation] = useState('Maitri');

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

  const create = async (e) => {
    e.preventDefault();
    await api('/api/v1/cargo', { method: 'POST', body: { ...form, weightKg: Number(form.weightKg) } });
    setShowCreate(false); load();
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
            <p className="text-sm">{c.title} · {c.weightKg}kg {c.isHazmat && '· ⚠️ HAZMAT'}</p>
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
            </div>
          </Card>
        ))}
      </div>

      {showCreate && (
        <Modal title="Register Cargo" onClose={() => setShowCreate(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Tracking Number"><input className={inputCls} required value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} /></Field>
            <Field label="Title"><input className={inputCls} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Provisions</option><option>HazardousFuel</option><option>ScientificInstruments</option><option>HeavySpares</option><option>MedicalLifeSupport</option>
              </select>
            </Field>
            <Field label="Expedition">
              <select className={inputCls} value={form.expeditionId} onChange={e => setForm({ ...form, expeditionId: e.target.value })}>
                {exps.map(x => <option key={x._id} value={x._id}>{x.expeditionCode}</option>)}
              </select>
            </Field>
            <button className={btnPrimary}>Register</button>
          </form>
        </Modal>
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
            <p className="text-sm text-slate-500">Station receipt adds cargo items to inventory with RECEIPT transactions.</p>
            <Field label="Receiving station">
              <select className={inputCls} value={receiveStation} onChange={e => setReceiveStation(e.target.value)}>
                <option>Bharati</option><option>Maitri</option><option>Himadri</option>
              </select>
            </Field>
            <button className={btnPrimary}>Confirm receipt</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
