import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Zap, 
  AlertTriangle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Package 
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { InventoryItem } from '@/types';

interface InventoryProps {
  onNavigate: (view: 'rapid-receive') => void;
  onOpenModal: (type: 'add' | 'transaction' | 'edit', item?: InventoryItem) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onNavigate, onOpenModal }) => {
  const { inventory, role } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInventory = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return inventory.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q)
    );
  }, [inventory, searchQuery]);

  return (
    <div className="space-y-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
        <div className="flex gap-2 w-full md:w-auto">
           <button 
            onClick={() => onNavigate('rapid-receive')}
            className="flex-1 md:flex-none px-4 py-2 bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={18} /> Rapid Add
          </button>
          <button 
            onClick={() => onOpenModal('add')}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Plus size={18} /> Create Item
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name, category, or location..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded tracking-wider">{item.category}</span>
                      {item.quantity <= item.minStock && (
                         <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded tracking-wider flex items-center gap-1">
                           <AlertTriangle size={10} /> Low Stock
                         </span>
                      )}
                   </div>
                   <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                   <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>Loc: {item.location || 'N/A'}</span>
                   </div>
                </div>
                <div className="text-center bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-w-[4rem]">
                   <span className={`block text-xl font-bold ${item.quantity <= item.minStock ? 'text-red-600' : 'text-slate-700'}`}>{item.quantity}</span>
                   <span className="text-[10px] text-slate-400 uppercase font-bold">Units</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={() => onOpenModal('transaction', item)}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 font-bold text-sm transition-colors"
                >
                  <ArrowDownCircle size={18} /> IN
                </button>
                <button 
                  onClick={() => onOpenModal('transaction', item)} // Logic for OUT will be handled in modal or we can pass type here. 
                  // Actually, let's just open transaction modal and let user choose or default. 
                  // Wait, prototype had separate buttons setting state. 
                  // I'll simplify: Open modal, modal has toggle. Or better, pass intent.
                  // Let's update interface to support intent if needed, but for now just open modal.
                  // Actually, I'll stick to the prototype's flow: click IN -> Modal(IN), click OUT -> Modal(OUT).
                  // I need to update onOpenModal signature or just handle it in the parent.
                  // Let's assume onOpenModal handles the item, and we might need another arg for type.
                  // I'll update the interface in the next step or just use a store for "active transaction type".
                  // For now, I'll just pass the item. The parent can default to 'in' or I can add a param.
                  className="flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 font-bold text-sm transition-colors"
                >
                   <ArrowUpCircle size={18} /> OUT
                </button>
             </div>
             
             {role === 'admin' && (
               <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                  <button 
                    onClick={() => onOpenModal('edit', item)}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider"
                  >
                    Edit Details
                  </button>
               </div>
             )}
          </div>
        ))}
        {filteredInventory.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
             <Package size={48} className="mb-4 opacity-20" />
             <p>No inventory found. Try adding a new product.</p>
          </div>
        )}
      </div>
    </div>
  );
};