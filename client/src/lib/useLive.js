import { useEffect, useRef } from 'react';
import { getSocket } from './socket';

// Re-runs reload() on live socket events + window focus,
// so admin changes appear everywhere without manual refresh.
const EVENTS = ['alert:new', 'sos:broadcast', 'cargo:update', 'telemetry:update', 'asset:update'];

let lastFocusSync = 0;
let fileInputActiveUntil = 0;

if (typeof window !== 'undefined') {
  // Flag when user opens a native file dialog so focus event doesn't disrupt uploads
  window.addEventListener('click', (e) => {
    if (e.target?.tagName === 'INPUT' && e.target?.type === 'file') {
      fileInputActiveUntil = Date.now() + 15000;
    }
  }, true);
}

export function useLiveRefresh(reload) {
  const ref = useRef(reload);
  ref.current = reload;
  useEffect(() => {
    const run = (isBg = true) => { try { ref.current(isBg); } catch { /* ignore */ } };
    let socket = null;
    try {
      socket = getSocket();
      EVENTS.forEach(e => socket.on(e, () => run(true)));
    } catch { /* socket unavailable */ }

    const onFocus = () => {
      const now = Date.now();
      // Skip if user was recently interacting with a file dialog or within 10s cooldown
      if (now < fileInputActiveUntil || now - lastFocusSync < 10000) return;
      lastFocusSync = now;
      run(true);
    };

    window.addEventListener('focus', onFocus);
    return () => {
      if (socket) EVENTS.forEach(e => socket.off(e, () => run(true)));
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}
