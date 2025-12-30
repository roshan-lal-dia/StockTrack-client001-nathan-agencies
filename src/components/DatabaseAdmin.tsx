import { useState, useMemo } from 'react';
import { 
  Database, 
  Trash2, 
  Calendar,
  Filter,
  Shield,
  Clock
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { PinVerification } from './PinVerification';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate, LogItem } from '@/types';

export const DatabaseAdmin = () => {
  const { logs, isFirebaseConfigured, setLogs } = useStore();
  const { addToast } = useToastStore();
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'cleanup' | 'deleteSelected' | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  
  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d' | 'older'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'create'>('all');

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    const now = new Date();

    // Date filter
    if (dateFilter !== 'all') {
      result = result.filter(log => {
        let logDate: Date;
        if (typeof log.timestamp === 'string') {
          logDate = new Date(log.timestamp);
        } else if (log.timestamp?.seconds) {
          logDate = new Date(log.timestamp.seconds * 1000);
        } else {
          return false;
        }

        const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case '7d': return daysDiff <= 7;
          case '30d': return daysDiff <= 30;
          case '90d': return daysDiff <= 90;
          case 'older': return daysDiff > 90;
          default: return true;
        }
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(log => log.type === typeFilter);
    }

    return result;
  }, [logs, dateFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const getAge = (log: LogItem) => {
      let logDate: Date;
      if (typeof log.timestamp === 'string') {
        logDate = new Date(log.timestamp);
      } else if (log.timestamp?.seconds) {
        logDate = new Date(log.timestamp.seconds * 1000);
      } else {
        return 0;
      }
      return Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    return {
      total: logs.length,
      last7Days: logs.filter(l => getAge(l) <= 7).length,
      last30Days: logs.filter(l => getAge(l) <= 30).length,
      older90Days: logs.filter(l => getAge(l) > 90).length,
    };
  }, [logs]);

  const toggleLogSelection = (id: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLogs(newSelected);
  };

  const selectAllFiltered = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(l => l.id)));
    }
  };

  const requestCleanup = () => {
    setPendingAction('cleanup');
    setShowPinModal(true);
  };

  const requestDeleteSelected = () => {
    if (selectedLogs.size === 0) {
      addToast('No logs selected', 'error');
      return;
    }
    setPendingAction('deleteSelected');
    setShowPinModal(true);
  };

  const handlePinVerified = async () => {
    if (pendingAction === 'cleanup') {
      await performCleanup();
    } else if (pendingAction === 'deleteSelected') {
      await performDeleteSelected();
    }
    setPendingAction(null);
  };

  const performCleanup = async () => {
    // Delete logs older than 90 days
    const logsToDelete = logs.filter(log => {
      let logDate: Date;
      if (typeof log.timestamp === 'string') {
        logDate = new Date(log.timestamp);
      } else if (log.timestamp?.seconds) {
        logDate = new Date(log.timestamp.seconds * 1000);
      } else {
        return false;
      }
      const daysDiff = Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 90;
    });

    if (logsToDelete.length === 0) {
      addToast('No old logs to clean up', 'info');
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(0);

    try {
      if (isFirebaseConfigured) {
        for (let i = 0; i < logsToDelete.length; i++) {
          const log = logsToDelete[i];
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'logs', log.id));
          setDeleteProgress(Math.round(((i + 1) / logsToDelete.length) * 100));
        }
      } else {
        // Local mode - update store
        const remainingLogs = logs.filter(l => !logsToDelete.find(d => d.id === l.id));
        setLogs(remainingLogs);
      }

      addToast(`Cleaned up ${logsToDelete.length} old logs`, 'success');
    } catch (err) {
      console.error('Cleanup error:', err);
      addToast('Cleanup failed', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
    }
  };

  const performDeleteSelected = async () => {
    const logsToDelete = logs.filter(l => selectedLogs.has(l.id));
    
    setIsDeleting(true);
    setDeleteProgress(0);

    try {
      if (isFirebaseConfigured) {
        for (let i = 0; i < logsToDelete.length; i++) {
          const log = logsToDelete[i];
          await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'logs', log.id));
          setDeleteProgress(Math.round(((i + 1) / logsToDelete.length) * 100));
        }
      } else {
        // Local mode - update store
        const remainingLogs = logs.filter(l => !selectedLogs.has(l.id));
        setLogs(remainingLogs);
      }

      addToast(`Deleted ${logsToDelete.length} logs`, 'success');
      setSelectedLogs(new Set());
    } catch (err) {
      console.error('Delete error:', err);
      addToast('Delete failed', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
            <Database className="text-rose-600 dark:text-rose-400" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Database Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Clean up old logs and manage database size
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Logs</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.last7Days}</p>
          <p className="text-xs text-slate-500">Last 7 Days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.last30Days}</p>
          <p className="text-xs text-slate-500">Last 30 Days</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.older90Days}</p>
          <p className="text-xs text-slate-500">Older than 90 Days</p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="older">Older than 90 Days</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            <option value="in">Receive (IN)</option>
            <option value="out">Dispatch (OUT)</option>
            <option value="create">Created</option>
          </select>
        </div>
        <div className="flex-1" />
        <span className="text-sm text-slate-500">
          {filteredLogs.length} logs shown
        </span>
      </div>

      {/* Logs List */}
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={selectedLogs.size === filteredLogs.length && filteredLogs.length > 0}
                  onChange={selectAllFiltered}
                  className="w-4 h-4 rounded"
                />
              </th>
              <th className="text-left p-3 text-slate-600 dark:text-slate-300">Type</th>
              <th className="text-left p-3 text-slate-600 dark:text-slate-300">Item</th>
              <th className="text-right p-3 text-slate-600 dark:text-slate-300">Qty</th>
              <th className="text-left p-3 text-slate-600 dark:text-slate-300">User</th>
              <th className="text-left p-3 text-slate-600 dark:text-slate-300">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredLogs.slice(0, 100).map(log => (
              <tr 
                key={log.id} 
                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                  selectedLogs.has(log.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedLogs.has(log.id)}
                    onChange={() => toggleLogSelection(log.id)}
                    className="w-4 h-4 rounded"
                  />
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.type === 'in' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    log.type === 'out' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-slate-800 dark:text-slate-200">{log.itemName}</td>
                <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">{log.quantity}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{log.user}</td>
                <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">
                  {formatDate(log.timestamp, 'datetime')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length > 100 && (
          <p className="p-3 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-900">
            Showing first 100 of {filteredLogs.length} logs
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {isDeleting && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-600 transition-all duration-300"
              style={{ width: `${deleteProgress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 text-center mt-2">
            Deleting... {deleteProgress}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-wrap gap-3">
        <button
          onClick={requestDeleteSelected}
          disabled={selectedLogs.size === 0 || isDeleting}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          Delete Selected ({selectedLogs.size})
        </button>
        <button
          onClick={requestCleanup}
          disabled={stats.older90Days === 0 || isDeleting}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock size={16} />
          Cleanup Old Logs ({stats.older90Days})
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} />
          PIN required for destructive actions
        </div>
      </div>

      {/* PIN Verification Modal */}
      <PinVerification
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setPendingAction(null); }}
        onVerified={handlePinVerified}
        title="Confirm Database Operation"
        description="This action will permanently delete data. Enter your admin PIN to confirm."
      />
    </div>
  );
};
