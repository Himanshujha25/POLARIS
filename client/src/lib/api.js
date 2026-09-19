import { enqueueMutation } from './offlineQueue';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('polaris_token');
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

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
  } catch (netErr) {
    // If it is a network drop (offline), buffer mutating requests to IndexedDB outbox
    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method.toUpperCase());
    if (isMutation && (!navigator.onLine || netErr.message?.includes('fetch') || netErr.name === 'TypeError')) {
      const title = `${method.toUpperCase()} ${path.split('?')[0].replace('/api/v1/', '')}`;
      await enqueueMutation({ url: path, method, body, title });
      console.info(`[POLARIS Offline Engine] Buffered mutation to IndexedDB outbox: ${title}`);
      // Return optimistic simulated response for offline UX
      return { _offlineQueued: true, message: 'Saved to Polar Offline Outbox. Will sync automatically on satellite link.' };
    }
    throw netErr;
  }
}

export const API_BASE = BASE;
