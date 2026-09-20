import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { api } from '../lib/api';
import { getQueuedMutations, syncOfflineQueue } from '../lib/offlineQueue';

export default function OfflineSyncBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const checkQueue = async () => {
    try {
      const queue = await getQueuedMutations();
      setPendingCount(Array.isArray(queue) ? queue.length : 0);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-drain offline queue when satellite connectivity is restored
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueUpdated = () => checkQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('polaris:offline-queue-updated', handleQueueUpdated);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('polaris:offline-queue-updated', handleQueueUpdated);
    };
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const result = await syncOfflineQueue(api);
      if (result.synced > 0) {
        setLastSyncResult(`Synced ${result.synced} offline item(s)`);
        setTimeout(() => setLastSyncResult(null), 4000);
      }
      await checkQueue();
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0 && !lastSyncResult) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center justify-between transition-all">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff size={14} className="text-amber-500 shrink-0" />
            <span>
              <b>Polar Satellite Link Severed (Offline Mode):</b> Changes are buffered safely in local IndexedDB outbox.
            </span>
          </>
        ) : lastSyncResult ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{lastSyncResult}</span>
          </>
        ) : (
          <>
            <CloudUpload size={14} className="text-cyan-500 shrink-0" />
            <span>
              Satellite link restored: <b>{pendingCount}</b> action(s) waiting in offline outbox.
            </span>
          </>
        )}
      </div>

      {pendingCount > 0 && isOnline && (
        <button
          type="button"
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shadow-xs transition-colors shrink-0"
        >
          <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing...' : `Sync Outbox (${pendingCount})`}</span>
        </button>
      )}
    </div>
  );
}
