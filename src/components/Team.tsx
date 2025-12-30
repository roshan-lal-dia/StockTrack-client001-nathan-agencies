import React from 'react';
import { useStore } from '@/store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Role } from '@/types';

export const Team: React.FC = () => {
  const { usersList, user, role } = useStore();
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const handleRoleChange = async (targetUid: string, newRole: Role) => {
    if (role !== 'admin') return;
    try {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', targetUid);
      await updateDoc(ref, { role: newRole });
      // Toast success
    } catch (err) {
      console.error(err);
      // Toast error
    }
  };

  const RoleBadge = ({ role }: { role: Role }) => {
    const styles = role === 'admin' 
      ? 'bg-purple-100 text-purple-700 border-purple-200' 
      : 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <h2 className="text-2xl font-bold text-slate-800 mb-6">Team Management</h2>
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
             <p className="text-sm text-slate-500">Manage access levels. Admins can configure the app, Staff can only manage inventory.</p>
          </div>
          <div className="divide-y divide-slate-100">
             {usersList.map(u => (
                <div key={u.uid} className="p-4 md:p-6 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                         {u.name.charAt(0)}
                      </div>
                      <div>
                         <p className="font-bold text-slate-800">{u.name}</p>
                         <p className="text-xs text-slate-500">Last Active: {u.lastActive ? new Date(u.lastActive.seconds * 1000).toLocaleDateString() : 'Never'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      {u.role === 'admin' ? (
                         <button 
                           onClick={() => handleRoleChange(u.uid, 'staff')}
                           disabled={u.uid === user?.uid} // Prevent removing own admin
                           className={`px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 ${u.uid === user?.uid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                         >
                            Demote to Staff
                         </button>
                      ) : (
                         <button 
                           onClick={() => handleRoleChange(u.uid, 'admin')}
                           className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 border border-indigo-100"
                         >
                            Promote to Admin
                         </button>
                      )}
                      <RoleBadge role={u.role} />
                   </div>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};