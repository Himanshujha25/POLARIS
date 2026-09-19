import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, AlertTriangle, X, Satellite } from 'lucide-react';
import { api } from '../lib/api';
import { startSiren } from '../lib/audio';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#0C121E]/95 shadow-[0_0_50px_rgba(244,63,94,0.25)] p-6 text-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 shadow-md shadow-rose-500/20">
              <Siren size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-rose-400">
                Emergency Distress Beacon
              </h3>
              <p className="text-[11px] text-slate-400">
                Search & Rescue (SAR) Protocol · 406 MHz Frequency
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Message Card */}
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 text-xs text-rose-200/90 leading-relaxed space-y-2">
          <p className="font-bold flex items-center gap-2 text-rose-400 text-xs tracking-wide">
            <AlertTriangle size={15} className="shrink-0" />
            CONFIRM POLAR DISTRESS ACTIVATION
          </p>
          <p>
            Activating this beacon will trigger base-wide audio sirens, broadcast high-precision GNSS coordinates to all active tracked snowcats, and elevate your personnel profile to <b className="text-white">SOS_Alert</b> priority.
          </p>
        </div>

        {statusMsg && (
          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5 text-xs text-cyan-400 font-mono flex items-center gap-2 animate-pulse">
            <Satellite size={15} className="shrink-0 text-cyan-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
          >
            Cancel / Stand Down
          </button>
          <button
            type="button"
            onClick={handleTriggerSOS}
            disabled={busy}
            className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 text-white shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-102 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Siren size={15} />
            <span>{busy ? 'Broadcasting...' : 'Transmit Live SOS'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
