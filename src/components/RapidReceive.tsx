import { useState, useRef } from 'react';
import { Zap, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { collection, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/types';

// Generate a unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const RapidReceive = () => {
  const { inventory, userProfile, isFirebaseConfigured, addInventoryItem, updateInventoryItem, addLog } = useStore();
  const { addToast } = useToastStore();
  const [localName, setLocalName] = useState('');
  const [localQty, setLocalQty] = useState('');
  const [recentAdds, setRecentAdds] = useState<{name: string, qty: number}[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName || !localQty) return;
    const qty = parseInt(localQty);
    if (isNaN(qty) || qty <= 0) return;

    const existing = inventory.find(i => i.name.toLowerCase() === localName.toLowerCase());
    
    try {
      if (isFirebaseConfigured) {
        // Online mode - use Firebase
        if (existing) {
          const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', existing.id);
          await updateDoc(ref, { 
            quantity: increment(qty),
            lastUpdated: serverTimestamp()
          });
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
            type: 'in', itemName: existing.name, quantity: qty, user: userProfile?.name || 'Staff', timestamp: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'), {
            name: localName, category: 'Uncategorized', quantity: qty, minStock: 5, location: 'Receiving', notes: '', lastUpdated: serverTimestamp()
          });
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
            type: 'create', itemName: localName, quantity: qty, user: userProfile?.name || 'Staff', timestamp: serverTimestamp()
          });
        }
      } else {
        // Offline mode - use local storage
        const now = new Date().toISOString();
        if (existing) {
          updateInventoryItem(existing.id, {
            quantity: existing.quantity + qty,
            lastUpdated: now
          });
          addLog({
            id: generateId(),
            type: 'in',
            itemName: existing.name,
            quantity: qty,
            user: userProfile?.name || 'Local User',
            timestamp: now
          });
        } else {
          const newItem: InventoryItem = {
            id: generateId(),
            name: localName,
            category: 'Uncategorized',
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
      
      setRecentAdds(prev => [{name: localName, qty}, ...prev].slice(0, 5));
      setLocalName('');
      setLocalQty('');
      addToast(`Processed: ${localName} (+${qty})`, 'success');
      nameInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      addToast('Failed to process item', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Rapid Receive Mode</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Optimized for high-speed stock entry.</p>
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name / ID</label>
            <input 
              ref={nameInputRef}
              type="text" 
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-lg text-slate-800 dark:text-white"
              placeholder="Scan or type..."
              autoFocus
            />
            {/* Autocomplete Suggestions */}
            {localName.length > 1 && (
              <div className="absolute bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-lg mt-1 z-10 w-full max-h-40 overflow-auto">
                {inventory.filter(i => i.name.toLowerCase().includes(localName.toLowerCase())).slice(0,5).map(m => (
                  <div 
                    key={m.id} 
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium text-slate-800 dark:text-white"
                    onClick={() => setLocalName(m.name)}
                  >
                    {m.name} <span className="text-slate-400 text-xs">({m.quantity})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Quantity</label>
            <input 
              type="number" 
              value={localQty}
              onChange={e => setLocalQty(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none font-bold text-lg text-center text-slate-800 dark:text-white"
              placeholder="Qty"
            />
          </div>
          <button 
            type="submit"
            className="w-full md:w-auto p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={24} /> <span className="md:hidden">Add Stock</span>
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
                <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-bold">+{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};