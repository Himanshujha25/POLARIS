import { enqueueRequest } from './offlineQueue';

const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE = RAW_BASE.replace(/\/+$/, '');

export function getToken() {
  return localStorage.getItem('polaris_token');
}

export async function api(path, { method = 'GET', body, _skipOfflineQueue = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase());

  try {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    // If it's a network failure or fetch abort and not skipped, queue mutations for offline sync
    const isNetworkError = !navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError';
    if (isMutation && !_skipOfflineQueue && isNetworkError) {
      console.warn('[POLARIS] Network offline. Queuing operation to IndexedDB:', path, method);
      const queued = await enqueueRequest({ path, method, body, headers });
      return {
        _offline: true,
        _queuedId: queued.id,
        message: 'Saved to local offline queue. Will sync automatically when satellite connection returns.',
        ...(body || {})
      };
    }
    throw err;
  }
}

export const API_BASE = BASE;
