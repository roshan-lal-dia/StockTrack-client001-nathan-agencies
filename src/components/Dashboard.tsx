import { 
  Package, 
  BarChart3, 
  AlertTriangle, 
  Truck 
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/types';

interface DashboardProps {
  onNavigate: (view: 'history' | 'team') => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { inventory, logs, userProfile, role } = useStore();

  const lowStockCount = inventory.filter(i => i.quantity <= i.minStock).length;
  const totalItems = inventory.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Warehouse Overview</h2>
          <p className="text-slate-500 dark:text-slate-400">Welcome back, {userProfile?.name}</p>
        </div>
        {role === 'admin' && (
           <button onClick={() => onNavigate('team')} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">Manage Team &rarr;</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Package size={24} /></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Unique Products</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{inventory.length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl"><BarChart3 size={24} /></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Items</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalItems}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Low Stock</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{lowStockCount}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><Truck size={24} /></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Movement (7d)</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{logs.length}</h3>
          </div>
        </div>
      </div>

      {role === 'admin' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
           <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Stock Value Distribution</h3>
           {/* Visual placeholder for a chart */}
           <div className="h-40 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-slate-400 text-sm">Analytics Charts would go here (Requires Chart.js)</p>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Recent Movements</h3>
          <button onClick={() => onNavigate('history')} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">View All</button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {logs.slice(0, 5).map(log => (
             <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${log.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' : 
                        log.type === 'out' ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400' : 
                        'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'}`}>
                      {log.type === 'in' ? 'IN' : log.type === 'out' ? 'OUT' : 'NEW'}
                   </div>
                   <div>
                      <p className="font-medium text-slate-800 dark:text-white">{log.itemName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{log.user} • {formatDate(log.timestamp, 'time')}</p>
                   </div>
                </div>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                  {log.type === 'out' ? '-' : '+'}{log.quantity}
                </span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};