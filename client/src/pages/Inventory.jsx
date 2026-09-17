import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog, downloadCSV } from '../components/ui';

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationF, setStationF] = useState('');
  const [tab, setTab] = useState('stock');
  const [consumeId, setConsumeId] = useState(null);
  const [amount, setAmount] = useState(10);
  const [mode, setMode] = useState('consume');
  const [reason, setReason] = useState('');
  const [showTransfer, setShowTransfer] = useState(null);
  const [transfer, setTransfer] = useState({ toStation: '', quantity: 10, reason: '' });
  const [override, setOverride] = useState(false);
  const [error, setError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ minimumSafeThreshold: '', criticalEmergencyThreshold: '', dailyConsumptionRate: '', storageBunker: '' });
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'InventoryOfficer'].includes(user?.role);
  // Station options derived live: Locations API first, then stations actually in stock
  const [stationOptions, setStationOptions] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, t, locs] = await Promise.all([
        api(`/api/v1/inventory${stationF ? `?station=${stationF}` : ''}`),
        api(`/api/v1/inventory/transactions${stationF ? `?station=${stationF}` : ''}`),
        api('/api/v1/locations').catch(() => [])
      ]);
      setItems(inv); setTxns(t);
      const fromLocs = Array.isArray(locs) ? locs.filter(l => ['Station', 'Warehouse'].includes(l.type)).map(l => l.name.replace(' Station', '')) : [];
      const fromStock = [...new Set(inv.map(i => i.station))];
      setStationOptions([...new Set([...fromLocs, ...fromStock])]);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [stationF]);
  useLiveRefresh(load);

  const applyConsume = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/inventory/${consumeId}/consume`, {
        method: 'PATCH',
        body: mode === 'consume'
          ? { consume: Number(amount), reason, emergencyOverride: override || undefined }
          : { resupply: Number(amount), reason }
      });
      setConsumeId(null); setReason(''); setOverride(false); load();
    } catch (err) { setError(err.message); }
  };

  const openItemEdit = (it) => {
    setEditingItem(it._id);
    setItemForm({
      minimumSafeThreshold: it.minimumSafeThreshold, criticalEmergencyThreshold: it.criticalEmergencyThreshold,
      dailyConsumptionRate: it.dailyConsumptionRate, storageBunker: it.storageBunker || ''
    });
    setError('');
  };

  const saveItemEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/inventory/${editingItem}`, {
        method: 'PATCH',
        body: {
          minimumSafeThreshold: Number(itemForm.minimumSafeThreshold),
          criticalEmergencyThreshold: Number(itemForm.criticalEmergencyThreshold),
          dailyConsumptionRate: Number(itemForm.dailyConsumptionRate),
          storageBunker: itemForm.storageBunker
        }
      });
      setEditingItem(null); load();
    } catch (err) { setError(err.message); }
  };

  const doDelete = async () => {
    setBusy(true); setError('');
    try {
      await api(`/api/v1/inventory/${deleting}`, { method: 'DELETE' });
      setDeleting(null); load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const exportCSV = () => {
    downloadCSV('polaris-inventory.csv', [
      ['Item', 'Station', 'Category', 'Stock', 'Unit', 'DailyUse', 'DaysLeft', 'Status'],
      ...items.map(i => [i.itemName, i.station, i.category, i.currentStock, i.unit, i.dailyConsumptionRate, i.daysRemainingCalculated, i.status])
    ]);
  };

  const exportTxns = () => {
    downloadCSV('polaris-transactions.csv', [
      ['Time', 'Type', 'Item', 'Station', 'Qty', 'Open', 'Close', 'Ref'],
      ...txns.map(t => [t.createdAt, t.type, t.itemName, t.station, t.quantity, t.openingStock, t.closingStock, t.transferId || t.reference || ''])
    ]);
  };

  const doTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/api/v1/inventory/transfer', {
        method: 'POST',
        body: { fromInventoryId: showTransfer, toStation: transfer.toStation, quantity: Number(transfer.quantity), reason: transfer.reason }
      });
      alert(`Transfer ${res.transferId} done`);
      setShowTransfer(null); load();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold sm:text-2xl">Station Inventory & Life Support</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('stock')} className={`${btnGhost} !px-3 !py-1 text-xs ${tab === 'stock' ? '!border-cyan-500 !text-cyan-600' : ''}`}>Stock</button>
          <button onClick={() => setTab('txns')} className={`${btnGhost} !px-3 !py-1 text-xs ${tab === 'txns' ? '!border-cyan-500 !text-cyan-600' : ''}`}>Transactions</button>
          <button onClick={exportCSV} className={btnGhost + ' !px-3 !py-1 text-xs'}>Export stock CSV</button>
          {tab === 'txns' && <button onClick={exportTxns} className={btnGhost + ' !px-3 !py-1 text-xs'}>Export txns CSV</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStationF('')} className={`${btnGhost} !px-3 !py-1 text-xs ${!stationF ? '!border-cyan-500 !text-cyan-600' : ''}`}>
          All stations
        </button>
        {stationOptions.map(s => (
          <button key={s} onClick={() => setStationF(s)} className={`${btnGhost} !px-3 !py-1 text-xs ${stationF === s ? '!border-cyan-500 !text-cyan-600' : ''}`}>
            {s}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <>
          {items.length === 0 && <Empty />}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(it => (
              <Card key={it._id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{it.itemName}</p>
                  <Pill value={it.status} />
                </div>
                <p className="text-xs text-slate-500">{it.station} · {it.category} · {it.storageBunker}</p>
                <p className="mt-2 text-2xl font-extrabold">{it.currentStock} <span className="text-sm font-normal">{it.unit}</span></p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-full ${it.status === 'Optimal' ? 'bg-emerald-500' : it.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (it.currentStock / Math.max(1, it.minimumSafeThreshold * 2)) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">~{it.daysRemainingCalculated} days · uses {it.dailyConsumptionRate}/day</p>
                {canEdit && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => setConsumeId(it._id)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Usage / receipt</button>
                    <button onClick={() => { setShowTransfer(it._id); setTransfer({ toStation: '', quantity: 10, reason: '' }); }} className={btnGhost + ' !px-3 !py-1 text-xs'}>Transfer</button>
                    <button onClick={() => openItemEdit(it)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Edit</button>
                    <button onClick={() => { setDeleting(it._id); setError(''); }} className={btnGhost + ' !px-3 !py-1 text-xs text-red-500'}>Delete</button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === 'txns' && (
        <Card className="p-0">
          {txns.length === 0 ? <Empty text="No transactions yet — every stock change is recorded here" /> : (
            <TableWrap>
              <table className="w-full">
                <thead><tr><Th>Time</Th><Th>Type</Th><Th>Item</Th><Th>Qty</Th><Th>Open → Close</Th><Th>Ref</Th></tr></thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t._id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                      <Td><Pill value={t.type} /></Td>
                      <Td>{t.itemName} ({t.station})</Td>
                      <Td className={t.quantity < 0 ? 'text-red-500' : 'text-emerald-500'}>{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</Td>
                      <Td>{t.openingStock} → {t.closingStock}</Td>
                      <Td>{t.transferId || t.reference || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      )}

      {consumeId && (
        <Modal title="Log usage / receipt" onClose={() => setConsumeId(null)}>
          <form onSubmit={applyConsume} className="flex flex-col gap-3">
            <Field label="Mode">
              <select className={inputCls} value={mode} onChange={e => setMode(e.target.value)}>
                <option value="consume">Consume (usage)</option>
                <option value="resupply">Receipt (add stock)</option>
              </select>
            </Field>
            <Field label="Amount"><input type="number" min="1" className={inputCls} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
            <Field label="Reason"><input className={inputCls} value={reason} onChange={e => setReason(e.target.value)} placeholder="Daily mess consumption" /></Field>
            {mode === 'consume' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} />
                Emergency override (allow below zero)
              </label>
            )}
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save (creates transaction)</button>
          </form>
        </Modal>
      )}

      {showTransfer && (
        <Modal title="Transfer stock between stations" onClose={() => setShowTransfer(null)}>
          <form onSubmit={doTransfer} className="flex flex-col gap-3">
            <Field label="To station (live)">
              <select className={inputCls} value={transfer.toStation} onChange={e => setTransfer({ ...transfer, toStation: e.target.value })}>
                <option value="">— select —</option>
                {(stationOptions.length ? stationOptions : ['Bharati', 'Maitri', 'Himadri']).map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input type="number" min="1" className={inputCls} value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: e.target.value })} /></Field>
            <Field label="Reason"><input className={inputCls} value={transfer.reason} onChange={e => setTransfer({ ...transfer, reason: e.target.value })} /></Field>
            <button className={btnPrimary}>Transfer (creates linked pair)</button>
          </form>
        </Modal>
      )}

      {editingItem && (
        <Modal title="Edit stock item" onClose={() => setEditingItem(null)}>
          <form onSubmit={saveItemEdit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Warn below"><input type="number" className={inputCls} value={itemForm.minimumSafeThreshold} onChange={e => setItemForm({ ...itemForm, minimumSafeThreshold: e.target.value })} /></Field>
              <Field label="Critical below"><input type="number" className={inputCls} value={itemForm.criticalEmergencyThreshold} onChange={e => setItemForm({ ...itemForm, criticalEmergencyThreshold: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily use rate"><input type="number" className={inputCls} value={itemForm.dailyConsumptionRate} onChange={e => setItemForm({ ...itemForm, dailyConsumptionRate: e.target.value })} /></Field>
              <Field label="Bunker"><input className={inputCls} value={itemForm.storageBunker} onChange={e => setItemForm({ ...itemForm, storageBunker: e.target.value })} /></Field>
            </div>
            <ErrorNote message={error} />
            <button className={btnPrimary}>Save changes</button>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete stock item?"
          message="Blocked if any transactions reference it (traceability). Set stock to 0 instead."
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}
