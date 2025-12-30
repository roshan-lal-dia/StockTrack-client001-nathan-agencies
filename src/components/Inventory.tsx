import { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Zap, 
  AlertTriangle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Package,
  Filter,
  SortAsc,
  SortDesc,
  X,
  ChevronDown,
  ScanBarcode,
  Printer
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { InventoryItem } from '@/types';
import { BarcodeScanner } from './BarcodeScanner';
import { PrintLabels } from './PrintLabels';

interface InventoryProps {
  onNavigate: (view: 'rapid-receive') => void;
  onOpenModal: (type: 'add' | 'transaction' | 'edit', item?: InventoryItem, transactionType?: 'in' | 'out') => void;
}

type SortField = 'name' | 'quantity' | 'category' | 'location';
type SortOrder = 'asc' | 'desc';
type StockFilter = 'all' | 'low' | 'ok' | 'out';

export const Inventory = ({ onNavigate, onOpenModal }: InventoryProps) => {
  const { inventory, role } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showScanner, setShowScanner] = useState(false);
  const [showPrintLabels, setShowPrintLabels] = useState(false);

  // Get unique categories and locations
  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [inventory]);

  const locations = useMemo(() => {
    const locs = new Set(inventory.map(i => i.location).filter(Boolean));
    return ['all', ...Array.from(locs)];
  }, [inventory]);

  const handleBarcodeScan = (code: string, item?: InventoryItem) => {
    if (item) {
      // Found an item - open transaction modal
      onOpenModal('transaction', item, 'in');
    } else {
      // No match - search for the code
      setSearchQuery(code);
    }
    setShowScanner(false);
  };

  const filteredInventory = useMemo(() => {
    let result = [...inventory];

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
      );
    }

    // Stock filter
    if (stockFilter !== 'all') {
      result = result.filter(i => {
        if (stockFilter === 'out') return i.quantity === 0;
        if (stockFilter === 'low') return i.quantity > 0 && i.quantity <= i.minStock;
        if (stockFilter === 'ok') return i.quantity > i.minStock;
        return true;
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(i => i.category === categoryFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      result = result.filter(i => i.location === locationFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'quantity') cmp = a.quantity - b.quantity;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'location') cmp = a.location.localeCompare(b.location);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [inventory, searchQuery, stockFilter, categoryFilter, locationFilter, sortField, sortOrder]);

  const activeFiltersCount = [stockFilter !== 'all', categoryFilter !== 'all', locationFilter !== 'all'].filter(Boolean).length;

  const clearFilters = () => {
    setStockFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredInventory.length} of {inventory.length} items
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <button 
            onClick={() => setShowScanner(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            title="Scan Barcode"
          >
            <ScanBarcode size={18} />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button 
            onClick={() => setShowPrintLabels(true)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
            title="Print Labels"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Labels</span>
          </button>
          <button 
            onClick={() => onNavigate('rapid-receive')}
            className="flex-1 md:flex-none px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={18} /> Rapid Add
          </button>
          <button 
            onClick={() => onOpenModal('add')}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Plus size={18} /> Create Item
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name, category, or location..." 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
              showFilters || activeFiltersCount > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter size={18} />
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-800 dark:text-white">Filters</h3>
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  <X size={14} /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Stock Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Stock Level</label>
                <div className="relative">
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                    className="w-full p-2 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">All</option>
                    <option value="ok">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Category</label>
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Location</label>
                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full p-2 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc === 'all' ? 'All Locations' : loc}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sort By</label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="w-full p-2 pr-6 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                    >
                      <option value="name">Name</option>
                      <option value="quantity">Quantity</option>
                      <option value="category">Category</option>
                      <option value="location">Location</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600"
                  >
                    {sortOrder === 'asc' ? <SortAsc size={18} className="text-slate-600 dark:text-slate-300" /> : <SortDesc size={18} className="text-slate-600 dark:text-slate-300" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 flex-1 overflow-y-auto">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase rounded tracking-wider">{item.category || 'Uncategorized'}</span>
                      {item.quantity === 0 && (
                         <span className="px-2 py-0.5 bg-slate-800 dark:bg-slate-600 text-white text-[10px] font-bold uppercase rounded tracking-wider flex items-center gap-1">
                           Out of Stock
                         </span>
                      )}
                      {item.quantity > 0 && item.quantity <= item.minStock && (
                         <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase rounded tracking-wider flex items-center gap-1">
                           <AlertTriangle size={10} /> Low Stock
                         </span>
                      )}
                   </div>
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.name}</h3>
                   <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>📍 {item.location || 'N/A'}</span>
                   </div>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-700 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-600 min-w-[4rem]">
                   <span className={`block text-xl font-bold ${item.quantity === 0 ? 'text-slate-400' : item.quantity <= item.minStock ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{item.quantity}</span>
                   <span className="text-[10px] text-slate-400 uppercase font-bold">Units</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={() => onOpenModal('transaction', item, 'in')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 font-bold text-sm transition-colors"
                >
                  <ArrowDownCircle size={18} /> IN
                </button>
                <button 
                  onClick={() => onOpenModal('transaction', item, 'out')}
                  disabled={item.quantity === 0}
                  className="flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <ArrowUpCircle size={18} /> OUT
                </button>
             </div>
             
             {role === 'admin' && (
               <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700 flex justify-end">
                  <button 
                    onClick={() => onOpenModal('edit', item)}
                    className="text-xs font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider"
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
             <p>No items match your filters</p>
             {activeFiltersCount > 0 && (
               <button onClick={clearFilters} className="mt-2 text-indigo-600 hover:underline text-sm">
                 Clear filters
               </button>
             )}
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        mode="search"
      />

      {/* Print Labels Modal */}
      <PrintLabels
        isOpen={showPrintLabels}
        onClose={() => setShowPrintLabels(false)}
      />
    </div>
  );
};
