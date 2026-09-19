// POLARIS Offline Outbox & Sync Queue Engine (IndexedDB)
// Enables polar field operations to queue mutations when disconnected from satellite link

const DB_NAME = 'polaris_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'outbox_queue';

let dbPromise = null;
const listeners = new Set();

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export function subscribeQueue(fn) {
  listeners.add(fn);
  getQueue().then(fn).catch(() => {});
  return () => listeners.delete(fn);
}

function notifyListeners() {
  getQueue().then((q) => {
    listeners.forEach((fn) => {
      try { fn(q); } catch {}
    });
  }).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polaris:offline-queue-updated'));
  }
}

export async function enqueueRequest({ path, url, method = 'POST', body, headers, title }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item = {
      path: path || url,
      method: (method || 'POST').toUpperCase(),
      body,
      headers: headers || {},
      title: title || `${(method || 'POST').toUpperCase()} ${(path || url || '').replace('/api/v1/', '')}`,
      queuedAt: new Date().toISOString()
    };
    const req = store.add(item);
    req.onsuccess = () => {
      notifyListeners();
      resolve({ id: req.result, ...item });
    };
    req.onerror = () => reject(req.error);
  });
}

export const enqueueMutation = enqueueRequest;

export async function getQueue() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export const getQueuedMutations = getQueue;

export async function removeQueueItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      notifyListeners();
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

export const removeMutation = removeQueueItem;

export async function syncQueue(apiCaller) {
  const items = await getQueue();
  if (items.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await apiCaller(item.path, {
        method: item.method,
        body: item.body,
        _skipOfflineQueue: true
      });
      await removeQueueItem(item.id);
      synced++;
    } catch (err) {
      console.warn('[OfflineQueue] Replay failed for item:', item.id, err.message);
      failed++;
      if (!navigator.onLine) break;
    }
  }

  notifyListeners();
  return { synced, failed, remaining: items.length - synced };
}

export const syncOfflineQueue = syncQueue;
