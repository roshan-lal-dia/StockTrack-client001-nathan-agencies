import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Database, Truck, Loader2 } from 'lucide-react';
import { generateFullBackup, exportInventoryCSV, exportLogsCSV, exportEventsCSV } from '@/lib/export';
import { useToastStore } from '@/store/useToastStore';
import { useStore } from '@/store/useStore';
import { CSVImport } from './CSVImport';
import { DatabaseAdmin } from './DatabaseAdmin';
import { ReportGenerator } from './ReportGenerator';
import { InventoryReconciliation } from './InventoryReconciliation';
//import { MigrationButton } from './MigrationButton';
// One-time standardization tool - uncomment if needed again
// import { CategoryStandardization } from './CategoryStandardization';

export const Backup = () => {
  const { addToast } = useToastStore();
  const { setLastBackupDate } = useStore();

  const [exporting, setExporting] = useState<string | null>(null);

  const handleFullBackup = async () => {
    setExporting('full');
    try {
      await generateFullBackup();
      setLastBackupDate(new Date().toISOString());
      addToast('Full backup downloaded & date updated', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to generate backup', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleInventoryExport = async () => {
    setExporting('inventory');
    try {
      await exportInventoryCSV();
      addToast('Inventory CSV exported', 'success');
    } catch {
      addToast('Failed to export inventory', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleLogsExport = async () => {
    setExporting('logs');
    try {
      await exportLogsCSV();
      addToast('Logs CSV exported', 'success');
    } catch {
      addToast('Failed to export logs', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleEventsExport = async () => {
    setExporting('events');
    try {
      await exportEventsCSV();
      addToast('Events CSV exported', 'success');
    } catch {
      addToast('Failed to export events', 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Data Import & Export</h2>
        <p className="text-slate-500 dark:text-slate-400">Import, export, and backup your inventory data</p>
      </div>

      {/* Migration Button - Comment out after running once  <MigrationButton />*/}
      
      {/* Inventory Reconciliation - ONE-TIME FIX TOOL */}
      <InventoryReconciliation />

      {/* CSV Import Section */}
      <CSVImport />

      {/* Export Section */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Export & Backup</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Full Backup */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Database size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-800 dark:text-white truncate">Full Backup</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">All data as JSON</p>
              </div>
            </div>

            <button
              onClick={handleFullBackup}
              disabled={!!exporting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {exporting === 'full' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Backup
            </button>
          </div>

          {/* Inventory CSV */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <FileSpreadsheet size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-800 dark:text-white truncate">Inventory</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">CSV Spreadsheet</p>
              </div>
            </div>

            <button
              onClick={handleInventoryExport}
              disabled={!!exporting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {exporting === 'inventory' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
              Export
            </button>
          </div>

          {/* Logs CSV */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                <FileJson size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-800 dark:text-white truncate">Audit Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">History CSV</p>
              </div>
            </div>

            <button
              onClick={handleLogsExport}
              disabled={!!exporting}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {exporting === 'logs' ? <Loader2 size={18} className="animate-spin" /> : <FileJson size={18} />}
              Export
            </button>
          </div>

          {/* Events CSV */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Truck size={24} />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-slate-800 dark:text-white truncate">Events</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Shipments CSV</p>
              </div>
            </div>

            <button
              onClick={handleEventsExport}
              disabled={!!exporting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {exporting === 'events' ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-2">About Data Portability</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your data is never locked in. Export anytime in standard formats (JSON, CSV)
          that can be imported into other systems, spreadsheets, or databases.
          We recommend creating weekly backups for data safety.
        </p>
      </div>

      {/* PDF Reports */}
      <ReportGenerator />

      {/* Category/Location Standardization - One-time tool, uncomment if needed again */}
      {/* <CategoryStandardization /> */}

      {/* Database Management */}
      <DatabaseAdmin />
    </div>
  );
};