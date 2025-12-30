import { Download, FileJson, FileSpreadsheet, Database } from 'lucide-react';
import { generateFullBackup, exportInventoryCSV, exportLogsCSV } from '@/lib/export';

export const Backup = () => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Data Backup & Export</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Full Backup */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Database size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Full Backup</h3>
              <p className="text-xs text-slate-500">All data as JSON</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Export all inventory, logs, and user data in a single JSON file for complete backup.
          </p>
          <button
            onClick={generateFullBackup}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={18} /> Download Backup
          </button>
        </div>

        {/* Inventory CSV */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Inventory CSV</h3>
              <p className="text-xs text-slate-500">Spreadsheet format</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Export current inventory as CSV. Compatible with Excel, Google Sheets, and databases.
          </p>
          <button
            onClick={exportInventoryCSV}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet size={18} /> Export Inventory
          </button>
        </div>

        {/* Logs CSV */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <FileJson size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Audit Logs CSV</h3>
              <p className="text-xs text-slate-500">Transaction history</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Export all transaction logs as CSV for auditing, reporting, or migration.
          </p>
          <button
            onClick={exportLogsCSV}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <FileJson size={18} /> Export Logs
          </button>
        </div>
      </div>

      <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-2">About Data Portability</h3>
        <p className="text-sm text-slate-600">
          Your data is never locked in. Export anytime in standard formats (JSON, CSV) 
          that can be imported into other systems, spreadsheets, or databases. 
          We recommend creating weekly backups for data safety.
        </p>
      </div>
    </div>
  );
};