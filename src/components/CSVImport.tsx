import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Download, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/types';

interface CSVRow {
  name: string;
  category?: string;
  quantity?: string | number;
  minStock?: string | number;
  location?: string;
  notes?: string;
}

interface ParsedItem {
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  location: string;
  notes: string;
  status: 'valid' | 'duplicate' | 'invalid';
  error?: string;
}

const generateId = () => `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const CSVImport = () => {
  const { inventory, isFirebaseConfigured, userProfile, addInventoryItem, addLog } = useStore();
  const { addToast } = useToastStore();
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      addToast('Please upload a CSV file', 'error');
      return;
    }

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const items = results.data.map((row): ParsedItem => {
          const name = row.name?.trim() || '';
          const quantity = parseInt(String(row.quantity)) || 0;
          const minStock = parseInt(String(row.minStock)) || 5;
          
          // Check for duplicates
          const existingItem = inventory.find(
            i => i.name.toLowerCase() === name.toLowerCase()
          );

          if (!name) {
            return {
              name: '(empty)',
              category: row.category?.trim() || 'Uncategorized',
              quantity,
              minStock,
              location: row.location?.trim() || '',
              notes: row.notes?.trim() || '',
              status: 'invalid',
              error: 'Name is required'
            };
          }

          if (existingItem) {
            return {
              name,
              category: row.category?.trim() || 'Uncategorized',
              quantity,
              minStock,
              location: row.location?.trim() || '',
              notes: row.notes?.trim() || '',
              status: 'duplicate',
              error: 'Product already exists'
            };
          }

          return {
            name,
            category: row.category?.trim() || 'Uncategorized',
            quantity,
            minStock,
            location: row.location?.trim() || '',
            notes: row.notes?.trim() || '',
            status: 'valid'
          };
        });

        setParsedItems(items);
        setShowPreview(true);
      },
      error: (error) => {
        addToast(`Failed to parse CSV: ${error.message}`, 'error');
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validItems = parsedItems.filter(item => item.status === 'valid');
    
    if (validItems.length === 0) {
      addToast('No valid items to import', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    const now = new Date().toISOString();

    try {
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        
        if (isFirebaseConfigured) {
          // Firebase mode - fire and forget for speed
          addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'), {
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            minStock: item.minStock,
            location: item.location,
            notes: item.notes,
            lastUpdated: serverTimestamp()
          }).catch(err => console.warn('Sync pending:', err.message));

          addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
            type: 'create',
            itemName: item.name,
            quantity: item.quantity,
            user: userProfile?.name || 'Import',
            timestamp: serverTimestamp()
          }).catch(err => console.warn('Sync pending:', err.message));
        } else {
          // Offline mode
          const newItem: InventoryItem = {
            id: generateId(),
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            minStock: item.minStock,
            location: item.location,
            notes: item.notes,
            lastUpdated: now
          };
          addInventoryItem(newItem);
          
          addLog({
            id: generateId(),
            type: 'create',
            itemName: item.name,
            quantity: item.quantity,
            user: userProfile?.name || 'Import',
            timestamp: now
          });
        }

        setImportProgress(Math.round(((i + 1) / validItems.length) * 100));
        
        // Small delay to prevent overwhelming
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      addToast(`Successfully imported ${validItems.length} items`, 'success');
      setShowPreview(false);
      setParsedItems([]);
    } catch (err) {
      console.error('Import error:', err);
      addToast('Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'name,category,quantity,minStock,location,notes\nWidget A,Electronics,100,10,Shelf A-1,Sample product\nWidget B,Hardware,50,5,Shelf B-2,Another product';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stocktrack_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedItems.filter(i => i.status === 'valid').length;
  const duplicateCount = parsedItems.filter(i => i.status === 'duplicate').length;
  const invalidCount = parsedItems.filter(i => i.status === 'invalid').length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">CSV Import</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bulk import products from spreadsheet</p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      {!showPreview ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="mx-auto mb-4 text-slate-400" size={40} />
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            Drop your CSV file here or click to browse
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            Required column: name • Optional: category, quantity, minStock, location, notes
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
          >
            Select CSV File
          </button>
        </div>
      ) : (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
              <Check className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" size={20} />
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{validCount}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Valid</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
              <AlertCircle className="mx-auto text-amber-600 dark:text-amber-400 mb-1" size={20} />
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{duplicateCount}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">Duplicates</p>
            </div>
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-center">
              <X className="mx-auto text-rose-600 dark:text-rose-400 mb-1" size={20} />
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{invalidCount}</p>
              <p className="text-xs text-rose-700 dark:text-rose-300">Invalid</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left p-3 text-slate-600 dark:text-slate-300">Name</th>
                  <th className="text-left p-3 text-slate-600 dark:text-slate-300">Category</th>
                  <th className="text-right p-3 text-slate-600 dark:text-slate-300">Qty</th>
                  <th className="text-left p-3 text-slate-600 dark:text-slate-300">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {parsedItems.slice(0, 50).map((item, i) => (
                  <tr key={i} className={`
                    ${item.status === 'valid' ? 'bg-white dark:bg-slate-800' : ''}
                    ${item.status === 'duplicate' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                    ${item.status === 'invalid' ? 'bg-rose-50 dark:bg-rose-900/10' : ''}
                  `}>
                    <td className="p-3">
                      {item.status === 'valid' && <Check size={16} className="text-emerald-500" />}
                      {item.status === 'duplicate' && <AlertCircle size={16} className="text-amber-500" />}
                      {item.status === 'invalid' && <X size={16} className="text-rose-500" />}
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{item.category}</td>
                    <td className="p-3 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{item.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedItems.length > 50 && (
              <p className="p-3 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-900">
                Showing first 50 of {parsedItems.length} items
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {isImporting && (
            <div className="mb-6">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 text-center mt-2">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowPreview(false); setParsedItems([]); }}
              disabled={isImporting}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Import {validCount} Items
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
