// POLARIS Offline Outbox & Sync Queue Engine (IndexedDB)
// Enables polar field operations to queue mutations when disconnected from satellite link

const DB_NAME = 'polaris_offline_db';
const DB_VERSION = 2;
const STORE_NAME = 'outbox_queue';

let dbPromise = null;
const listeners = new Set();

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Auto-heal: If legacy database exists without outbox_queue store, upgrade dynamically
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const nextVersion = (db.version || 1) + 1;
        db.close();
        const upgradeReq = indexedDB.open(DB_NAME, nextVersion);
        upgradeReq.onupgradeneeded = (ue) => {
          const udb = ue.target.result;
          if (!udb.objectStoreNames.contains(STORE_NAME)) {
            udb.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = () => {
          try { indexedDB.deleteDatabase(DB_NAME); } catch {}
          resolve(null);
        };
        return;
      }
      resolve(db);
    };

    request.onerror = () => {
      if (request.error?.name === 'VersionError') {
        const fallbackReq = indexedDB.open(DB_NAME);
        fallbackReq.onsuccess = () => resolve(fallbackReq.result);
        fallbackReq.onerror = () => resolve(null);
        return;
      }
      console.warn('[OfflineQueue] IndexedDB open error:', request.error);
      resolve(null);
    };
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
  try {
    const db = await openDB();
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
      return null;
    }
    return await new Promise((resolve, reject) => {
      try {
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
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[OfflineQueue] enqueueRequest failed:', err);
    return null;
  }
}

export const enqueueMutation = enqueueRequest;

export async function getQueue() {
  try {
    const db = await openDB();
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
      return [];
    }
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('[OfflineQueue] Transaction error:', err);
        resolve([]);
      }
    });
  } catch (err) {
    console.warn('[OfflineQueue] getQueue error:', err);
    return [];
  }
}

export const getQueuedMutations = getQueue;

export async function removeQueueItem(id) {
  try {
    const db = await openDB();
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
      return false;
    }
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => {
          notifyListeners();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
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
