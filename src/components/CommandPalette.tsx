import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Package, Zap, History, Users, Settings, LayoutDashboard, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

interface Command {
  id: string;
  label: string;
  icon: typeof Search;
  action: () => void;
  keywords: string[];
  category: 'navigation' | 'action' | 'item';
}

export const CommandPalette = ({ isOpen, onClose, onNavigate }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { inventory, role } = useStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const commands: Command[] = useMemo(() => {
    const navCommands: Command[] = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => { onNavigate('dashboard'); onClose(); }, keywords: ['home', 'overview'], category: 'navigation' },
      { id: 'inventory', label: 'Go to Inventory', icon: Package, action: () => { onNavigate('inventory'); onClose(); }, keywords: ['products', 'items', 'stock'], category: 'navigation' },
      { id: 'rapid', label: 'Rapid Receive Mode', icon: Zap, action: () => { onNavigate('rapid-receive'); onClose(); }, keywords: ['quick', 'add', 'receive'], category: 'navigation' },
      { id: 'history', label: 'View Logs', icon: History, action: () => { onNavigate('history'); onClose(); }, keywords: ['audit', 'transactions'], category: 'navigation' },
      { id: 'settings', label: 'Open Settings', icon: Settings, action: () => { onNavigate('settings'); onClose(); }, keywords: ['preferences', 'theme', 'dark'], category: 'navigation' },
    ];

    if (role === 'admin') {
      navCommands.push(
        { id: 'team', label: 'Team Management', icon: Users, action: () => { onNavigate('team'); onClose(); }, keywords: ['users', 'roles'], category: 'navigation' },
        { id: 'backup', label: 'Backup & Export', icon: Download, action: () => { onNavigate('backup'); onClose(); }, keywords: ['export', 'csv', 'json'], category: 'navigation' }
      );
    }

    // Add inventory items as searchable commands
    const itemCommands: Command[] = inventory.slice(0, 20).map(item => ({
      id: `item-${item.id}`,
      label: item.name,
      icon: Package,
      action: () => { onNavigate('inventory'); onClose(); },
      keywords: [item.category, item.location, 'product'],
      category: 'item' as const,
    }));

    return [...navCommands, ...itemCommands];
  }, [inventory, role, onNavigate, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands.filter(c => c.category === 'navigation');
    
    const q = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(q))
    );
  }, [commands, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <Search size={20} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400"
          />
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              No results found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left group"
                  >
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600">
                      <Icon size={16} className="text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 dark:text-white">{cmd.label}</p>
                      <p className="text-xs text-slate-400 capitalize">{cmd.category}</p>
                    </div>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Enter
                    </kbd>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">Enter</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
};
