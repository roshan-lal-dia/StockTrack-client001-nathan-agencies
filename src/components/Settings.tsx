import { Moon, Sun, Monitor, Shield, Keyboard, Database } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToastStore';

export const Settings = () => {
  const { theme, setTheme, setResolvedTheme } = useThemeStore();
  const { userProfile } = useStore();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      setResolvedTheme(newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    toast.success(`Theme changed to ${newTheme}`);
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
            <div>
              <p className="font-medium text-slate-800 dark:text-white">Display Name</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{userProfile?.name || 'Anonymous User'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800 dark:text-white">User ID</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{userProfile?.uid?.slice(0, 12)}...</p>
            </div>
          </div>
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
    </div>
  );
};
