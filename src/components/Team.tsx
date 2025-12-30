import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Role } from '@/types';

export const Team = () => {
  const { usersList, user, role } = useStore();
  const { addToast } = useToastStore();
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const handleRoleChange = async (targetUid: string, newRole: Role) => {
    if (role !== 'admin') return;
    try {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', targetUid);
      await updateDoc(ref, { role: newRole });
      addToast(`User role updated to ${newRole}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update user role', 'error');
    }
  };

  const RoleBadge = ({ role }: { role: Role }) => {
    const styles = role === 'admin' 
      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Team Management</h2>
       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
             <p className="text-sm text-slate-500 dark:text-slate-400">Manage access levels. Admins can configure the app, Staff can only manage inventory.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
             {usersList.map(u => (
                <div key={u.uid} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-600 text-white flex items-center justify-center font-bold">
                         {u.name.charAt(0)}
                      </div>
                      <div>
                         <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400">Last Active: {u.lastActive ? new Date(u.lastActive.seconds * 1000).toLocaleDateString() : 'Never'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 ml-14 md:ml-0">
                      {u.role === 'admin' ? (
                         <button 
                           onClick={() => handleRoleChange(u.uid, 'staff')}
                           disabled={u.uid === user?.uid}
                           className={`px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 ${u.uid === user?.uid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                         >
                            Demote to Staff
                         </button>
                      ) : (
                         <button 
                           onClick={() => handleRoleChange(u.uid, 'admin')}
                           className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800"
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