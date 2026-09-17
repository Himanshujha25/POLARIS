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

  // Live socket feed once logged in
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const push = (alert) => setLiveAlerts(prev => [alert, ...prev].slice(0, 20));
    socket.on('alert:new', push);
    socket.on('sos:broadcast', push);
    return () => {
      socket.off('alert:new', push);
      socket.off('sos:broadcast', push);
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

  const clearLiveAlerts = () => setLiveAlerts([]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, liveAlerts, clearLiveAlerts }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
