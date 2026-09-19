// POLARIS Offline Outbox & IndexedDB Synchronization Engine
// Ensures uninterrupted field operations when polar satellite connectivity (Iridium/Starlink) is severed.

const DB_NAME = 'polaris_offline_db';
const STORE_NAME = 'mutation_queue';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
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
}

/**
 * Queue a mutation when offline or when an API call fails due to network severance.
 */
export async function enqueueMutation({ url, method = 'POST', body = {}, title = 'Offline Action' }) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        url,
        method,
        body,
        title,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };
      const req = store.add(record);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('polaris:offline-queue-updated'));
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to enqueue offline mutation:', err);
    return null;
  }
}

/**
 * Get all pending mutations currently buffered in IndexedDB.
 */
export async function getQueuedMutations() {
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

/**
 * Remove a successfully dispatched mutation from the queue.
 */
export async function removeMutation(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('polaris:offline-queue-updated'));
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/**
 * Synchronize all pending mutations with the backend API in FIFO sequence.
 */
export async function syncOfflineQueue(api) {
  if (!navigator.onLine) return { synced: 0, failed: 0, pending: 0 };
  const queue = await getQueuedMutations();
  if (queue.length === 0) return { synced: 0, failed: 0, pending: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await api(item.url, {
        method: item.method,
        body: item.body
      });
      await removeMutation(item.id);
      synced++;
    } catch (err) {
      console.warn(`Failed to sync queued action #${item.id} (${item.title}):`, err);
      failed++;
      // Stop on auth error or server-down so we preserve order
      if (err.status === 401 || err.status === 503) break;
    }
  }

  window.dispatchEvent(new CustomEvent('polaris:offline-queue-updated'));
  return { synced, failed, remaining: queue.length - synced };
}
