import React, { useState, useRef } from 'react';
import { Zap, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { collection, addDoc, updateDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const RapidReceive: React.FC = () => {
  const { inventory, userProfile } = useStore();
  const [localName, setLocalName] = useState('');
  const [localQty, setLocalQty] = useState('');
  const [recentAdds, setRecentAdds] = useState<{name: string, qty: number}[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // We need to know the appId for the path. 
  // In the prototype it was a global variable. 
  // Here we should probably store it in config or context.
  // For now, I'll hardcode 'default-app-id' or use an env var, 
  // but to match the prototype's logic, I'll assume a fixed path or pass it in.
  // Let's use a constant for now.
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const showToast = (msg: string, type: 'success'|'error') => {
    // Simple alert for now, or we can implement a toast store/context
    // Ideally we should have a global toast system.
    // I'll just log it for now as the prototype had a local toast.
    console.log(type, msg);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName || !localQty) return;
    const qty = parseInt(localQty);
    if (isNaN(qty)) return;

    // Check if exists
    const existing = inventory.find(i => i.name.toLowerCase() === localName.toLowerCase());
    
    try {
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
        // Create new with defaults
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'), {
          name: localName, category: 'Uncategorized', quantity: qty, minStock: 5, location: 'Receiving', notes: '', lastUpdated: serverTimestamp()
        });
        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
          type: 'create', itemName: localName, quantity: qty, user: userProfile?.name || 'Staff', timestamp: serverTimestamp()
        });
      }
      
      setRecentAdds(prev => [{name: localName, qty}, ...prev].slice(0, 5));
      setLocalName('');
      setLocalQty('');
      showToast(`Processed: ${localName}`, 'success');
      nameInputRef.current?.focus();
    } catch (err) {
      console.error(err);
      showToast('Failed to process', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Rapid Receive Mode</h2>
            <p className="text-slate-500 text-sm">Optimized for high-speed stock entry.</p>
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name / ID</label>
            <input 
              ref={nameInputRef}
              type="text" 
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg"
              placeholder="Scan or type..."
              autoFocus
            />
            {/* Simple Autocomplete Suggestion */}
            {localName.length > 1 && (
              <div className="absolute bg-white shadow-xl border border-slate-100 rounded-lg mt-1 z-10 w-full max-h-40 overflow-auto">
                {inventory.filter(i => i.name.toLowerCase().includes(localName.toLowerCase())).slice(0,5).map(m => (
                  <div 
                    key={m.id} 
                    className="p-2 hover:bg-slate-50 cursor-pointer text-sm font-medium"
                    onClick={() => setLocalName(m.name)}
                  >
                    {m.name} <span className="text-slate-400 text-xs">({m.quantity})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
            <input 
              type="number" 
              value={localQty}
              onChange={e => setLocalQty(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg text-center"
              placeholder="Qty"
            />
          </div>
          <button 
            type="submit"
            className="w-full md:w-auto p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={24} /> <span className="md:hidden">Add Stock</span>
          </button>
        </form>
      </div>

      {recentAdds.length > 0 && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recently Processed</h3>
          <div className="space-y-2">
            {recentAdds.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 shadow-sm animate-fade-in-down">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">+{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};