import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  X, 
  ArrowRight,
  GitMerge,
  Server,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { 
  ConflictInfo, 
  getConflicts, 
  removeConflict,
  clearAllConflicts,
  getPendingChangesForItem,
  resolveWithDelta,
  clearSyncedChanges,
  setLastSyncTime
} from '@/lib/conflictResolution';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const ConflictResolver = () => {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  
  const { isFirebaseConfigured, updateInventoryItem } = useStore();
  const { addToast } = useToastStore();
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  // Check for conflicts periodically
  useEffect(() => {
    const checkConflicts = () => {
      const currentConflicts = getConflicts();
      setConflicts(currentConflicts);
    };

    checkConflicts();
    const interval = setInterval(checkConflicts, 3000);
    return () => clearInterval(interval);
  }, []);

  if (conflicts.length === 0) return null;

  const resolveConflict = async (
    conflict: ConflictInfo, 
    resolution: 'keep_local' | 'keep_server' | 'merge'
  ) => {
    setResolving(conflict.itemId);

    try {
      let resolvedQuantity: number;
      let resolvedItem = { ...conflict.serverVersion };

      if (resolution === 'keep_local') {
        // Use local version entirely
        resolvedItem = { ...conflict.localVersion };
        resolvedQuantity = conflict.localVersion.quantity;
      } else if (resolution === 'keep_server') {
        // Use server version entirely
        resolvedQuantity = conflict.serverVersion.quantity;
      } else {
        // Merge: Apply local deltas to server quantity
        const pendingChanges = getPendingChangesForItem(conflict.itemId);
        resolvedQuantity = resolveWithDelta(conflict.serverVersion.quantity, pendingChanges);
        
        // Keep local metadata changes but use merged quantity
        resolvedItem = {
          ...conflict.localVersion,
          quantity: resolvedQuantity
        };
      }

      // Update Firebase
      if (isFirebaseConfigured) {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', conflict.itemId);
        await updateDoc(docRef, {
          ...resolvedItem,
          quantity: resolvedQuantity,
          lastUpdated: serverTimestamp(),
          _conflictResolved: true,
          _resolvedAt: new Date().toISOString()
        });
      }

      // Update local store
      updateInventoryItem(conflict.itemId, {
        ...resolvedItem,
        quantity: resolvedQuantity,
        lastUpdated: new Date().toISOString()
      });

      // Remove conflict and clear synced changes
      removeConflict(conflict.itemId);
      clearSyncedChanges();
      setLastSyncTime();
      
      setConflicts(prev => prev.filter(c => c.itemId !== conflict.itemId));
      addToast(`Conflict resolved for "${conflict.itemName}"`, 'success');
    } catch (err) {
      console.error('Conflict resolution error:', err);
      addToast('Failed to resolve conflict', 'error');
    } finally {
      setResolving(null);
    }
  };

  const resolveAllWithMerge = async () => {
    for (const conflict of conflicts) {
      await resolveConflict(conflict, 'merge');
    }
  };

  const dismissAll = () => {
    clearAllConflicts();
    setConflicts([]);
    addToast('All conflicts dismissed', 'info');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
              <AlertTriangle className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 dark:text-white">
                Sync Conflicts Detected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {conflicts.length} item{conflicts.length > 1 ? 's have' : ' has'} conflicting changes
              </p>
            </div>
            <button 
              onClick={dismissAll}
              className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
            >
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="max-h-64 overflow-auto">
          {conflicts.map(conflict => (
            <div 
              key={conflict.itemId}
              className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-0"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-white">
                    {conflict.itemName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {conflict.conflictType === 'quantity' ? 'Quantity conflict' :
                     conflict.conflictType === 'metadata' ? 'Info conflict' : 'Multiple conflicts'}
                  </p>
                </div>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <Smartphone size={14} className="mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <p className="text-slate-500 dark:text-slate-400">Local</p>
                  <p className="font-bold text-blue-700 dark:text-blue-300">
                    {conflict.localVersion.quantity}
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight size={16} className="text-slate-300" />
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                  <Server size={14} className="mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-slate-500 dark:text-slate-400">Server</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    {conflict.serverVersion.quantity}
                  </p>
                </div>
              </div>

              {/* Resolution Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => resolveConflict(conflict, 'keep_local')}
                  disabled={resolving === conflict.itemId}
                  className="flex-1 py-1.5 px-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Smartphone size={12} /> Local
                </button>
                <button
                  onClick={() => resolveConflict(conflict, 'merge')}
                  disabled={resolving === conflict.itemId}
                  className="flex-1 py-1.5 px-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <GitMerge size={12} /> Merge
                </button>
                <button
                  onClick={() => resolveConflict(conflict, 'keep_server')}
                  disabled={resolving === conflict.itemId}
                  className="flex-1 py-1.5 px-2 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Server size={12} /> Server
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {conflicts.length > 1 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={resolveAllWithMerge}
              disabled={resolving !== null}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <GitMerge size={16} />
              Merge All ({conflicts.length})
            </button>
          </div>
        )}
      </div>

      {/* Info tooltip */}
      <div className="mt-2 p-3 bg-slate-800 dark:bg-slate-700 rounded-lg text-xs text-slate-300">
        <p><strong>Local:</strong> Keep your changes</p>
        <p><strong>Merge:</strong> Add your changes to server (recommended)</p>
        <p><strong>Server:</strong> Discard your changes</p>
      </div>
    </div>
  );
};

// Small indicator for pending sync
export const SyncIndicator = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const { isOffline } = useStore();

  useEffect(() => {
    const check = () => {
      const pending = localStorage.getItem('stocktrack_pending_changes');
      const conflicts = localStorage.getItem('stocktrack_conflicts');
      
      setPendingCount(pending ? JSON.parse(pending).filter((c: any) => !c.synced).length : 0);
      setConflictCount(conflicts ? JSON.parse(conflicts).length : 0);
    };

    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0 && conflictCount === 0 && !isOffline) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {isOffline && pendingCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
          <RefreshCw size={12} className="animate-pulse" />
          {pendingCount} pending
        </span>
      )}
      {conflictCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full">
          <AlertTriangle size={12} />
          {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
