import { useState, useRef, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { collection, addDoc, updateDoc, doc, serverTimestamp, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/types';
import { normalizeCategory } from '@/lib/categoryUtils';
import { fuzzySearchInventory } from '../lib/searchUtils';

// Generate a unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const RapidReceive = () => {
  const { inventory, userProfile, isFirebaseConfigured, addInventoryItem, updateInventoryItem, addLog } = useStore();
  const { addToast } = useToastStore();
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [localName, setLocalName] = useState('');
  const [localQty, setLocalQty] = useState('');
  const [recentAdds, setRecentAdds] = useState<{name: string, qty: number, type: 'in' | 'out'}[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on current input with fuzzy search
  const suggestions = useMemo(() => {
    if (localName.length < 2) return [];
    return fuzzySearchInventory(
      inventory.filter(i => !i.isDeleted),
      localName
    ).slice(0, 5);
  }, [inventory, localName]);

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          setLocalName(suggestions[selectedIndex].name);
          setSelectedIndex(-1);
          // Focus the quantity field after selecting
          qtyInputRef.current?.focus();
        }
        break;
      case 'Tab':
        // Auto-complete first suggestion on Tab if there's a match
        if (suggestions.length > 0 && selectedIndex === -1) {
          e.preventDefault();
          setLocalName(suggestions[0].name);
          qtyInputRef.current?.focus();
        } else if (selectedIndex >= 0) {
          e.preventDefault();
          setLocalName(suggestions[selectedIndex].name);
          setSelectedIndex(-1);
          qtyInputRef.current?.focus();
        }
        break;
      case 'Escape':
        setSelectedIndex(-1);
        break;
    }
  };

  // Reset selection when input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalName(e.target.value);
    setSelectedIndex(-1);
  };

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName || !localQty) return;
    const qty = parseInt(localQty);
    if (isNaN(qty) || qty <= 0) return;

    const existing = inventory.find(i => i.name.toLowerCase() === localName.toLowerCase());
    
    // For OUT mode, item must exist
    if (mode === 'out' && !existing) {
      addToast(`Product "${localName}" not found`, 'error');
      return;
    }

    // For OUT mode, check if quantity is sufficient
    if (mode === 'out' && existing && existing.quantity < qty) {
      addToast(`Insufficient stock. Available: ${existing.quantity}`, 'error');
      return;
    }

    const now = new Date().toISOString();
    const isOnline = navigator.onLine;
    const syncNote = isOnline ? '' : ' (will sync when online)';
    const typeSymbol = mode === 'in' ? '+' : '-';
    
    // Always show toast and update UI immediately
    setRecentAdds(prev => [{name: localName, qty, type: mode}, ...prev].slice(0, 5));
    setLocalName('');
    setLocalQty('');
    addToast(`Processed: ${localName} (${typeSymbol}${qty})${syncNote}`, 'success');
    nameInputRef.current?.focus();

    try {
      if (isFirebaseConfigured) {
        // ✅ ATOMIC BATCH WRITES for data integrity
        const batch = writeBatch(db);
        
        if (existing) {
          // Update existing item
          const inventoryRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', existing.id);
          const quantityChange = mode === 'in' ? qty : -qty;
          batch.update(inventoryRef, { 
            quantity: increment(quantityChange),
            lastUpdated: serverTimestamp()
          });
          
          // Create transaction log
          const logRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'));
          batch.set(logRef, {
            type: mode, 
            itemName: existing.name, 
            quantity: qty, 
            user: userProfile?.name || 'Staff', 
            timestamp: serverTimestamp(), 
            isDeleted: false
          });
        } else {
          // Create new item (only for IN mode)
          const inventoryRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'));
          batch.set(inventoryRef, {
            name: localName, 
            category: normalizeCategory('UNCATEGORIZED'), 
            quantity: qty, 
            minStock: 5, 
            location: 'Receiving', 
            notes: '', 
            lastUpdated: serverTimestamp(), 
            isDeleted: false
          });
          
          // Create log entry
          const logRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'));
          batch.set(logRef, {
            type: 'create', 
            itemName: localName, 
            quantity: qty, 
            user: userProfile?.name || 'Staff', 
            timestamp: serverTimestamp(), 
            isDeleted: false
          });
        }
        
        // Commit atomically (queues offline, replays on reconnect)
        batch.commit().catch(err => console.warn('Sync pending:', err.message));
      } else {
        // Pure offline mode - use local storage
        if (existing) {
          const quantityChange = mode === 'in' ? qty : -qty;
          updateInventoryItem(existing.id, {
            quantity: existing.quantity + quantityChange,
            lastUpdated: now
          });
          addLog({
            id: generateId(),
            type: mode,
            itemName: existing.name,
            quantity: qty,
            user: userProfile?.name || 'Local User',
            timestamp: now
          });
        } else {
          // Only for IN mode
          const newItem: InventoryItem = {
            id: generateId(),
            name: localName,
            category: normalizeCategory('UNCATEGORIZED'),
            quantity: qty,
            minStock: 5,
            location: 'Receiving',
            notes: '',
            lastUpdated: now
          };
          addInventoryItem(newItem);
          addLog({
            id: generateId(),
            type: 'create',
            itemName: localName,
            quantity: qty,
            user: userProfile?.name || 'Local User',
            timestamp: now
          });
        }
      }
    } catch (err) {
      console.error(err);
      // Error handling for immediate failures only
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${mode === 'in' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
              {mode === 'in' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Rapid {mode === 'in' ? 'Receive' : 'Dispatch'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Optimized for high-speed stock entry.</p>
            </div>
          </div>
          {/* Mode Toggle */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-full">
            <button
              type="button"
              onClick={() => setMode('in')}
              className={`px-4 py-2 rounded-full font-bold transition-colors flex items-center gap-2 ${
                mode === 'in'
                  ? 'bg-green-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <ArrowDownCircle size={16} /> IN
            </button>
            <button
              type="button"
              onClick={() => setMode('out')}
              className={`px-4 py-2 rounded-full font-bold transition-colors flex items-center gap-2 ${
                mode === 'out'
                  ? 'bg-red-500 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <ArrowUpCircle size={16} /> OUT
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name / ID</label>
            <input 
              ref={nameInputRef}
              type="text" 
              value={localName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-lg text-slate-800 dark:text-white"
              placeholder="Scan or type... (↑↓ to navigate, Enter to select)"
              autoFocus
            />
            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-lg mt-1 z-10 w-full max-h-40 overflow-auto">
                {suggestions.map((m, index) => (
                  <div 
                    key={m.id} 
                    className={`p-3 cursor-pointer text-sm font-medium transition-colors ${
                      index === selectedIndex 
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => {
                      setLocalName(m.name);
                      setSelectedIndex(-1);
                      qtyInputRef.current?.focus();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {m.name} <span className="text-slate-400 text-xs">({m.quantity} in stock)</span>
                  </div>
                ))}
                <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  ↑↓ Navigate • Enter/Tab to select
                </div>
              </div>
            )}
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Quantity</label>
            <input 
              ref={qtyInputRef}
              type="number" 
              value={localQty}
              onChange={e => setLocalQty(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-lg text-center text-slate-800 dark:text-white"
              placeholder="Qty"
            />
          </div>
          <button 
            type="submit"
            className={`w-full md:w-auto p-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-white ${
              mode === 'in'
                ? 'bg-green-600 hover:bg-green-700 shadow-green-200 dark:shadow-green-900/30'
                : 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-red-900/30'
            }`}
          >
            {mode === 'in' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
            <span className="md:hidden">{mode === 'in' ? 'Receive' : 'Dispatch'}</span>
          </button>
        </form>
      </div>

      {recentAdds.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recently Processed</h3>
          <div className="space-y-2">
            {recentAdds.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-down">
                <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  item.type === 'in'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                }`}>
                  {item.type === 'in' ? '+' : '-'}{item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};