import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Modal, Field, inputCls, btnPrimary, btnGhost } from '../components/ui';

export default function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [action, setAction] = useState('');
  const [showAction, setShowAction] = useState(false);
  const [users, setUsers] = useState([]);
  const [responders, setResponders] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  const canManage = ['SuperAdmin', 'ExpeditionManager', 'EmergencyOfficer'].includes(user?.role);

  const load = async () => {
    try {
      const [detail, u] = await Promise.all([
        api(`/api/v1/incidents/${id}`),
        api('/api/v1/auth/users').catch(() => [])
      ]);
      setD(detail); setUsers(Array.isArray(u) ? u : []);
      if (detail?.incident) {
        setResponders(detail.incident.responderIds?.map(r => r._id || r) || []);
        setSelectedAssets(detail.incident.affectedAssetIds?.map(a => a._id || a) || []);
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, [id]);

  if (!d) return <Spinner />;
  const { incident: i, rollCall, resources, timeline, allowedNext } = d;

  const changeStatus = async () => {
    if (!status && responders.length === 0 && selectedAssets.length === 0) return;
    try {
      await api(`/api/v1/incidents/${id}/status`, {
        method: 'PATCH',
        body: {
          status: status || undefined,
          resolutionSummary: summary || undefined,
          responderIds: responders.length ? responders : undefined,
          affectedAssetIds: selectedAssets.length ? selectedAssets : undefined
        }
      });
      setStatus(''); setSummary(''); load();
    } catch (err) { alert(err.message); }
  };

  const toggleResponder = (uid) => {
    setResponders(r => (r.includes(uid) ? r.filter(x => x !== uid) : [...r, uid]));
  };

  const toggleAsset = (aid) => {
    setSelectedAssets(a => (a.includes(aid) ? a.filter(x => x !== aid) : [...a, aid]));
  };

  const addAction = async (e) => {
    e.preventDefault();
    await api(`/api/v1/incidents/${id}/actions`, { method: 'POST', body: { description: action } });
    setAction(''); setShowAction(false); load();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className={`p-4 ${i.severity === 'Critical' ? 'border-red-400 dark:border-red-600' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">{i.incidentCode} · {i.type}</h1>
          <div className="flex gap-1"><Pill value={i.severity} /><Pill value={i.status} /></div>
        </div>
        <p className="text-sm">📍 {i.location} · reported by {i.reportedBy?.fullName} · {new Date(i.createdAt).toLocaleString()}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{i.description}</p>
        {i.resolutionSummary && <p className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-sm">Resolution: {i.resolutionSummary}</p>}

        {canManage && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <div className="flex flex-col gap-2 sm:flex-row">
              {allowedNext.length > 0 && (
                <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">— change status —</option>
                  {allowedNext.map(s => <option key={s}>{s}</option>)}
                </select>
              )}
              {(status === 'Resolved' || status === 'Closed') && (
                <input className={inputCls} placeholder="Resolution summary (required)" value={summary} onChange={e => setSummary(e.target.value)} />
              )}
              <button onClick={changeStatus} className={btnPrimary}>Update Incident</button>
            </div>
            {users.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Mobilize Responders</p>
                <div className="flex flex-wrap gap-1">
                  {users.map(u => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleResponder(u._id)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${responders.includes(u._id) ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                    >
                      {responders.includes(u._id) ? '✓ ' : '+ '}{u.fullName || u.username} ({u.role})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {resources?.assets?.length > 0 && (
              <div className="mt-1">
                <p className="mb-1 text-xs font-semibold text-slate-500">Deploy Station Assets</p>
                <div className="flex flex-wrap gap-1">
                  {resources.assets.map(a => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => toggleAsset(a._id)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${selectedAssets.includes(a._id) ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                    >
                      {selectedAssets.includes(a._id) ? '✓ ' : '+ '}{a.assetTag} · {a.name} ({a.condition})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          {i.responderIds && i.responderIds.length > 0 && (
            <p><b>Responders Assigned:</b> {i.responderIds.map(r => r.fullName || r.username).join(', ')}</p>
          )}
          {i.affectedAssetIds && i.affectedAssetIds.length > 0 && (
            <p><b>Deployed Assets:</b> {i.affectedAssetIds.map(a => `${a.assetTag} (${a.name})`).join(', ')}</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-bold">Affected people — roll call ({rollCall.length})</h2>
          {rollCall.map(p => (
            <p key={p._id} className="py-0.5 text-sm">{p.badgeId || p._id} · {p.userId?.fullName} ({p.currentStatus})</p>
          ))}
          {rollCall.length === 0 && <p className="text-sm text-slate-500">Nobody currently at this location</p>}
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 font-bold">Available resources @ location</h2>
          <p className="text-xs font-semibold text-slate-500">ASSETS ({resources.assets.length})</p>
          {resources.assets.slice(0, 5).map(a => <p key={a._id} className="py-0.5 text-sm">{a.assetTag} · {a.name} ({a.condition})</p>)}
          <p className="mt-2 text-xs font-semibold text-slate-500">STOCK ({resources.inventory.length})</p>
          {resources.inventory.slice(0, 5).map(s => <p key={s._id} className="py-0.5 text-sm">{s.itemName}: {s.currentStock} {s.unit}</p>)}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Response timeline ({timeline.length})</h2>
          {canManage && !['Resolved', 'Closed'].includes(i.status) && (
            <button onClick={() => setShowAction(true)} className={btnGhost + ' !px-3 !py-1 text-xs'}>+ Record action</button>
          )}
        </div>
        <div className="flex flex-col gap-2 border-l-2 border-cyan-500/40 pl-3">
          {timeline.map(a => (
            <div key={a._id} className="text-sm">
              <p><b>{a.actionType}</b> — {a.description}</p>
              <p className="text-xs text-slate-500">{a.createdBy?.username} · {new Date(a.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      {showAction && (
        <Modal title="Record response action" onClose={() => setShowAction(false)}>
          <form onSubmit={addAction} className="flex flex-col gap-3">
            <Field label="What was done?"><input className={inputCls} required value={action} onChange={e => setAction(e.target.value)} placeholder="Dispatched snowmobile team with medic" /></Field>
            <button className={btnPrimary}>Save to timeline</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
