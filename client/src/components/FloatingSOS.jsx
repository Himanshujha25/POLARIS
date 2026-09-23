import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, AlertTriangle, X, Satellite } from 'lucide-react';
import { api } from '../lib/api';
import { startSiren } from '../lib/audio';
import { btnGhost, btnDanger } from './ui';

export default function FloatingSOS({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const isModalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const handleClose = onClose || (() => setInternalOpen(false));

  const handleTriggerSOS = async () => {
    setBusy(true);
    setStatusMsg('Acquiring GNSS polar coordinates...');
    let coords = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* proceed without coords */ }
    }

    setStatusMsg('Broadcasting emergency distress beacon to SAR command...');
    try {
      startSiren();
      await api('/api/v1/personnel/checkin', {
        method: 'POST',
        body: {
          badgeId: 'BHR-1',
          status: 'SOS_Alert',
          lat: coords.lat,
          lng: coords.lng,
          location: coords.lat ? `Distress GNSS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : 'Field Excursion Distress',
          notes: 'EMERGENCY: 1-Touch SOS distress beacon triggered by field operator!'
        }
      });
      handleClose();
      navigate('/map');
    } catch (err) {
      alert(`SOS Trigger Error: ${err.message}`);
    }
    setBusy(false);
  };

  if (!isModalOpen) return null;

  return (
    /* Ultra-Premium Antarctic Emergency Guard Modal */
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-rose-500/30 bg-white/95 dark:bg-[#0C121E]/95 shadow-2xl dark:shadow-[0_0_50px_rgba(244,63,94,0.25)] backdrop-blur-md p-6 text-slate-800 dark:text-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-rose-500/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-500 shadow-sm">
              <Siren size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Emergency Distress Beacon
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Search & Rescue (SAR) Protocol · 406 MHz Frequency
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Message Card */}
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/90 dark:border-rose-500/25 p-4 text-xs text-rose-900 dark:text-rose-200/90 leading-relaxed space-y-2">
          <p className="font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs tracking-wide">
            <AlertTriangle size={15} className="shrink-0" />
            CONFIRM POLAR DISTRESS ACTIVATION
          </p>
          <p>
            Activating this beacon will trigger base-wide audio sirens, broadcast high-precision GNSS coordinates to all active tracked snowcats, and elevate your personnel profile to <b className="font-semibold text-rose-950 dark:text-white">SOS_Alert</b> priority.
          </p>
        </div>

        {statusMsg && (
          <div className="rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 p-2.5 text-xs text-cyan-800 dark:text-cyan-400 font-mono flex items-center gap-2 animate-pulse">
            <Satellite size={15} className="shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className={`${btnGhost} w-full flex items-center justify-center text-center`}
          >
            Cancel / Stand Down
          </button>
          <button
            type="button"
            onClick={handleTriggerSOS}
            disabled={busy}
            className={`${btnDanger} w-full flex items-center justify-center gap-2 text-center`}
          >
            <Siren size={16} />
            <span>{busy ? 'Broadcasting...' : 'Transmit Live SOS'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
