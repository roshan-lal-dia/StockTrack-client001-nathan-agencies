import { useState } from 'react';
import { AlertTriangle, X, ChevronRight, Package } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface LowStockAlertsProps {
  onItemClick: (itemId: string) => void;
}

export const LowStockAlerts = ({ onItemClick }: LowStockAlertsProps) => {
  const { inventory } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);
  const outOfStockItems = lowStockItems.filter(item => item.quantity === 0);
  const criticalItems = lowStockItems.slice(0, 5);

  if (lowStockItems.length === 0) return null;

  return (
    <>
      {/* Collapsed Badge */}
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="animate-pulse-soft" />
          <span className="font-medium text-sm">
            {lowStockItems.length} Low Stock Alert{lowStockItems.length > 1 ? 's' : ''}
          </span>
        </div>
        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Stock Alerts</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {outOfStockItems.length} out of stock, {lowStockItems.length - outOfStockItems.length} low stock
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Items List */}
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {criticalItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onItemClick(item.id);
                    setIsExpanded(false);
                  }}
                  className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className={`p-2 rounded-lg ${
                    item.quantity === 0 
                      ? 'bg-rose-100 dark:bg-rose-900/30' 
                      : 'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <Package size={16} className={
                      item.quantity === 0 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.category} • {item.location}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      item.quantity === 0 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {item.quantity}
                    </p>
                    <p className="text-xs text-slate-400">/ {item.minStock} min</p>
                  </div>
                </button>
              ))}
            </div>

            {lowStockItems.length > 5 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                  +{lowStockItems.length - 5} more items need attention
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Simple badge to show low stock count in navigation
 */
export const LowStockBadge = () => {
  const { inventory } = useStore();
  const count = inventory.filter(item => item.quantity <= item.minStock).length;
  
  if (count === 0) return null;
  
  return (
    <span className="ml-auto px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full animate-pulse-soft">
      {count > 99 ? '99+' : count}
    </span>
  );
};
