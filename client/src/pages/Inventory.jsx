import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, TableWrap, Th, Td, inputCls, btnPrimary, btnGhost } from '../components/ui';

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

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'InventoryOfficer'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [inv, t] = await Promise.all([
        api(`/api/v1/inventory${stationF ? `?station=${stationF}` : ''}`),
        api(`/api/v1/inventory/transactions${stationF ? `?station=${stationF}` : ''}`)
      ]);
      setItems(inv); setTxns(t);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [stationF]);

  const applyConsume = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/v1/inventory/${consumeId}/consume`, {
        method: 'PATCH',
        body: mode === 'consume' ? { consume: Number(amount), reason } : { resupply: Number(amount), reason }
      });
      setConsumeId(null); setReason(''); load();
    } catch (err) { alert(err.message); }
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
        </div>
      </div>

      <div className="flex gap-2">
        {['', 'Bharati', 'Maitri', 'Himadri'].map(s => (
          <button key={s} onClick={() => setStationF(s)} className={`${btnGhost} !px-3 !py-1 text-xs ${stationF === s ? '!border-cyan-500 !text-cyan-600' : ''}`}>
            {s || 'All stations'}
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
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setConsumeId(it._id)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Usage / receipt</button>
                    <button onClick={() => { setShowTransfer(it._id); setTransfer({ toStation: '', quantity: 10, reason: '' }); }} className={btnGhost + ' !px-3 !py-1 text-xs'}>Transfer</button>
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
            <button className={btnPrimary}>Save (creates transaction)</button>
          </form>
        </Modal>
      )}

      {showTransfer && (
        <Modal title="Transfer stock between stations" onClose={() => setShowTransfer(null)}>
          <form onSubmit={doTransfer} className="flex flex-col gap-3">
            <Field label="To station">
              <select className={inputCls} value={transfer.toStation} onChange={e => setTransfer({ ...transfer, toStation: e.target.value })}>
                <option value="">— select —</option>
                {['Bharati', 'Maitri', 'Himadri'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input type="number" min="1" className={inputCls} value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: e.target.value })} /></Field>
            <Field label="Reason"><input className={inputCls} value={transfer.reason} onChange={e => setTransfer({ ...transfer, reason: e.target.value })} /></Field>
            <button className={btnPrimary}>Transfer (creates linked pair)</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
