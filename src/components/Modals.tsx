import { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, ChevronDown } from 'lucide-react';
import { InventoryItem } from '@/types';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc, addDoc, collection, serverTimestamp, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ImageUpload, AttachmentUpload } from './ImageUpload';
import { UploadedImage } from '@/lib/imageUtils';
import { savePendingChange, generateChangeId } from '@/lib/conflictResolution';
import { normalizeCategory, filterCategories } from '@/lib/categoryUtils';

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
      addInventoryItem, updateInventoryItem, addLog, getUniqueCategories
   } = useStore();
   const { addToast } = useToastStore();
   const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

   // Transaction State
   const [transactionAmount, setTransactionAmount] = useState<string>('');
   const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
   const [attachmentUrl, setAttachmentUrl] = useState<string>('');
   const [attachmentName, setAttachmentName] = useState<string>('');

   // Category dropdown state
   const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
   const [categorySearch, setCategorySearch] = useState('');

   // Location dropdown state
   const [showLocationDropdown, setShowLocationDropdown] = useState(false);
   const [locationSearch, setLocationSearch] = useState('');

   // Get unique locations from inventory (sorted alphabetically)
   const getUniqueLocations = (): string[] => {
      const locations = new Set(
         inventory
            .map(item => item.location)
            .filter(loc => loc && loc.trim())
      );
      return Array.from(locations).sort((a, b) => a.localeCompare(b));
   };

   // Filter locations by search term
   const filterLocations = (locations: string[], searchTerm: string): string[] => {
      if (!searchTerm.trim()) return locations;
      const lowerSearch = searchTerm.toLowerCase();
      return locations.filter(loc => loc.toLowerCase().includes(lowerSearch));
   };

   // Form State
   const [formData, setFormData] = useState({
      name: '',
      category: '',
      quantity: 0,
      minStock: 5,
      location: '',
      notes: '',
      imageUrl: '',
      thumbnailUrl: '',
      shortName: ''
   });

   useEffect(() => {
      if (activeModal === 'edit' && selectedItem) {
         setFormData({
            name: selectedItem.name,
            category: selectedItem.category,
            quantity: selectedItem.quantity,
            minStock: selectedItem.minStock,
            location: selectedItem.location,
            notes: selectedItem.notes,
            imageUrl: selectedItem.imageUrl || '',
            thumbnailUrl: selectedItem.thumbnailUrl || '',
            shortName: selectedItem.shortName || ''
         });
      } else if (activeModal === 'add') {
         setFormData({ name: '', category: '', quantity: 0, minStock: 5, location: '', notes: '', imageUrl: '', thumbnailUrl: '', shortName: '' });
      }
      setTransactionAmount('');
      setTransactionType(initialTransactionType);
      setAttachmentUrl('');
      setAttachmentName('');
   }, [activeModal, selectedItem, initialTransactionType]);

   const handleImageUpload = (image: UploadedImage) => {
      setFormData(prev => ({
         ...prev,
         imageUrl: image.url,
         thumbnailUrl: image.thumbnailUrl
      }));
   };

   const handleImageRemove = () => {
      setFormData(prev => ({
         ...prev,
         imageUrl: '',
         thumbnailUrl: ''
      }));
   };

   const handleAttachmentUpload = (image: UploadedImage) => {
      setAttachmentUrl(image.url);
      setAttachmentName(image.originalName);
   };

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

      // Normalize category and location to CAPS
      const normalizedData = {
         ...formData,
         category: normalizeCategory(formData.category || 'UNCATEGORIZED'),
         location: normalizeCategory(formData.location || 'UNASSIGNED')
      };

      const now = new Date().toISOString();
      const isOnline = navigator.onLine;

      // Always close modal and show toast immediately for good UX
      addToast(
         activeModal === 'edit'
            ? 'Product updated' + (isOnline ? '' : ' (will sync when online)')
            : 'Product created' + (isOnline ? '' : ' (will sync when online)'),
         'success'
      );
      onClose();

      try {
         if (isFirebaseConfigured) {
            // Firebase mode - writes are queued offline and sync automatically
            if (activeModal === 'edit' && selectedItem) {
               // Edit: single update (no log needed)
               const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', selectedItem.id);
               updateDoc(ref, {
                  ...normalizedData,
                  lastUpdated: serverTimestamp()
               }).catch(err => console.warn('Sync pending:', err.message));
            } else {
               // ✅ ATOMIC BATCH WRITE: Create item + log together
               // Prevents partial creation if offline/crash
               const batch = writeBatch(db);
               
               // Create inventory item
               const inventoryRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'));
               batch.set(inventoryRef, {
                  ...normalizedData,
                  lastUpdated: serverTimestamp(),
                  isDeleted: false
               });
               
               // Create log entry
               const logRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'));
               batch.set(logRef, {
                  type: 'create',
                  itemName: normalizedData.name,
                  quantity: normalizedData.quantity,
                  user: userProfile?.name || 'Unknown',
                  isDeleted: false,
                  timestamp: serverTimestamp()
               });
               
               // Commit atomically
               batch.commit().catch(err => console.warn('Sync pending:', err.message));
            }
         } else {
            // Pure offline mode - use local storage
            if (activeModal === 'edit' && selectedItem) {
               updateInventoryItem(selectedItem.id, {
                  ...normalizedData,
                  lastUpdated: now
               });
            } else {
               const newItem: InventoryItem = {
                  id: generateId(),
                  ...normalizedData,
                  lastUpdated: now
               };
               addInventoryItem(newItem);

               addLog({
                  id: generateId(),
                  type: 'create',
                  itemName: normalizedData.name,
                  quantity: normalizedData.quantity,
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

   const handleTransaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedItem || !transactionAmount) return;
      const qty = parseInt(transactionAmount);

      if (transactionType === 'out' && selectedItem.quantity < qty) {
         addToast('Insufficient stock level', 'error');
         return;
      }

      const newQuantity = transactionType === 'in'
         ? selectedItem.quantity + qty
         : selectedItem.quantity - qty;
      const now = new Date().toISOString();
      const isOnline = navigator.onLine;
      const delta = transactionType === 'in' ? qty : -qty;

      // Track pending change for conflict resolution
      savePendingChange({
         id: generateChangeId(),
         itemId: selectedItem.id,
         type: 'quantity_delta',
         delta: delta,
         previousQuantity: selectedItem.quantity,
         timestamp: now,
         userId: userProfile?.uid || 'local',
         userName: userProfile?.name || 'Local User',
         synced: isOnline && isFirebaseConfigured
      });

      // Always close modal and show toast immediately for good UX
      const syncNote = isOnline ? '' : ' (will sync when online)';
      addToast(`${transactionType === 'in' ? 'Received' : 'Dispatched'} ${qty} units${syncNote}`, 'success');
      onClose();

      try {
         if (isFirebaseConfigured) {
            // ✅ ATOMIC BATCH WRITE: Both operations succeed or both fail
            // Works offline - queued and replayed atomically on reconnect
            const batch = writeBatch(db);
            
            // Update inventory quantity
            const inventoryRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'inventory', selectedItem.id);
            batch.update(inventoryRef, {
               quantity: transactionType === 'in' ? increment(qty) : increment(-qty),
               lastUpdated: serverTimestamp()
            });

            // Create transaction log
            const logRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'));
            batch.set(logRef, {
               type: transactionType,
               itemName: selectedItem.name,
               quantity: qty,
               user: userProfile?.name || 'Unknown',
               timestamp: serverTimestamp(),
               isDeleted: false,
               ...(attachmentUrl && { attachmentUrl, attachmentName })
            });
            
            // Commit atomically - don't await for better UX (queues offline)
            batch.commit().catch(err => console.warn('Sync pending:', err.message));
         } else {
            // Pure offline mode - use local storage
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
               timestamp: now,
               ...(attachmentUrl && { attachmentUrl, attachmentName })
            });
         }
      } catch (err) {
         console.error(err);
         // Error handling for immediate failures only
      }
   };

   if (activeModal === 'none') return null;

   return (
      <>
         {/* TRANSACTION MODAL */}
         {activeModal === 'transaction' && selectedItem && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
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

                     {/* Attachment for receipt/proof */}
                     <AttachmentUpload
                        currentUrl={attachmentUrl}
                        currentName={attachmentName}
                        onUpload={handleAttachmentUpload}
                        onRemove={() => { setAttachmentUrl(''); setAttachmentName(''); }}
                     />

                     <button
                        type="submit"
                        className={`w-full py-4 mt-4 rounded-xl font-bold text-white shadow-lg transform transition-transform active:scale-95
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
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{activeModal === 'edit' ? 'Edit Product' : 'New Product'}</h3>
                     <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X size={20} className="text-slate-600 dark:text-slate-300" /></button>
                  </div>

                  <form onSubmit={handleSaveItem} className="space-y-5">
                     {/* Product Image Upload */}
                     <ImageUpload
                        currentImageUrl={formData.imageUrl}
                        onUpload={handleImageUpload}
                        onRemove={handleImageRemove}
                        folder="stocktrack/products"
                        label="Product Image"
                     />

                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name</label>
                        <input
                           type="text"
                           required
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                           placeholder="e.g. Industrial Motor 500W"
                           value={formData.name}
                           onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Short Name / Code (Optional)</label>
                        <input
                           type="text"
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                           placeholder="e.g. M500 or #1234"
                           value={formData.shortName || ''}
                           onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Category</label>
                           <button
                              type="button"
                              onClick={() => {
                                 setShowCategoryDropdown(!showCategoryDropdown);
                                 setCategorySearch('');
                              }}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white text-left flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-500"
                           >
                              <span>{formData.category || 'Select category...'}</span>
                              <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                           </button>

                           {showCategoryDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50">
                                 {/* Search input */}
                                 <input
                                    type="text"
                                    placeholder="Search or create..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    className="w-full p-3 border-b border-slate-200 dark:border-slate-600 rounded-t-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white"
                                    autoFocus
                                 />

                                 {/* Existing categories */}
                                 <div className="max-h-40 overflow-y-auto">
                                    {getUniqueCategories().length > 0 && (
                                       filterCategories(getUniqueCategories(), categorySearch).map((cat) => (
                                          <button
                                             key={cat}
                                             type="button"
                                             onClick={() => {
                                                setFormData({ ...formData, category: cat });
                                                setShowCategoryDropdown(false);
                                                setCategorySearch('');
                                             }}
                                             className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-800 dark:text-white transition-colors"
                                          >
                                             {cat}
                                          </button>
                                       ))
                                    )}
                                 </div>

                                 {/* Create new category if search doesn't match */}
                                 {categorySearch.trim() && !getUniqueCategories().some(c => c.toUpperCase() === categorySearch.toUpperCase()) && (
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const newCategory = normalizeCategory(categorySearch);
                                          setFormData({ ...formData, category: newCategory });
                                          setShowCategoryDropdown(false);
                                          setCategorySearch('');
                                       }}
                                       className="w-full text-left p-3 border-t border-slate-200 dark:border-slate-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                    >
                                       + Create "{normalizeCategory(categorySearch)}"
                                    </button>
                                 )}
                              </div>
                           )}
                        </div>
                        <div className="relative">
                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location / Shelf</label>
                           <button
                              type="button"
                              onClick={() => {
                                 setShowLocationDropdown(!showLocationDropdown);
                                 setLocationSearch('');
                              }}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white text-left flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-500"
                           >
                              <span>{formData.location || 'Select location...'}</span>
                              <ChevronDown size={16} className={`transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                           </button>

                           {showLocationDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50">
                                 {/* Search input */}
                                 <input
                                    type="text"
                                    placeholder="Search or create..."
                                    value={locationSearch}
                                    onChange={(e) => setLocationSearch(e.target.value)}
                                    className="w-full p-3 border-b border-slate-200 dark:border-slate-600 rounded-t-xl bg-slate-50 dark:bg-slate-900 outline-none text-slate-800 dark:text-white"
                                    autoFocus
                                 />

                                 {/* Existing locations */}
                                 <div className="max-h-40 overflow-y-auto">
                                    {getUniqueLocations().length > 0 && (
                                       filterLocations(getUniqueLocations(), locationSearch).map((loc) => (
                                          <button
                                             key={loc}
                                             type="button"
                                             onClick={() => {
                                                setFormData({ ...formData, location: loc });
                                                setShowLocationDropdown(false);
                                                setLocationSearch('');
                                             }}
                                             className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-800 dark:text-white transition-colors"
                                          >
                                             {loc}
                                          </button>
                                       ))
                                    )}
                                 </div>

                                 {/* Create new location if search doesn't match */}
                                 {locationSearch.trim() && !getUniqueLocations().some(l => l.toUpperCase() === locationSearch.toUpperCase()) && (
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const newLocation = normalizeCategory(locationSearch);
                                          setFormData({ ...formData, location: newLocation });
                                          setShowLocationDropdown(false);
                                          setLocationSearch('');
                                       }}
                                       className="w-full text-left p-3 border-t border-slate-200 dark:border-slate-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                    >
                                       + Create "{normalizeCategory(locationSearch)}"
                                    </button>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Initial Qty</label>
                           <input
                              type="number"
                              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white disabled:opacity-50"
                              value={formData.quantity === 0 ? '' : formData.quantity}
                              onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                              onBlur={e => { if (e.target.value === '') setFormData(f => ({ ...f, quantity: 0 })); }}
                              disabled={activeModal === 'edit'}
                              min="0"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Min Stock Alert</label>
                           <input
                              type="number"
                              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-white"
                              value={formData.minStock === 0 ? '' : formData.minStock}
                              onChange={e => setFormData({ ...formData, minStock: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                              onBlur={e => { if (e.target.value === '') setFormData(f => ({ ...f, minStock: 0 })); }}
                              min="0"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Notes</label>
                        <textarea
                           className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 outline-none font-medium h-24 resize-none text-slate-800 dark:text-white"
                           placeholder="Additional details..."
                           value={formData.notes}
                           onChange={e => setFormData({ ...formData, notes: e.target.value })}
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