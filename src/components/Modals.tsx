import { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { InventoryItem } from '@/types';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc, addDoc, collection, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ModalsProps {
  activeModal: 'none' | 'add' | 'transaction' | 'edit';
  selectedItem: InventoryItem | null;
  initialTransactionType?: 'in' | 'out';
  onClose: () => void;
}

// Generate a unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const Modals = ({ activeModal, selectedItem, initialTransactionType = 'in', onClose }: ModalsProps) => {
  const { 
    userProfile, inventory, isFirebaseConfigured,
    addInventoryItem, updateInventoryItem, addLog 
  } = useStore();
  const { addToast } = useToastStore();
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  // Transaction State
  const [transactionAmount, setTransactionAmount] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    minStock: 5,
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (activeModal === 'edit' && selectedItem) {
      setFormData({
        name: selectedItem.name,
        category: selectedItem.category,
        quantity: selectedItem.quantity,
        minStock: selectedItem.minStock,
        location: selectedItem.location,
        notes: selectedItem.notes
      });
    } else if (activeModal === 'add') {
      setFormData({ name: '', category: '', quantity: 0, minStock: 5, location: '', notes: '' });
    }
    setTransactionAmount('');
    setTransactionType(initialTransactionType);
  }, [activeModal, selectedItem, initialTransactionType]);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const exists = inventory.find(i => 
      i.name.toLowerCase() === formData.name.toLowerCase() && 
      (activeModal !== 'edit' || i.id !== selectedItem?.id)
    );
    if (exists) {
      addToast('Product with this name already exists', 'error');
      return;
    }

    try {
      if (isFirebaseConfigured) {
        // Online mode - use Firebase
        if (activeModal === 'edit' && selectedItem) {
          const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', selectedItem.id);
          await updateDoc(ref, {
            ...formData,
            lastUpdated: serverTimestamp()
          });
        } else {
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'), {
            ...formData,
            lastUpdated: serverTimestamp()
          });
          
          await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
            type: 'create',
            itemName: formData.name,
            quantity: formData.quantity,
            user: userProfile?.name || 'Unknown',
            timestamp: serverTimestamp()
          });
        }
      } else {
        // Offline mode - use local storage
        const now = new Date().toISOString();
        if (activeModal === 'edit' && selectedItem) {
          updateInventoryItem(selectedItem.id, {
            ...formData,
            lastUpdated: now
          });
        } else {
          const newItem: InventoryItem = {
            id: generateId(),
            ...formData,
            lastUpdated: now
          };
          addInventoryItem(newItem);
          
          addLog({
            id: generateId(),
            type: 'create',
            itemName: formData.name,
            quantity: formData.quantity,
            user: userProfile?.name || 'Local User',
            timestamp: now
          });
        }
      }
      
      addToast(activeModal === 'edit' ? 'Product updated successfully' : 'Product created successfully', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Operation failed', 'error');
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !transactionAmount) return;
    const qty = parseInt(transactionAmount);
    
    if (transactionType === 'out' && selectedItem.quantity < qty) {
      addToast('Insufficient stock level', 'error');
      return;
    }

    try {
      const newQuantity = transactionType === 'in' 
        ? selectedItem.quantity + qty 
        : selectedItem.quantity - qty;

      if (isFirebaseConfigured) {
        // Online mode - use Firebase
        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', selectedItem.id);
        await updateDoc(ref, {
          quantity: transactionType === 'in' ? increment(qty) : increment(-qty),
          lastUpdated: serverTimestamp()
        });

        await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), {
          type: transactionType,
          itemName: selectedItem.name,
          quantity: qty,
          user: userProfile?.name || 'Unknown',
          timestamp: serverTimestamp()
        });
      } else {
        // Offline mode - use local storage
        const now = new Date().toISOString();
        updateInventoryItem(selectedItem.id, {
          quantity: newQuantity,
          lastUpdated: now
        });
        
        addLog({
          id: generateId(),
          type: transactionType,
          itemName: selectedItem.name,
          quantity: qty,
          user: userProfile?.name || 'Local User',
          timestamp: now
        });
      }

      addToast(`${transactionType === 'in' ? 'Received' : 'Dispatched'} ${qty} units`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      addToast('Transaction failed', 'error');
    }
  };

  if (activeModal === 'none') return null;

  return (
    <>
      {/* TRANSACTION MODAL */}
      {activeModal === 'transaction' && selectedItem && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative animate-scale-in">
               <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X /></button>
               
               <div className="text-center mb-8">
                  <div className="flex justify-center gap-4 mb-4">
                    <button 
                      onClick={() => setTransactionType('in')}
                      className={`p-2 rounded-full transition-all ${transactionType === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 scale-110' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}`}
                    >
                      <ArrowDownCircle size={40} />
                    </button>
                    <button 
                      onClick={() => setTransactionType('out')}
                      className={`p-2 rounded-full transition-all ${transactionType === 'out' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 scale-110' : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400'}`}
                    >
                      <ArrowUpCircle size={40} />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{transactionType === 'in' ? 'Receive Stock' : 'Dispatch Stock'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedItem.name}</p>
               </div>

               <form onSubmit={handleTransaction}>
                  <div className="mb-6">
                     <div className="relative">
                        <input 
                           type="number" 
                           autoFocus
                           className="w-full text-center text-4xl font-bold py-4 border-b-2 border-slate-200 dark:border-slate-600 focus:border-indigo-600 outline-none bg-transparent text-slate-800 dark:text-white"
                           placeholder="0"
                           value={transactionAmount}
                           onChange={e => setTransactionAmount(e.target.value)}
                        />
                        <span className="block text-center text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Quantity</span>
                     </div>
                  </div>

                  <button 
                     type="submit" 
                     className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transform transition-transform active:scale-95
                        ${transactionType === 'in' ? 'bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/30' : 'bg-rose-600 shadow-rose-200 dark:shadow-rose-900/30'}`}
                  >
                     Confirm {transactionType === 'in' ? 'Receipt' : 'Dispatch'}
                  </button>
                  <div className="mt-4 text-center text-xs text-slate-400">
                     Current Level: {selectedItem.quantity} units
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {(activeModal === 'add' || activeModal === 'edit') && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{activeModal === 'edit' ? 'Edit Product' : 'New Product'}</h3>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-600 dark:text-slate-300" /></button>
               </div>

               <form onSubmit={handleSaveItem} className="space-y-5">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name</label>
                     <input 
                        type="text" 
                        required
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                        placeholder="e.g. Industrial Motor 500W"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
                        <input 
                           type="text" 
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                           placeholder="e.g. Electrical"
                           value={formData.category}
                           onChange={e => setFormData({...formData, category: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location / Shelf</label>
                        <input 
                           type="text" 
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                           placeholder="e.g. A-12"
                           value={formData.location}
                           onChange={e => setFormData({...formData, location: e.target.value})}
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Initial Qty</label>
                        <input 
                           type="number" 
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white disabled:opacity-50"
                           value={formData.quantity}
                           onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                           disabled={activeModal === 'edit'}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Min Stock Alert</label>
                        <input 
                           type="number" 
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                           value={formData.minStock}
                           onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Notes</label>
                     <textarea 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium h-24 resize-none text-slate-800 dark:text-white"
                        placeholder="Additional details..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                     />
                  </div>

                  <div className="pt-4">
                     <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all">
                        {activeModal === 'edit' ? 'Save Changes' : 'Create Product'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </>
  );
};