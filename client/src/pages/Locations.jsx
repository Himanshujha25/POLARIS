import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';

const TYPES = ['Station', 'Warehouse', 'Camp', 'Vessel', 'Port', 'Hub', 'Aircraft', 'Temporary', 'Headquarters'];

export default function Locations() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [resupplyId, setResupplyId] = useState(null);
  const [resupplyDate, setResupplyDate] = useState('');
  const [form, setForm] = useState({ name: '', type: 'Camp', parentId: '', region: '', lat: '', lng: '', dangerPolygon: '' });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try { setList(await api('/api/v1/locations')); } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Serialize map fields: lat/lng -> coordinates, JSON textarea -> dangerPolygon array.
  // Throws a readable error when the polygon JSON is invalid.
  const serializeMapFields = (f) => {
    const body = { ...f };
    delete body.lat; delete body.lng; delete body.dangerPolygon;
    if (f.lat !== '' && f.lng !== '') {
      const lat = Number(f.lat); const lng = Number(f.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Latitude/longitude must be numbers');
      body.coordinates = { lat, lng };
    }
    if (f.dangerPolygon && f.dangerPolygon.trim() !== '') {
      let poly;
      try { poly = JSON.parse(f.dangerPolygon); } catch { throw new Error('Danger polygon must be valid JSON, e.g. [[-69.40,76.18],[-69.38,76.20]]'); }
      if (!Array.isArray(poly) || poly.length < 3 || !poly.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) {
        throw new Error('Danger polygon needs at least 3 [lat, lng] pairs');
      }
      body.dangerPolygon = poly;
    }
    return body;
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/v1/locations', { method: 'POST', body: { ...serializeMapFields(form), parentId: form.parentId || undefined } });
      setShow(false); setForm({ name: '', type: 'Camp', parentId: '', region: '', lat: '', lng: '', dangerPolygon: '' }); load();
    } catch (err) { setError(err.message); }
  };

  const openEdit = (l) => {
    setEditing(l._id);
    setForm({
      name: l.name, type: l.type, parentId: l.parentId?._id || l.parentId || '', region: l.region || '',
      lat: l.coordinates?.lat ?? '', lng: l.coordinates?.lng ?? '',
      dangerPolygon: Array.isArray(l.dangerPolygon) && l.dangerPolygon.length ? JSON.stringify(l.dangerPolygon) : ''
    });
    setError('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/locations/${editing}`, { method: 'PATCH', body: { ...serializeMapFields(form), parentId: form.parentId || undefined } });
      setEditing(null); load();
    } catch (err) { setError(err.message); }
  };

  const doDelete = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/v1/locations/${deleting}`, { method: 'DELETE' });
      setDeleting(null); load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const saveResupply = async (e) => {
    e.preventDefault();
    await api(`/api/v1/locations/${resupplyId}`, { method: 'PATCH', body: { nextResupplyDate: resupplyDate } });
    setResupplyId(null); load();
  };

  const parentName = (id) => list.find(l => l._id === (id?._id || id))?.name || '—';

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Locations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stations, camps, vessels, hubs — resupply dates drive forecasts</p>
        </div>
        {canEdit && <button className={btnPrimary} onClick={() => setShow(true)}>+ Add location</button>}
      </div>

      {list.length === 0 && <Empty />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(l => (
          <Card key={l._id} className="p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{l.name}</p>
              <Pill value={l.type} />
            </div>
            <p className="text-xs text-slate-500">Parent: {l.parentId ? parentName(l.parentId) : '—'} {l.region && `· ${l.region}`}</p>
            <p className="mt-1 text-xs text-slate-500">
              Next resupply: {l.nextResupplyDate ? new Date(l.nextResupplyDate).toLocaleDateString() : 'not set'}
              {l.coordinates?.lat !== undefined && ` · 📍 ${l.coordinates.lat}, ${l.coordinates.lng}`}
              {Array.isArray(l.dangerPolygon) && l.dangerPolygon.length >= 3 && ' · ⚠️ danger zone'}
            </p>
            {canEdit && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => { setResupplyId(l._id); setResupplyDate(l.nextResupplyDate ? l.nextResupplyDate.slice(0, 10) : ''); }} className={btnGhost + ' !px-3 !py-1 text-xs'}>
                  Set resupply date
                </button>
                <button onClick={() => openEdit(l)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Edit</button>
                <button onClick={() => { setDeleting(l._id); setError(''); }} className={btnGhost + ' !px-3 !py-1 text-xs text-red-500'}>Delete</button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {show && (
        <Modal title="Add location" onClose={() => setShow(false)}>
          <form onSubmit={create} className="flex flex-col gap-3">
            <Field label="Name"><input className={inputCls} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Field Camp A" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Parent">
                <select className={inputCls} value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                  <option value="">— none —</option>
                  {list.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Region"><input className={inputCls} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="Antarctica" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude (map)"><input type="number" step="any" className={inputCls} value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="-69.407" /></Field>
              <Field label="Longitude (map)"><input type="number" step="any" className={inputCls} value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="76.195" /></Field>
            </div>
            <Field label="Danger polygon JSON (optional, min 3 [lat,lng] pairs)"><input className={inputCls} value={form.dangerPolygon} onChange={e => setForm({ ...form, dangerPolygon: e.target.value })} placeholder="[[-69.40,76.18],[-69.38,76.20],[-69.36,76.19]]" /></Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Create</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit location" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <Field label="Name"><input className={inputCls} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Region"><input className={inputCls} value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude (map)"><input type="number" step="any" className={inputCls} value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} /></Field>
              <Field label="Longitude (map)"><input type="number" step="any" className={inputCls} value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} /></Field>
            </div>
            <Field label="Danger polygon JSON (optional, min 3 [lat,lng] pairs)"><input className={inputCls} value={form.dangerPolygon} onChange={e => setForm({ ...form, dangerPolygon: e.target.value })} /></Field>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete location?"
          message="Blocked if stock or personnel reference it. Child locations are removed too."
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={doDelete}
        />
      )}

      {resupplyId && (
        <Modal title="Next resupply date" onClose={() => setResupplyId(null)}>
          <form onSubmit={saveResupply} className="flex flex-col gap-3">
            <Field label="Date"><input type="date" className={inputCls} required value={resupplyDate} onChange={e => setResupplyDate(e.target.value)} /></Field>
            <button className={btnPrimary}>Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
