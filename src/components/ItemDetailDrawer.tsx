import { X, Package, MapPin, Tag, Clock, ArrowDownCircle, Edit, Trash2 } from 'lucide-react';
import { InventoryItem } from '@/types';
import { useStore } from '@/store/useStore';

interface ItemDetailDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onTransaction: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

export const ItemDetailDrawer = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onTransaction,
  onDelete,
}: ItemDetailDrawerProps) => {
  const { logs, role } = useStore();

  if (!isOpen || !item) return null;

  const isLowStock = item.quantity <= item.minStock;
  const isOutOfStock = item.quantity === 0;
  
  // Get recent logs for this item
  const itemLogs = logs
    .filter(log => log.itemName === item.name)
    .slice(0, 10);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[55] backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-800 z-[56] shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              isOutOfStock 
                ? 'bg-rose-100 dark:bg-rose-900/30' 
                : isLowStock 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : 'bg-indigo-100 dark:bg-indigo-900/30'
            }`}>
              <Package size={24} className={
                isOutOfStock 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : isLowStock 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-indigo-600 dark:text-indigo-400'
              } />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{item.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {isOutOfStock && (
                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-full text-xs font-bold">
                    Out of Stock
                  </span>
                )}
                {isLowStock && !isOutOfStock && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                    Low Stock
                  </span>
                )}
                <span className="text-sm text-slate-500 dark:text-slate-400">{item.category}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Stock</p>
              <p className={`text-2xl font-bold ${
                isOutOfStock 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : isLowStock 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-slate-800 dark:text-white'
              }`}>
                {item.quantity}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Min Stock Alert</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{item.minStock}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <MapPin size={18} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                <p className="font-medium text-slate-800 dark:text-white">{item.location || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <Tag size={18} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Category</p>
                <p className="font-medium text-slate-800 dark:text-white">{item.category || 'Uncategorized'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <Clock size={18} className="text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Last Updated</p>
                <p className="font-medium text-slate-800 dark:text-white">
                  {item.lastUpdated 
                    ? new Date(item.lastUpdated.seconds * 1000).toLocaleString() 
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Notes</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm">{item.notes}</p>
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Recent Activity</h3>
            {itemLogs.length > 0 ? (
              <div className="space-y-2">
                {itemLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.type === 'in' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' 
                        : log.type === 'out'
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                          : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    }`}>
                      {log.type === 'in' ? '+' : log.type === 'out' ? '-' : '✦'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">
                        {log.type === 'in' ? 'Received' : log.type === 'out' ? 'Dispatched' : 'Created'} {log.quantity} units
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {log.user} • {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-2">
            <button
              onClick={() => onTransaction(item)}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownCircle size={18} />
              Add/Remove Stock
            </button>
            {role === 'admin' && (
              <>
                <button
                  onClick={() => onEdit(item)}
                  className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors"
                  title="Edit"
                >
                  <Edit size={18} className="text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="p-3 bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 rounded-xl transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} className="text-rose-600 dark:text-rose-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
