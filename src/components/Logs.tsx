import React from 'react';
import { useStore } from '@/store/useStore';

export const Logs: React.FC = () => {
  const { logs } = useStore();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Audit Logs</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Qty</th>
                    <th className="px-6 py-4">User</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Pending sync...'}
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                            ${log.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 
                              log.type === 'out' ? 'bg-rose-100 text-rose-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {log.type}
                          </span>
                       </td>
                       <td className="px-6 py-4 font-bold text-slate-700">{log.itemName}</td>
                       <td className="px-6 py-4 font-mono">{log.quantity}</td>
                       <td className="px-6 py-4 text-slate-500 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
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