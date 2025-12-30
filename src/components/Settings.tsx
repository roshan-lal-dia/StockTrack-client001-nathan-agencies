import { useState } from 'react';
import { Moon, Sun, Monitor, Shield, Keyboard, Database, LogOut, Edit2, Check, X, Lock, Download, Smartphone, CheckCircle } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToastStore';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ChangePinModal } from './PinVerification';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const Settings = () => {
  const { theme, setTheme } = useThemeStore();
  const { userProfile, setUserProfile, isFirebaseConfigured, user } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || '');
  const [signingOut, setSigningOut] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWAInstall();

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  const handleInstallApp = async () => {
    const success = await promptInstall();
    if (success) {
      toast.success('App installed successfully!');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleNameSave = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      if (isFirebaseConfigured && user) {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid);
        await updateDoc(userRef, {
          name: newName.trim(),
          lastActive: serverTimestamp()
        });
      }
      
      setUserProfile({
        ...userProfile!,
        name: newName.trim()
      });
      
      toast.success('Name updated successfully');
      setEditingName(false);
    } catch (err) {
      console.error('Error updating name:', err);
      toast.error('Failed to update name');
    }
  };

  const handleSignOut = async () => {
    if (!isFirebaseConfigured) {
      toast.info('Running in local mode - no sign out needed');
      return;
    }

    setSigningOut(true);
    try {
      await auth.signOut();
      // Clear local storage including cached auth
      localStorage.removeItem('stocktrack-data');
      localStorage.removeItem('stocktrack_cached_auth');
      toast.success('Signed out successfully');
      // The App.tsx onAuthStateChanged will handle showing login screen
    } catch (err) {
      console.error('Sign out error:', err);
      toast.error('Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Customize your StockTrack experience</p>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Sun size={20} className="text-amber-500" />
            Appearance
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose how StockTrack looks to you
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  <Icon size={24} className={isActive ? 'text-indigo-600' : 'text-slate-500 dark:text-slate-400'} />
                  <span className={`text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Keyboard size={20} className="text-indigo-500" />
            Keyboard Shortcuts
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Speed up your workflow with these shortcuts
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { keys: ['Alt', 'K'], action: 'Open quick search' },
              { keys: ['Alt', 'N'], action: 'New product' },
              { keys: ['Alt', 'R'], action: 'Rapid receive mode' },
              { keys: ['Alt', 'D'], action: 'Go to Dashboard' },
              { keys: ['Alt', 'I'], action: 'Go to Inventory' },
              { keys: ['Alt', ','], action: 'Open settings' },
              { keys: ['Esc'], action: 'Close modal / Go back' },
            ].map((shortcut) => (
              <div key={shortcut.action} className="flex items-center justify-between py-2">
                <span className="text-slate-700 dark:text-slate-300">{shortcut.action}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key) => (
                    <kbd
                      key={key}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-emerald-500" />
            Account
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-slate-800 dark:text-white">Display Name</p>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') { setEditingName(false); setNewName(userProfile?.name || ''); }
                    }}
                  />
                  <button 
                    onClick={handleNameSave}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => { setEditingName(false); setNewName(userProfile?.name || ''); }}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{userProfile?.name || 'Anonymous User'}</p>
              )}
            </div>
            {!editingName && (
              <button
                onClick={() => { setEditingName(true); setNewName(userProfile?.name || ''); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
          
          {userProfile?.email && (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-white">Email</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{userProfile.email}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Role</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{userProfile?.role || 'Staff'}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">User ID</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{userProfile?.uid?.slice(0, 16)}...</p>
            </div>
          </div>

          {/* Sign Out */}
          {isFirebaseConfigured && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full py-3 px-4 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {signingOut ? (
                  <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <LogOut size={18} />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Security */}
      {userProfile?.role === 'admin' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <Lock size={20} className="text-rose-500" />
              Admin Security
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage PIN protection for sensitive operations
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800 dark:text-white">Admin PIN</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Required for database cleanup and destructive actions
                </p>
              </div>
              <button
                onClick={() => setShowChangePinModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Change PIN
              </button>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Default PIN:</strong> 1234 — Change this for security!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Install App */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Smartphone size={20} className="text-indigo-500" />
            Install App
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Install StockTrack as an app on your device
          </p>
        </div>
        <div className="p-6">
          {isInstalled ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">App Installed</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  StockTrack is installed on your device
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Install StockTrack Pro for quick access, offline support, and a native app experience.
              </p>
              <button
                onClick={handleInstallApp}
                disabled={isInstalling}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isInstalling ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Download size={18} />
                    Install App
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                To install the app:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Chrome/Edge:</strong> Click the install icon in the address bar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Safari (iOS):</strong> Tap Share → "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Android:</strong> Tap the menu → "Install app"</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Data & Storage */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-blue-500" />
            Data & Storage
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Data is stored in Firebase Cloud Firestore with offline persistence enabled. 
            Your changes sync automatically when you're back online.
          </p>
        </div>
      </div>

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={showChangePinModal}
        onClose={() => setShowChangePinModal(false)}
      />
    </div>
  );
};
