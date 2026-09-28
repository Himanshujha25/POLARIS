import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, AlertTriangle, X, Satellite } from 'lucide-react';
import { api } from '../lib/api';
import { startSiren } from '../lib/audio';
import { useAuth } from '../context/AuthContext';
import { btnGhost, btnDanger, ErrorNote } from './ui';

export default function FloatingSOS({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isModalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const handleClose = onClose || (() => setInternalOpen(false));

  useEffect(() => {
    if (!isModalOpen) {
      setStatusMsg('');
      setErrorMsg('');
      return;
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, busy, handleClose]);

  const handleTriggerSOS = async () => {
    setBusy(true);
    setErrorMsg('');
    setStatusMsg('Acquiring GNSS polar coordinates...');
    let coords = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // Proceed without GNSS if permission denied or offline
      }
    }

    setStatusMsg('Broadcasting emergency distress beacon to SAR command...');
    try {
      startSiren();
      const operatorBadge = user?.badgeId || user?.username || 'FIELD-OPERATOR';
      await api('/api/v1/personnel/checkin', {
        method: 'POST',
        body: {
          badgeId: operatorBadge,
          status: 'SOS_Alert',
          lat: coords.lat,
          lng: coords.lng,
          location: coords.lat ? `Distress GNSS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : `${user?.station || 'Field'} Excursion Distress`,
          notes: `EMERGENCY: 1-Touch SOS distress beacon triggered by ${user?.fullName || operatorBadge} (${user?.role || 'Operator'})`
        }
      });
      handleClose();
      navigate('/map');
    } catch (err) {
      setErrorMsg(`SOS Transmission Failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <div 
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sos-dialog-title"
      aria-describedby="sos-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4"
      onClick={busy ? undefined : handleClose}
    >
      <div 
        className="relative w-full max-w-md rounded-xl border border-red-300 dark:border-red-900/80 bg-white dark:bg-[#111a2e] shadow-xl p-5 text-slate-800 dark:text-slate-100 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-red-100 dark:border-red-950/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400">
              <Siren size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="sos-dialog-title" className="text-sm font-bold uppercase tracking-wider text-red-800 dark:text-red-400 text-balance">
                Emergency Distress Beacon
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search & Rescue (SAR) Protocol · 406 MHz Frequency
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close emergency dialog"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors cursor-pointer text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Warning Message Card */}
        <div id="sos-dialog-desc" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3.5 text-xs text-red-900 dark:text-red-200 leading-relaxed space-y-2">
          <p className="font-bold flex items-center gap-2 text-red-800 dark:text-red-400 text-xs tracking-wide">
            <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
            CONFIRM POLAR DISTRESS ACTIVATION
          </p>
          <p className="text-pretty">
            Activating this beacon will trigger base-wide audio sirens, broadcast high-precision GNSS coordinates to all active tracked snowcats, and elevate operator <strong className="font-mono tabular-nums text-red-950 dark:text-white">[{user?.badgeId || user?.username || 'CURRENT'}]</strong> to <strong className="font-semibold">SOS_Alert</strong> priority.
          </p>
        </div>

        {statusMsg && (
          <div role="status" aria-live="polite" className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-2.5 text-xs text-blue-900 dark:text-blue-300 font-mono tabular-nums flex items-center gap-2">
            <Satellite size={15} className="shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && <ErrorNote message={errorMsg} />}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className={`${btnGhost} w-full text-center`}
          >
            Cancel / Stand Down
          </button>
          <button
            type="button"
            onClick={handleTriggerSOS}
            disabled={busy}
            className={`${btnDanger} w-full gap-2 text-center`}
          >
            <Siren size={16} aria-hidden="true" />
            <span>{busy ? 'Broadcasting…' : 'Transmit Live SOS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
