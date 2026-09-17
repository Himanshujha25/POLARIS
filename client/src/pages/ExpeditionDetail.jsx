import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';

const TABS = ['Overview', 'Requirements', 'Cargo', 'Personnel', 'Timeline', 'Report'];
const CATS = ['Provisions', 'HazardousFuel', 'ScientificInstruments', 'HeavySpares', 'MedicalLifeSupport'];

export default function ExpeditionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [reqs, setReqs] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [movements, setMovements] = useState([]);
  const [events, setEvents] = useState([]);
  const [showReq, setShowReq] = useState(false);
  const [reqError, setReqError] = useState('');
  const [form, setForm] = useState({ item: '', category: 'Provisions', requiredQty: 100, unit: 'Units', priority: 'P2' });

  const canEdit = ['SuperAdmin', 'ExpeditionManager'].includes(user?.role);

  const load = async () => {
    try {
      const [dos, r, rd, m] = await Promise.all([
        api(`/api/v1/expeditions/${id}`),
        api(`/api/v1/requirements?expeditionId=${id}`),
        api(`/api/v1/requirements/readiness/${id}`),
        api(`/api/v1/personnel/movements?expeditionId=${id}`)
      ]);
      setD(dos); setReqs(r); setReadiness(rd); setMovements(m);
      const evs = await Promise.all((dos.cargo || []).map(c => api(`/api/v1/cargo/${c._id}/timeline`).catch(() => [])));
      setEvents(evs.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30));
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, [id]);
  useLiveRefresh(load);

  const createReq = async (e) => {
    e.preventDefault();
    setReqError('');
    try {
      await api('/api/v1/requirements', { method: 'POST', body: { ...form, expeditionId: id, requiredQty: Number(form.requiredQty) } });
      setShowReq(false);
      setForm({ item: '', category: 'Provisions', requiredQty: 100, unit: 'Units', priority: 'P2' });
      load();
    } catch (err) { setReqError(err.message); }
  };

  const deleteReq = async (reqId) => {
    if (!window.confirm('Delete this requirement?')) return;
    try {
      await api(`/api/v1/requirements/${reqId}`, { method: 'DELETE' });
      load();
    } catch (err) { alert(err.message); }
  };

  if (!d) return <Spinner />;
  const { expedition: e, personnel, cargo } = d;

  const bar = (pct) => (
    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">{e.expeditionCode} — {e.title}</h1>
            <p className="text-sm text-slate-500">→ {e.targetStation} · {e.season}</p>
          </div>
          <Pill value={e.status} />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`${btnGhost} whitespace-nowrap !px-3 !py-1 text-xs ${tab === t ? '!border-cyan-500 !text-cyan-600' : ''}`}>{t}</button>
          ))}
        </div>
      </Card>

      {tab === 'Overview' && readiness && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="font-bold">Overall readiness: {readiness.overall}%</p>
            {bar(readiness.overall)}
            <div className="mt-3 text-sm">
              <p>Personnel {readiness.personnel}% ({readiness.counts.personnel}/{readiness.counts.quota})</p>{bar(readiness.personnel)}
              <p className="mt-2">Cargo {readiness.cargo}%</p>{bar(readiness.cargo)}
              <p className="mt-2">Inventory {readiness.inventory}%</p>{bar(readiness.inventory)}
              <p className="mt-2">Assets {readiness.assets}%</p>{bar(readiness.assets)}
            </div>
          </Card>
          <Card className="p-4">
            <p className="font-bold">Open issues ({readiness.counts.openIncidents})</p>
            {readiness.issues.length === 0 ? <p className="text-sm text-emerald-600">No open incidents</p> :
              readiness.issues.map(i => <p key={i.code} className="py-0.5 text-sm">{i.code} · {i.type} · {i.severity} · {i.status}</p>)}
          </Card>
        </div>
      )}

      {tab === 'Requirements' && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Requirements ({reqs.length})</h2>
            {canEdit && <button onClick={() => setShowReq(true)} className={btnPrimary + ' !px-3 !py-1 text-xs'}>+ Add requirement</button>}
          </div>
          {reqs.length === 0 ? <Empty text="No requirements yet — add Food 800kg, Fuel 5000L…" /> : (
            <TableWrap>
              <table className="w-full">
                <thead><tr><Th>Item</Th><Th>Priority</Th><Th>Required</Th><Th>Received</Th><Th>Pending</Th>{canEdit && <Th>Action</Th>}</tr></thead>
                <tbody>
                  {reqs.map(r => (
                    <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td>{r.item} ({r.category})</Td>
                      <Td><Pill value={r.priority} /></Td>
                      <Td>{r.requiredQty} {r.unit}</Td>
                      <Td>{r.receivedQty} {r.unit}</Td>
                      <Td className={r.pendingQty > 0 ? 'text-amber-500' : 'text-emerald-500'}>{r.pendingQty} {r.unit}</Td>
                      {canEdit && <Td><button onClick={() => deleteReq(r._id)} className={btnGhost + ' !px-2 !py-1 text-xs text-red-500'}>Delete</button></Td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {tab === 'Cargo' && (
        <Card className="p-4">
          <h2 className="mb-2 font-bold">Cargo ({cargo.length})</h2>
          {cargo.map(c => (
            <p key={c._id} className="py-1 text-sm"><b>{c.trackingNumber}</b> · {c.title} · <Pill value={c.status} /> · {c.currentNode}</p>
          ))}
          {cargo.length === 0 && <Empty />}
        </Card>
      )}

      {tab === 'Personnel' && (
        <Card className="p-4">
          <h2 className="mb-2 font-bold">Personnel ({personnel.length})</h2>
          {personnel.map(p => (
            <p key={p._id} className="py-1 text-sm"><b>{p.badgeId}</b> · {p.userId?.fullName} · <Pill value={p.currentStatus} /> · {p.currentLocation || '—'}</p>
          ))}
          {personnel.length === 0 && <Empty />}
        </Card>
      )}

      {tab === 'Timeline' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Cargo events</h2>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto border-l-2 border-cyan-500/40 pl-3">
              {events.map(ev => <p key={ev._id} className="text-sm"><b>{ev.eventType}</b>{ev.toNode ? ` → ${ev.toNode}` : ''} · {new Date(ev.createdAt).toLocaleString()}</p>)}
              {events.length === 0 && <Empty text="No cargo events" />}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Personnel movements</h2>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto border-l-2 border-cyan-500/40 pl-3">
              {movements.map(m => <p key={m._id} className="text-sm"><b>{m.personnelId?.badgeId}</b>: {m.fromLocation || '—'} → <b>{m.toLocation}</b> · {new Date(m.createdAt).toLocaleString()}</p>)}
              {movements.length === 0 && <Empty text="No movements" />}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Report' && (
        <Card className="p-4 text-sm">
          <h2 className="mb-2 font-bold">Expedition report</h2>
          <p>Requirements: {reqs.length} lines · Personnel: {personnel.length}/{e.totalPersonnelQuota} · Cargo: {cargo.length} shipments</p>
          <p>Readiness: {readiness ? `${readiness.overall}% overall` : '—'}</p>
          <Link to="/reports" className={btnGhost + ' mt-3 inline-block !px-3 !py-1 text-xs'}>Open full reports</Link>
        </Card>
      )}

      {showReq && (
        <Modal title="Add requirement" onClose={() => setShowReq(false)}>
          <form onSubmit={createReq} className="flex flex-col gap-3">
            <Field label="Item"><input className={inputCls} required value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} placeholder="Food" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select className={inputCls} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option>P1</option><option>P2</option><option>P3</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Required qty"><input type="number" className={inputCls} value={form.requiredQty} onChange={e => setForm({ ...form, requiredQty: e.target.value })} /></Field>
              <Field label="Unit"><input className={inputCls} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></Field>
            </div>
            <ErrorNote message={reqError} />
            <button className={btnPrimary}>Add</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
