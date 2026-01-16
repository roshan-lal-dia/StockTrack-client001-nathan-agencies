import { useState } from 'react';
import { Database, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { runSoftDeleteMigration } from '@/lib/migration';

export const MigrationButton = () => {
  const { role, isFirebaseConfigured } = useStore();
  const { addToast } = useToastStore();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    counts: { inventory: number; logs: number; users: number; events: number };
  } | null>(null);

  const handleRunMigration = async () => {
    if (!isFirebaseConfigured) {
      addToast('Firebase must be configured to run migration', 'error');
      return;
    }

    if (role !== 'admin') {
      addToast('Only admins can run migration', 'error');
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const migrationResult = await runSoftDeleteMigration();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        const total = migrationResult.counts.inventory + 
                     migrationResult.counts.logs + 
                     migrationResult.counts.users + 
                     migrationResult.counts.events;
        
        if (total > 0) {
          addToast(`Migration completed: ${total} documents updated`, 'success');
        } else {
          addToast('Migration already completed or no documents to migrate', 'info');
        }
      } else {
        addToast(`Migration failed: ${migrationResult.message}`, 'error');
      }
    } catch (error) {
      console.error('Migration error:', error);
      addToast('Migration failed with an error', 'error');
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        counts: { inventory: 0, logs: 0, users: 0, events: 0 }
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
          <Database className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
            Soft Delete Migration
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
            Run this one-time migration to add soft delete support to existing data. 
            This will add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">isDeleted: false</code> to all documents.
          </p>
          
          <button
            onClick={handleRunMigration}
            disabled={isRunning || !isFirebaseConfigured}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Run Migration
              </>
            )}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${
                    result.success 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && (
                    <div className="mt-2 text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p>• Inventory: {result.counts.inventory} documents</p>
                      <p>• Logs: {result.counts.logs} documents</p>
                      <p>• Users: {result.counts.users} documents</p>
                      <p>• Events: {result.counts.events} documents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              💡 <strong>After migration is complete:</strong> Comment out or remove the <code>&lt;MigrationButton /&gt;</code> component 
              from the Backup page to prevent accidental re-runs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
