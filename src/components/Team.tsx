import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Role, formatDate } from '@/types';
import { Users, Shield, UserCheck, UserX, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

export const Team = () => {
  const { usersList, user, role, isFirebaseConfigured } = useStore();
  const { addToast } = useToastStore();
  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleRoleChange = async (targetUid: string, newRole: Role) => {
    if (role !== 'admin' || !isFirebaseConfigured) return;
    try {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', targetUid);
      await updateDoc(ref, { role: newRole });
      addToast(`User role updated to ${newRole}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update user role', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || !isFirebaseConfigured) return;
    try {
      const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', deleteTarget);
      await deleteDoc(ref);
      addToast('User removed from system', 'success');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      addToast('Failed to remove user', 'error');
    }
  };

  const RoleBadge = ({ userRole }: { userRole: Role }) => {
    const styles = userRole === 'admin' 
      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    return (
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles}`}>
        {userRole}
      </span>
    );
  };

  const adminCount = usersList.filter(u => u.role === 'admin').length;
  const staffCount = usersList.filter(u => u.role === 'staff').length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
       <div>
         <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Team Management</h2>
         <p className="text-slate-500 dark:text-slate-400">Manage user access and permissions</p>
       </div>

       {/* Stats */}
       <div className="grid grid-cols-3 gap-4">
         <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
               <Users size={20} className="text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">{usersList.length}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400">Total Users</p>
             </div>
           </div>
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
               <Shield size={20} className="text-purple-600 dark:text-purple-400" />
             </div>
             <div>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">{adminCount}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400">Admins</p>
             </div>
           </div>
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
               <UserCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
             </div>
             <div>
               <p className="text-2xl font-bold text-slate-800 dark:text-white">{staffCount}</p>
               <p className="text-xs text-slate-500 dark:text-slate-400">Staff</p>
             </div>
           </div>
         </div>
       </div>

       {/* Users List */}
       <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
             <p className="text-sm text-slate-500 dark:text-slate-400">
               <strong className="text-slate-700 dark:text-slate-300">Admins</strong> can manage team, settings, and exports. 
               <strong className="text-slate-700 dark:text-slate-300 ml-2">Staff</strong> can only manage inventory.
             </p>
          </div>
          
          {usersList.length === 0 ? (
            <div className="p-12 text-center">
              <UserX size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
               {usersList.map(u => (
                  <div key={u.uid} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg">
                           {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                             {u.uid === user?.uid && (
                               <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">You</span>
                             )}
                             <RoleBadge userRole={u.role} />
                           </div>
                           <p className="text-xs text-slate-500 dark:text-slate-400">
                             {u.email || 'No email'} • Last active: {formatDate(u.lastActive, 'date')}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 ml-14 md:ml-0">
                        {u.role === 'admin' ? (
                           <button 
                             onClick={() => handleRoleChange(u.uid, 'staff')}
                             disabled={u.uid === user?.uid || adminCount <= 1}
                             title={adminCount <= 1 ? 'Cannot demote the last admin' : ''}
                             className={`px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 ${(u.uid === user?.uid || adminCount <= 1) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                           >
                              Demote
                           </button>
                        ) : (
                           <button 
                             onClick={() => handleRoleChange(u.uid, 'admin')}
                             className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800"
                           >
                              Make Admin
                           </button>
                        )}
                        {u.uid !== user?.uid && (
                          <button
                            onClick={() => setDeleteTarget(u.uid)}
                            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            title="Remove user"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                     </div>
                  </div>
               ))}
            </div>
          )}
       </div>

       {/* Delete Confirmation */}
       <ConfirmDialog
         isOpen={!!deleteTarget}
         onCancel={() => setDeleteTarget(null)}
         onConfirm={handleDeleteUser}
         title="Remove User"
         message="Are you sure you want to remove this user? They will need to sign in again to regain access."
         confirmLabel="Remove"
         variant="danger"
       />
    </div>
  );
};