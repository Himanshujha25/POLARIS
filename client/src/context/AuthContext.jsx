import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';
import { getSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore cached session instantly so refresh never flashes logout
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('polaris_user')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState([]);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setUser(null);
        localStorage.removeItem('polaris_user');
        setLoading(false);
        return;
      }
      try {
        const me = await api('/api/v1/auth/me');
        setUser(me);
        localStorage.setItem('polaris_user', JSON.stringify(me));
      } catch (err) {
        // Only drop the session when the token is rejected (401).
        // Network/server-down errors keep the cached session.
        if (err.status === 401) {
          localStorage.removeItem('polaris_token');
          localStorage.removeItem('polaris_user');
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Live socket feed + initial DB sync once logged in
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // 1. Initial DB sync for active alerts
    api('/api/v1/alerts/active')
      .then(active => {
        if (Array.isArray(active)) {
          setLiveAlerts(active.slice(0, 30));
        }
      })
      .catch(() => {});

    // 2. Real-time push when new alert or SOS is broadcast
    const push = (alert) => {
      setLiveAlerts(prev => {
        // deduplicate by _id
        const filtered = prev.filter(a => (a._id || a.id) !== (alert._id || alert.id));
        return [alert, ...filtered].slice(0, 30);
      });
    };

    // 3. Real-time removal when alert is acknowledged/dismissed
    const handleAck = (data) => {
      const targetId = data?.alertId || data?._id || data?.id;
      if (targetId) {
        setLiveAlerts(prev => prev.filter(a => (a._id || a.id) !== targetId));
      }
    };

    // 4. Real-time wipe when all alerts are cleared
    const handleClearAll = () => {
      setLiveAlerts([]);
    };

    socket.on('alert:new', push);
    socket.on('sos:broadcast', push);
    socket.on('alert:acknowledged', handleAck);
    socket.on('alerts:cleared', handleClearAll);

    return () => {
      socket.off('alert:new', push);
      socket.off('sos:broadcast', push);
      socket.off('alert:acknowledged', handleAck);
      socket.off('alerts:cleared', handleClearAll);
    };
  }, [user]);

  const login = async (username, password) => {
    const data = await api('/api/v1/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem('polaris_token', data.token);
    const me = await api('/api/v1/auth/me');
    localStorage.setItem('polaris_user', JSON.stringify(me));
    setUser(me);
    return me;
  };

  const logout = () => {
    localStorage.removeItem('polaris_token');
    localStorage.removeItem('polaris_user');
    setUser(null);
    setLiveAlerts([]);
    disconnectSocket();
  };

  // Clear all alerts from both UI and DB in real time
  const clearLiveAlerts = async () => {
    setLiveAlerts([]);
    try {
      await api('/api/v1/alerts/clear-all', { method: 'POST' });
    } catch (err) {
      console.error('[alerts] clear-all error:', err);
      // Restore on failure
      const active = await api('/api/v1/alerts/active').catch(() => []);
      if (Array.isArray(active)) setLiveAlerts(active.slice(0, 30));
    }
  };

  // Dismiss individual alert from both UI and DB in real time
  const dismissAlert = async (alertId) => {
    setLiveAlerts(prev => prev.filter(a => (a._id || a.id) !== alertId));
    try {
      await api(`/api/v1/alerts/${alertId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[alerts] dismiss error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, liveAlerts, clearLiveAlerts, dismissAlert }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
