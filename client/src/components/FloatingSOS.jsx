import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, AlertTriangle, X, Radio, Satellite } from 'lucide-react';
import { api } from '../lib/api';
import { startSiren, playRadioChirp } from '../lib/audio';

export default function FloatingSOS() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleTriggerSOS = async () => {
    setBusy(true);
    setStatusMsg('Acquiring GNSS coordinates...');
    let coords = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
        );
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { /* proceed without coords */ }
    }

    setStatusMsg('Broadcasting emergency distress beacon...');
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
          notes: 'EMERGENCY: 1-Touch Floating SOS distress triggered by field operator!'
        }
      });
      setOpenModal(false);
      navigate('/map');
    } catch (err) {
      alert(`SOS Trigger Error: ${err.message}`);
    }
    setBusy(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => {
            playRadioChirp();
            setOpenModal(true);
          }}
          className="group relative flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-2.5 shadow-2xl border-2 border-red-400/80 animate-pulse hover:animate-none transition-all"
          title="Instant 1-Touch Emergency Distress Beacon"
        >
          <Siren size={18} className="animate-bounce" />
          <span className="tracking-wider uppercase">SOS Distress</span>
        </button>
      </div>

      {/* Confirmation Guard Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-slate-900 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-500 font-extrabold text-base uppercase tracking-wider">
                <Siren size={22} className="animate-bounce" />
                <span>Emergency Distress Broadcast</span>
              </div>
              <button onClick={() => setOpenModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 mb-1 text-red-400 text-sm">
                <AlertTriangle size={15} /> CONFIRM CRITICAL SOS ACTIVATION
              </p>
              This will immediately sound the military klaxon sirens across base station monitors, transmit your device coordinates to the Search & Rescue (SAR) command, and flag your personnel profile in <b>SOS_Alert</b>.
            </div>

            {statusMsg && (
              <p className="text-xs text-cyan-400 font-mono flex items-center gap-1.5 animate-pulse">
                <Satellite size={14} /> {statusMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                disabled={busy}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                Cancel Stand Down
              </button>
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={busy}
                className="px-5 py-2 text-xs font-extrabold uppercase tracking-wide rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all flex items-center gap-1.5"
              >
                <Siren size={15} />
                {busy ? 'Broadcasting...' : 'Transmit Emergency SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
