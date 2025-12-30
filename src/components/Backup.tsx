import { Download, FileJson, FileSpreadsheet, Database } from 'lucide-react';
import { generateFullBackup, exportInventoryCSV, exportLogsCSV } from '@/lib/export';
import { useToastStore } from '@/store/useToastStore';
import { CSVImport } from './CSVImport';
import { DatabaseAdmin } from './DatabaseAdmin';
import { ReportGenerator } from './ReportGenerator';

export const Backup = () => {
  const { addToast } = useToastStore();

  const handleFullBackup = async () => {
    try {
      await generateFullBackup();
      addToast('Full backup downloaded successfully', 'success');
    } catch {
      addToast('Failed to generate backup', 'error');
    }
  };

  const handleInventoryExport = async () => {
    try {
      await exportInventoryCSV();
      addToast('Inventory CSV exported', 'success');
    } catch {
      addToast('Failed to export inventory', 'error');
    }
  };

  const handleLogsExport = async () => {
    try {
      await exportLogsCSV();
      addToast('Logs CSV exported', 'success');
    } catch {
      addToast('Failed to export logs', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Data Import & Export</h2>
        <p className="text-slate-500 dark:text-slate-400">Import, export, and backup your inventory data</p>
      </div>
      
      {/* CSV Import Section */}
      <CSVImport />
      
      {/* Export Section */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Export & Backup</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Full Backup */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Full Backup</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">All data as JSON</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Export all inventory, logs, and user data in a single JSON file for complete backup.
          </p>
          <button
            onClick={handleFullBackup}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} /> Download Backup
          </button>
        </div>

        {/* Inventory CSV */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Inventory CSV</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Spreadsheet format</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Export current inventory as CSV. Compatible with Excel, Google Sheets, and databases.
          </p>
          <button
            onClick={handleInventoryExport}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet size={18} /> Export Inventory
          </button>
        </div>

        {/* Logs CSV */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <FileJson size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Audit Logs CSV</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Transaction history</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Export all transaction logs as CSV for auditing, reporting, or migration.
          </p>
          <button
            onClick={handleLogsExport}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <FileJson size={18} /> Export Logs
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

      {/* Database Management */}
      <DatabaseAdmin />
    </div>
  );
};