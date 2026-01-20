import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { 
  analyzeInventory, 
  reconcileAllInventory, 
  generateReconciliationReport,
  ReconciliationResult 
} from '../lib/reconciliation';

export const InventoryReconciliation = () => {
  const { isFirebaseConfigured } = useStore();
  const { addToast } = useToastStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationProgress, setReconciliationProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<ReconciliationResult[] | null>(null);
  const [reconciliationDone, setReconciliationDone] = useState(false);

  if (!isFirebaseConfigured) {
    return null; // Only available in Firebase mode
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResults(null);
    setReconciliationDone(false);

    try {
      const results = await analyzeInventory();
      setAnalysisResults(results);
      
      const itemsNeedingFix = results.filter(r => r.needsFixing);
      if (itemsNeedingFix.length === 0) {
        addToast('✅ All quantities match logs - no issues found!', 'success');
      } else {
        addToast(`Found ${itemsNeedingFix.length} items with discrepancies`, 'warning');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      addToast('Analysis failed: ' + (err as Error).message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReconcile = async () => {
    if (!analysisResults) return;

    const itemsNeedingFix = analysisResults.filter(r => r.needsFixing);
    if (itemsNeedingFix.length === 0) {
      addToast('No items need reconciliation', 'info');
      return;
    }

    setIsReconciling(true);
    setReconciliationProgress(0);

    try {
      const result = await reconcileAllInventory((current, total) => {
        setReconciliationProgress(Math.round((current / total) * 100));
      });

      setReconciliationDone(true);
      addToast(`✅ Fixed ${result.fixed} items, ${result.unchanged} unchanged`, 'success');
      
      // Refresh analysis
      const newResults = await analyzeInventory();
      setAnalysisResults(newResults);
    } catch (err) {
      console.error('Reconciliation error:', err);
      addToast('Reconciliation failed: ' + (err as Error).message, 'error');
    } finally {
      setIsReconciling(false);
      setReconciliationProgress(0);
    }
  };

  const handleDownloadReport = () => {
    if (!analysisResults) return;

    const report = generateReconciliationReport(analysisResults);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('Report downloaded', 'success');
  };

  const itemsNeedingFix = analysisResults?.filter(r => r.needsFixing) || [];
  const totalDiscrepancy = analysisResults?.reduce((sum, r) => sum + Math.abs(r.discrepancy), 0) || 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <RefreshCw className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 dark:text-white">Quantity Reconciliation</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              One-time tool to fix quantities from transaction logs
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-semibold mb-1">How this works:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li><strong>Analyze</strong>: Compares stored quantities with calculated values from logs</li>
              <li><strong>Fix</strong>: Updates quantities to match logs (one-time correction)</li>
              <li><strong>Going Forward</strong>: Quantity field is source of truth, logs are for audit only</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-3 flex-wrap">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || isReconciling}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Inventory'}
        </button>

        {analysisResults && itemsNeedingFix.length > 0 && !reconciliationDone && (
          <button
            onClick={handleReconcile}
            disabled={isReconciling}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={16} />
            {isReconciling ? `Fixing... ${reconciliationProgress}%` : `Fix ${itemsNeedingFix.length} Items`}
          </button>
        )}

        {analysisResults && (
          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <FileText size={16} />
            Download Report
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isReconciling && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${reconciliationProgress}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 text-center mt-2">
            Reconciling... {reconciliationProgress}%
          </p>
        </div>
      )}

      {/* Results */}
      {analysisResults && (
        <div className="p-6">
          {reconciliationDone && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Reconciliation Complete!
                </p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                  All quantities have been corrected. Going forward, the quantity field is the source of truth.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {analysisResults.length}
              </p>
              <p className="text-xs text-slate-500">Total Items</p>
            </div>
            <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {itemsNeedingFix.length}
              </p>
              <p className="text-xs text-slate-500">Need Fixing</p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {totalDiscrepancy}
              </p>
              <p className="text-xs text-slate-500">Total Discrepancy</p>
            </div>
          </div>

          {itemsNeedingFix.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-white mb-3">
                Items with Discrepancies:
              </h4>
              <div className="max-h-64 overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-slate-600 dark:text-slate-300">Item</th>
                      <th className="text-right p-3 text-slate-600 dark:text-slate-300">Current</th>
                      <th className="text-right p-3 text-slate-600 dark:text-slate-300">Calculated</th>
                      <th className="text-right p-3 text-slate-600 dark:text-slate-300">Diff</th>
                      <th className="text-center p-3 text-slate-600 dark:text-slate-300">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {itemsNeedingFix.map(result => (
                      <tr key={result.itemId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-3 text-slate-800 dark:text-slate-200">{result.itemName}</td>
                        <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                          {result.currentQuantity}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {result.calculatedQuantity}
                        </td>
                        <td className={`p-3 text-right font-mono font-semibold ${
                          result.discrepancy > 0 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {result.discrepancy > 0 ? '+' : ''}{result.discrepancy}
                        </td>
                        <td className="p-3 text-center text-slate-500 dark:text-slate-400">
                          {result.logsProcessed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {itemsNeedingFix.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-emerald-600 dark:text-emerald-400 mb-3" size={48} />
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                All Good!
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                All quantities match transaction logs perfectly.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
