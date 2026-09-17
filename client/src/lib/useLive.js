import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

// Re-runs reload() on live socket events + window focus,
// so admin changes appear everywhere without manual refresh.
const EVENTS = ['alert:new', 'sos:broadcast', 'cargo:update', 'telemetry:update', 'asset:update'];

export function useLiveRefresh(reload) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    const run = () => { try { ref.current(); } catch { /* ignore */ } };
    let socket = null;
    try {
      socket = getSocket();
      EVENTS.forEach(e => socket.on(e, run));
    } catch { /* socket unavailable */ }
    window.addEventListener('focus', run);
    return () => {
      if (socket) EVENTS.forEach(e => socket.off(e, run));
      window.removeEventListener('focus', run);
    };
  }, []);
}
