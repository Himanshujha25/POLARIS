import { useEffect, useState, useRef } from 'react';
import { Search, Biohazard, Printer, Box, ShieldCheck, Package, ScanLine, QrCode, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/useLive';
import { useAuth } from '../context/AuthContext';
import { Card, Pill, Spinner, Empty, Modal, Field, inputCls, btnPrimary, btnGhost, ErrorNote, ConfirmDialog } from '../components/ui';
import ContainerLabelModal from '../components/ContainerLabelModal';
import ImageOcrUploader from '../components/ImageOcrUploader';
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
    tareWeightKg: 2200,
    expeditionId: '',
    isHazmat: false,
    hazmatClass: '',
    customsDeclarationNumber: '',
    containerType: '20ft_Standard',
    itemsText: '',
    imageUrl: '',
    ocrExtractedText: ''
  });
  const [printCargo, setPrintCargo] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [receiveCargo, setReceiveCargo] = useState(null);
  const [receiveStation, setReceiveStation] = useState('Maitri');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    weightKg: '',
    eta: '',
    containerNumber: '',
    sealNumber: '',
    containerType: '20ft_Standard',
    imageUrl: '',
    ocrExtractedText: ''
  });
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = ['SuperAdmin', 'ExpeditionManager', 'LogisticsOfficer'].includes(user?.role);

  const isFirstLoad = useRef(true);
  const load = async (isBackground = false) => {
    if (isFirstLoad.current && !isBackground) {
      setLoading(true);
    }
    try {
      const [c, e] = await Promise.all([
        api(`/api/v1/cargo${statusF ? `?status=${statusF}` : ''}`),
        api('/api/v1/expeditions')
      ]);
      setList(c || []);
      setExps(e || []);
      setForm(f => {
        if (!f.expeditionId && e?.[0]) return { ...f, expeditionId: e[0]._id };
        return f;
      });
    } catch { /* ignore */ }
    finally {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        setLoading(false);
      }
    }
  };
  useEffect(() => { load(false); }, [statusF]);
  useLiveRefresh(load);

  const generateNewTrackingNumber = (prefix = 'CRG') => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-BHR-${rand}`;
  };

  const openCreateModal = () => {
    setForm({
      trackingNumber: '',
      title: '',
      category: 'Provisions',
      weightKg: '',
      expeditionId: exps[0]?._id || '',
      isHazmat: false,
      containerNumber: '',
      sealNumber: '',
      containerType: '20ft_Standard',
      tareWeightKg: 2200,
      itemsText: '',
      imageUrl: '',
      ocrExtractedText: ''
    });
    setError('');
    setShowCreate(true);
  };

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
    setEditForm({
      title: c.title,
      weightKg: c.weightKg || '',
      eta: c.eta ? c.eta.slice(0, 10) : '',
      containerNumber: c.containerNumber || '',
      sealNumber: c.sealNumber || '',
      containerType: c.containerType || '20ft_Standard',
      imageUrl: c.imageUrl || '',
      ocrExtractedText: c.ocrExtractedText || ''
    });
    setError('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/api/v1/cargo/${editing}`, {
        method: 'PATCH',
        body: {
          title: editForm.title,
          weightKg: Number(editForm.weightKg) || 0,
          eta: editForm.eta || undefined,
          containerNumber: editForm.containerNumber,
          sealNumber: editForm.sealNumber,
          containerType: editForm.containerType,
          imageUrl: editForm.imageUrl,
          ocrExtractedText: editForm.ocrExtractedText
        }
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
        {canEdit && <button className={btnPrimary} onClick={openCreateModal}>+ Register Cargo</button>}
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
                  <span>HAZMAT {c.hazmatClass ? `(${c.hazmatClass})` : ''}</span>
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
                <p className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Package size={13} className="text-cyan-500 shrink-0" />
                  <span>Manifest / Container Items ({c.items.length}):</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {c.items.map((it, idx) => (
                    <span key={idx} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-medium dark:border-slate-700 dark:bg-slate-800">
                      {it.name}: <b>{it.quantity} {it.unit}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(c.containerNumber || c.sealNumber) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded border border-slate-200/60 dark:border-slate-700/50">
                {c.containerNumber && (
                  <span className="font-mono flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100">
                    <Box size={12} className="text-cyan-500 shrink-0" />
                    <span>ISO: {c.containerNumber}</span>
                  </span>
                )}
                {c.sealNumber && (
                  <span className="font-mono flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                    <ShieldCheck size={12} className="shrink-0" />
                    <span>Seal: {c.sealNumber}</span>
                  </span>
                )}
              </div>
            )}
            {c.imageUrl && (
              <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900/40">
                <img src={c.imageUrl} alt={c.title} className="w-full h-28 object-cover" />
                {c.ocrExtractedText && (
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur px-2 py-1 text-[10px] font-mono text-cyan-300 truncate flex items-center gap-1" title={c.ocrExtractedText}>
                    <ScanLine size={11} className="shrink-0 text-cyan-400" />
                    <span>Label OCR: {c.ocrExtractedText.replace(/\n+/g, ' ')}</span>
                  </div>
                )}
              </div>
            )}
            {!c.imageUrl && c.ocrExtractedText && (
              <div className="mt-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate flex items-center gap-1" title={c.ocrExtractedText}>
                <ScanLine size={11} className="shrink-0 text-cyan-500" />
                <span>Label OCR: {c.ocrExtractedText.replace(/\n+/g, ' ')}</span>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">NCPOR Goa → Port → Ship → Ice Shelf → Station</p>
            <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400">Now: {c.currentNode} · ETA {c.eta ? new Date(c.eta).toLocaleDateString() : '—'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setQrModalCargo(c)} className={btnGhost + ' !px-2.5 !py-1 text-xs flex items-center gap-1 text-cyan-600 dark:text-cyan-400'}>
                <QrCode size={13} /> QR Seal
              </button>
              <button onClick={() => openTimeline(c)} className={btnGhost + ' !px-3 !py-1 text-xs'}>Timeline</button>
              <button
                type="button"
                onClick={() => setPrintCargo(c)}
                className={`${btnGhost} !px-3 !py-1 text-xs flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400 hover:border-cyan-500`}
                title="Print Official Customs Shipping Container Label & Barcode"
              >
                <Printer size={13} />
                <span>Print Label</span>
              </button>
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
            <Field label="Tracking Number / QR">
              <input
                className={inputCls}
                required
                placeholder="e.g. CRG-2027-BHR-002"
                value={form.trackingNumber}
                onChange={e => setForm({ ...form, trackingNumber: e.target.value })}
              />
            </Field>
            <Field label="Consignment Title"><input className={inputCls} required placeholder="e.g. Winter Provisions Container #4" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>

            <ImageOcrUploader
              label="Container & Customs Seal Photo (OCR)"
              imageUrl={form.imageUrl}
              onImageChange={url => setForm(f => ({ ...f, imageUrl: url }))}
              ocrText={form.ocrExtractedText}
              onOcrTextChange={txt => setForm(f => ({ ...f, ocrExtractedText: txt }))}
              onReset={() => setForm(f => ({
                ...f,
                containerNumber: '',
                sealNumber: '',
                imageUrl: '',
                ocrExtractedText: ''
              }))}
              mode="container"
              onAutoFill={suggested => {
                setForm(f => {
                  let matchedExpId = f.expeditionId;
                  if (suggested.expeditionKeyword && exps.length > 0) {
                    const match = exps.find(x =>
                      x.expeditionCode.toUpperCase().includes(suggested.expeditionKeyword) ||
                      (suggested.expeditionKeyword.includes('BHARATI') && x.targetBase?.includes('Bharati')) ||
                      (suggested.expeditionKeyword.includes('MAITRI') && x.targetBase?.includes('Maitri'))
                    );
                    if (match) matchedExpId = match._id;
                  }

                  return {
                    ...f,
                    title: suggested.title !== undefined ? suggested.title : f.title,
                    category: suggested.category !== undefined ? suggested.category : f.category,
                    containerType: suggested.containerType !== undefined ? suggested.containerType : f.containerType,
                    weightKg: suggested.weightKg !== undefined ? suggested.weightKg : f.weightKg,
                    trackingNumber: suggested.trackingNumber || f.trackingNumber,
                    containerNumber: suggested.containerNumber !== undefined ? suggested.containerNumber : f.containerNumber,
                    sealNumber: suggested.sealNumber !== undefined ? suggested.sealNumber : f.sealNumber,
                    tareWeightKg: suggested.tareWeightKg !== undefined ? suggested.tareWeightKg : f.tareWeightKg,
                    isHazmat: suggested.isHazmat !== undefined ? suggested.isHazmat : f.isHazmat,
                    itemsText: suggested.itemsText !== undefined ? suggested.itemsText : f.itemsText,
                    expeditionId: matchedExpId
                  };
                });
              }}
            />
            
            <div className="grid grid-cols-3 gap-2">
              <Field label="ISO Container No.">
                <input
                  className={inputCls}
                  placeholder="e.g. MSCU-7294012"
                  value={form.containerNumber}
                  onChange={e => setForm({ ...form, containerNumber: e.target.value })}
                />
              </Field>
              <Field label="Customs Seal No.">
                <input
                  className={inputCls}
                  placeholder="e.g. IND-CUS-88291"
                  value={form.sealNumber}
                  onChange={e => setForm({ ...form, sealNumber: e.target.value })}
                />
              </Field>
              <Field label="Container Type">
                <select
                  className={inputCls}
                  value={form.containerType}
                  onChange={e => setForm({ ...form, containerType: e.target.value })}
                >
                  <option value="20ft_Standard">20ft Standard</option>
                  <option value="20ft_Reefer_Heated">20ft Reefer (Heated)</option>
                  <option value="40ft_Standard">40ft Standard</option>
                  <option value="Fuel_ISO_Tank">Fuel ISO Tank</option>
                  <option value="Pallet_Crate">Pallet / Crate</option>
                </select>
              </Field>
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

            {/* HAZMAT Classification Card */}
            <div 
              onClick={() => setForm(f => ({ ...f, isHazmat: !f.isHazmat }))}
              className={`rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                form.isHazmat 
                  ? 'border-amber-400 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/30 shadow-xs' 
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                    form.isHazmat 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                      : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                  }`}>
                    <Biohazard size={17} className={form.isHazmat ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold transition-colors ${
                      form.isHazmat ? 'text-amber-950 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      Classify as Hazardous Material (HAZMAT)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Polar Fuel (Jet A-1), lithium batteries, compressed gases, or cryogenics
                    </p>
                  </div>
                </div>

                {/* Modern Animated Toggle Switch */}
                <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.isHazmat ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    form.isHazmat ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </div>

              {form.isHazmat && (
                <div className="mt-3 pt-2.5 border-t border-amber-200/80 dark:border-amber-500/20" onClick={e => e.stopPropagation()}>
                  <Field label="HAZMAT Classification / Class (UN Code)">
                    <input
                      className={inputCls}
                      placeholder="e.g. Class 3 Flammable Liquid (UN 1863) or Class 9 Lithium (UN 3480)"
                      value={form.hazmatClass || ''}
                      onChange={e => setForm({ ...form, hazmatClass: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={btnGhost}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${btnPrimary} flex items-center gap-1.5`}
              >
                <Box size={15} />
                <span>Register Cargo Manifest</span>
              </button>
            </div>
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
        <Modal title="Edit cargo & container specifications" onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <Field label="Title"><input className={inputCls} required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)"><input type="number" className={inputCls} value={editForm.weightKg} onChange={e => setEditForm({ ...editForm, weightKg: e.target.value })} /></Field>
              <Field label="ETA"><input type="date" className={inputCls} value={editForm.eta} onChange={e => setEditForm({ ...editForm, eta: e.target.value })} /></Field>
            </div>

            <ImageOcrUploader
              label="Container / Tamper Seal Inspection Photo (OCR)"
              imageUrl={editForm.imageUrl}
              onImageChange={url => setEditForm(f => ({ ...f, imageUrl: url }))}
              ocrText={editForm.ocrExtractedText}
              onOcrTextChange={txt => setEditForm(f => ({ ...f, ocrExtractedText: txt }))}
              mode="container"
              onAutoFill={suggested => {
                setEditForm(f => ({
                  ...f,
                  title: suggested.title || f.title,
                  containerNumber: suggested.containerNumber !== undefined ? suggested.containerNumber : f.containerNumber,
                  sealNumber: suggested.sealNumber !== undefined ? suggested.sealNumber : f.sealNumber,
                  tareWeightKg: suggested.tareWeightKg || f.tareWeightKg,
                  weightKg: suggested.weightKg || f.weightKg
                }));
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <Field label="ISO Container No.">
                <input
                  className={inputCls}
                  placeholder="e.g. MSCU-7294012"
                  value={editForm.containerNumber}
                  onChange={e => setEditForm({ ...editForm, containerNumber: e.target.value })}
                />
              </Field>
              <Field label="Customs Seal No.">
                <input
                  className={inputCls}
                  placeholder="e.g. IND-CUS-88291"
                  value={editForm.sealNumber}
                  onChange={e => setEditForm({ ...editForm, sealNumber: e.target.value })}
                />
              </Field>
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
                <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Package size={14} className="text-cyan-500 shrink-0" />
                  <span>Manifest items being unpacked:</span>
                </p>
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

      {printCargo && (
        <ContainerLabelModal
          cargo={printCargo}
          onClose={() => setPrintCargo(null)}
        />
      )}
    </div>
  );
}
