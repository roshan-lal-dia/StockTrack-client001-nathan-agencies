import { useState, useRef } from 'react';
import { Download, Upload, Check, X, Copy, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeCategory } from '@/lib/categoryUtils';

type FieldType = 'category' | 'location';

interface FieldCorrection {
  original: string;      // Exact value from DB (with spaces, casing as-is)
  suggested: string;     // Normalized/standardized value
  selected: boolean;
  itemCount: number;
}

export const CategoryStandardization = () => {
  const { inventory, isFirebaseConfigured, userProfile, updateInventoryItem, addLog } = useStore();
  const { addToast } = useToastStore();
  const [fieldType, setFieldType] = useState<FieldType>('category');
  const [corrections, setCorrections] = useState<FieldCorrection[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

  // Get unique values for the selected field
  const getUniqueValues = (field: FieldType): string[] => {
    const values = new Set(
      inventory
        .map(item => field === 'category' ? item.category : item.location)
        .filter(val => val && val.trim())
    );
    return Array.from(values).sort();
  };

  const getAIPrompt = (field: FieldType) => `You are a data standardization expert. Analyze these ${field} names for spelling, casing, and spacing issues ONLY. Do not change meanings or merge different ${field}s.

Rules:
1. Fix spelling mistakes (e.g., "ELECTRONCS" → "ELECTRONICS")
2. Standardize inconsistent spacing (e.g., "SPARE  PARTS" → "SPARE PARTS")
3. Remove trailing/leading spaces
4. Everything should be in UPPERCASE
5. Do NOT merge ${field}s with different meanings
6. If a ${field} is already correct, do NOT include it in output

IMPORTANT: Keep the "original" column EXACTLY as provided (including any trailing spaces or wrong casing) - this is needed to match database records.

Return ONLY a CSV with two columns: original,suggested
Include ONLY ${field}s that need correction. Do not include a header row.

Example output:
electronics,ELECTRONICS
ELECTRNICS,ELECTRONICS
spare  parts,SPARE PARTS
Chair ,CHAIR`;

  const downloadFieldCSV = () => {
    const values = getUniqueValues(fieldType);
    const valuesWithCounts = values.map(val => ({
      value: val,
      itemCount: inventory.filter(item => 
        (fieldType === 'category' ? item.category : item.location) === val
      ).length
    }));

    // Create CSV content - preserve exact values including trailing spaces
    const csvContent = `${fieldType},item_count\n` + 
      valuesWithCounts.map(v => `"${v.value}",${v.itemCount}`).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fieldType}s_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    addToast(`${fieldType === 'category' ? 'Categories' : 'Locations'} CSV downloaded`, 'success');
    setShowPrompt(true);
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(getAIPrompt(fieldType));
    addToast('Prompt copied to clipboard', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      addToast('Please upload a CSV file', 'error');
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        try {
          const rows = results.data as string[][];
          
          // Parse corrections (expecting: original,suggested per line)
          const parsedCorrections: FieldCorrection[] = [];
          
          for (const row of rows) {
            if (row.length >= 2) {
              // Keep original EXACTLY as-is (including trailing spaces, casing)
              // This is critical for matching DB records
              const original = row[0] ?? '';
              const suggestedRaw = row[1] ?? '';
              
              // Skip empty rows
              if (!original || !suggestedRaw.trim()) continue;
              
              // Skip header row
              if (original.toLowerCase() === 'original' && suggestedRaw.toLowerCase().trim() === 'suggested') continue;
              
              // Normalize the suggested value (trim + uppercase)
              const suggested = normalizeCategory(suggestedRaw);
              
              // Skip if already the same after normalization comparison
              if (original === suggested) continue;

              // Count items matching original EXACTLY (including spaces, casing)
              const itemCount = inventory.filter(item => {
                const itemValue = fieldType === 'category' ? item.category : item.location;
                return itemValue === original;
              }).length;

              if (itemCount > 0) {
                parsedCorrections.push({
                  original,
                  suggested,
                  selected: true,
                  itemCount
                });
              }
            }
          }

          if (parsedCorrections.length === 0) {
            addToast('No valid corrections found in CSV. Make sure the "original" column matches your database values exactly.', 'error');
            return;
          }

          setCorrections(parsedCorrections);
          setShowResults(true);
          addToast(`Found ${parsedCorrections.length} corrections to apply`, 'success');
        } catch (error) {
          console.error('CSV parse error:', error);
          addToast('Failed to parse CSV file', 'error');
        }
      },
      error: (error) => {
        addToast(`CSV error: ${error.message}`, 'error');
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyCorrections = async () => {
    const selectedCorrections = corrections.filter(c => c.selected);
    if (selectedCorrections.length === 0) {
      addToast('No corrections selected', 'error');
      return;
    }

    setIsApplying(true);
    let updatedCount = 0;

    try {
      for (const correction of selectedCorrections) {
        // Match items by EXACT original value (including spaces, casing)
        const itemsToUpdate = inventory.filter(item => {
          const itemValue = fieldType === 'category' ? item.category : item.location;
          return itemValue === correction.original;
        });

        for (const item of itemsToUpdate) {
          const updateData = fieldType === 'category' 
            ? { category: correction.suggested }
            : { location: correction.suggested };

          if (isFirebaseConfigured) {
            // Firebase mode
            const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', item.id);
            await updateDoc(ref, {
              ...updateData,
              lastUpdated: serverTimestamp()
            });

            // Update local store immediately so UI reflects change
            updateInventoryItem(item.id, updateData);

            // Log the change
            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
              type: 'audit',
              itemName: item.name,
              quantity: 0,
              user: userProfile?.name || 'System',
              timestamp: serverTimestamp(),
              isDeleted: false
            });
          } else {
            // Offline mode
            updateInventoryItem(item.id, {
              ...updateData,
              lastUpdated: new Date().toISOString()
            });

            addLog({
              id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'audit',
              itemName: item.name,
              quantity: 0,
              user: userProfile?.name || 'System',
              timestamp: new Date().toISOString()
            });
          }

          updatedCount++;
        }
      }

      addToast(`Successfully standardized ${updatedCount} ${fieldType === 'category' ? 'categories' : 'locations'}`, 'success');
      setShowResults(false);
      setCorrections([]);
    } catch (error) {
      console.error('Error applying corrections:', error);
      addToast('Failed to apply some corrections', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleCorrection = (index: number) => {
    setCorrections(prev => prev.map((c, i) => 
      i === index ? { ...c, selected: !c.selected } : c
    ));
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Data Standardization</h3>
      
      {/* Field Type Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setFieldType('category'); setShowPrompt(false); setCorrections([]); setShowResults(false); }}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            fieldType === 'category'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => { setFieldType('location'); setShowPrompt(false); setCorrections([]); setShowResults(false); }}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            fieldType === 'location'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Locations
        </button>
      </div>
      
      {!showResults ? (
        <div className="space-y-4">
          {/* Step 1: Export */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Download size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Step 1: Export {fieldType === 'category' ? 'Categories' : 'Locations'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Download your {fieldType === 'category' ? 'categories' : 'locations'} as CSV</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Export all current {fieldType === 'category' ? 'categories' : 'locations'} with item counts. You'll use this with an AI tool of your choice.
            </p>
            <button
              onClick={downloadFieldCSV}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={18} /> Download {fieldType === 'category' ? 'Categories' : 'Locations'} CSV
            </button>
          </div>

          {/* Step 2: Use AI Tool */}
          {showPrompt && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white">Step 2: Use AI Tool</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ChatGPT, Claude, or any AI tool</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Copy this prompt and paste it into your AI tool (ChatGPT, Claude, etc.) along with the CSV data:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-3 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
{getAIPrompt(fieldType)}
                </pre>
              </div>
              <button
                onClick={copyPromptToClipboard}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Copy size={16} /> Copy Prompt to Clipboard
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Then paste the {fieldType === 'category' ? 'categories' : 'locations'} CSV content after the prompt and ask the AI to process it.
              </p>
            </div>
          )}

          {/* Step 3: Upload Corrections */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                <Upload size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Step 3: Upload Corrections</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Import corrected {fieldType === 'category' ? 'categories' : 'locations'} CSV</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              After AI processing, save the output as CSV (format: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">original,suggested</code>) and upload it here.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={18} /> Upload Corrections CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 dark:text-white">Review {fieldType === 'category' ? 'Category' : 'Location'} Corrections</h4>
            <button
              onClick={() => {
                setShowResults(false);
                setCorrections([]);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Review and select which corrections to apply. Uncheck any you don't want to change.
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {corrections.map((correction, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={correction.selected}
                  onChange={() => toggleCorrection(index)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-600 dark:text-red-400 line-through font-medium">
                      {correction.original}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">
                      {correction.suggested}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {correction.itemCount} item{correction.itemCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyCorrections}
              disabled={isApplying || corrections.filter(c => c.selected).length === 0}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {isApplying ? (
                'Applying...'
              ) : (
                <>
                  <Check size={18} /> Apply {corrections.filter(c => c.selected).length} Corrections
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowResults(false);
                setCorrections([]);
              }}
              disabled={isApplying}
              className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
