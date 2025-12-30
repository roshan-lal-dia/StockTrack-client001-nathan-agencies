import { useStore } from '@/store/useStore';

export const Logs = () => {
  const { logs } = useStore();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Audit Logs</h2>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                 <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Qty</th>
                    <th className="px-6 py-4">User</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                 {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                       <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Pending sync...'}
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                            ${log.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400' : 
                              log.type === 'out' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400' : 
                              'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400'}`}>
                            {log.type}
                          </span>
                       </td>
                       <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{log.itemName}</td>
                       <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{log.quantity}</td>
                       <td className="px-6 py-4 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {log.user.charAt(0)}
                          </div>
                          {log.user}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};