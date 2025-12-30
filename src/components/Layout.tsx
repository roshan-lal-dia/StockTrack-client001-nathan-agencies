import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Zap, 
  History, 
  Users, 
  Box, 
  Menu, 
  WifiOff,
  LogOut,
  Download
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { auth } from '@/lib/firebase';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: 'dashboard' | 'inventory' | 'history' | 'rapid-receive' | 'team' | 'backup') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
  const { userProfile, role, isOffline } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => auth.signOut();

  const NavItem = ({ view, icon: Icon, label }: { view: string, icon: any, label: string }) => (
    <button 
      onClick={() => { onViewChange(view as any); setMobileMenuOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${currentView === view ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
    >
      <Icon size={20} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row overflow-hidden">
      {/* MOBILE NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Box className="text-indigo-600" size={24} />
          <h1 className="font-bold text-slate-800">StockTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          {isOffline && <WifiOff size={20} className="text-rose-500 animate-pulse" />}
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg"><Menu size={20} /></button>
        </div>
      </div>

      {/* SIDEBAR */}
      <nav className={`
        fixed md:static inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 z-50 flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl md:shadow-none
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 text-white">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Box size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StockTrack</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{isOffline ? 'Offline' : 'Online'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="inventory" icon={Package} label="Inventory" />
            <NavItem view="rapid-receive" icon={Zap} label="Rapid Receive" />
            <NavItem view="history" icon={History} label="Logs" />
            
            {role === 'admin' && (
              <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="px-4 text-xs font-bold text-slate-600 uppercase mb-2">Admin Zone</p>
                <NavItem view="team" icon={Users} label="Team Management" />
                <NavItem view="backup" icon={Download} label="Backup & Export" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-slate-700">
              {userProfile?.name.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{userProfile?.name}</p>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${role === 'admin' ? 'bg-purple-900 text-purple-200 border-purple-800' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {role}
              </span>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* OVERLAY */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 scroll-smooth">
        {children}
      </main>
    </div>
  );
};