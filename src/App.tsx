import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { Inventory } from '@/components/Inventory';
import { RapidReceive } from '@/components/RapidReceive';
import { Logs } from '@/components/Logs';
import { Team } from '@/components/Team';
import { Backup } from '@/components/Backup';
import { Settings } from '@/components/Settings';
import { Modals } from '@/components/Modals';
import { ToastContainer } from '@/components/Toast';
import { CommandPalette } from '@/components/CommandPalette';
import { InventoryItem, LogItem, UserProfile } from '@/types';

type ViewType = 'dashboard' | 'inventory' | 'history' | 'rapid-receive' | 'team' | 'backup' | 'settings';

function App() {
  const { 
    user, setUser, setUserProfile, setRole, 
    setInventory, setLogs, setUsersList, setLoading, 
    loading, role 
  } = useStore();
  
  const { theme, resolvedTheme } = useThemeStore();

  const [view, setView] = useState<ViewType>('dashboard');
  const [activeModal, setActiveModal] = useState<'none' | 'add' | 'transaction' | 'edit'>('none');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    let shouldBeDark = false;
    
    if (theme === 'system') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      shouldBeDark = theme === 'dark';
    }
    
    // Force remove and add to ensure proper toggle
    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Global keyboard shortcuts (using Alt to avoid browser conflicts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input fields (except for Escape)
      const isInInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      
      // Command palette: Alt + K or Ctrl + K
      if (e.altKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // New item: Alt + N
      if (e.altKey && e.key === 'n' && !isInInput) {
        e.preventDefault();
        setActiveModal('add');
      }
      
      // Rapid receive: Alt + R
      if (e.altKey && e.key === 'r' && !isInInput) {
        e.preventDefault();
        setView('rapid-receive');
      }
      
      // Settings: Alt + ,
      if (e.altKey && e.key === ',') {
        e.preventDefault();
        setView('settings');
      }
      
      // Dashboard: Alt + D
      if (e.altKey && e.key === 'd' && !isInInput) {
        e.preventDefault();
        setView('dashboard');
      }
      
      // Inventory: Alt + I
      if (e.altKey && e.key === 'i' && !isInInput) {
        e.preventDefault();
        setView('inventory');
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        else if (activeModal !== 'none') {
          setActiveModal('none');
          setSelectedItem(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, activeModal]);

  // Command palette navigation handler
  const handleCommandSelect = useCallback((command: string) => {
    switch (command) {
      case 'dashboard':
      case 'inventory':
      case 'history':
      case 'rapid-receive':
      case 'team':
      case 'backup':
      case 'settings':
        setView(command as ViewType);
        break;
      case 'new-item':
        setActiveModal('add');
        break;
      case 'toggle-theme':
        useThemeStore.getState().toggleTheme();
        break;
    }
    setCommandPaletteOpen(false);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', u.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          setRole(data.role);
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            role: 'staff',
            name: `User ${u.uid.substring(0, 4)}`,
            lastActive: serverTimestamp() as Timestamp
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubInv = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
        items.sort((a, b) => a.name.localeCompare(b.name));
        setInventory(items);
        setLoading(false);
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
      (snapshot) => {
        const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LogItem));
        logsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setLogs(logsData);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'),
      (snapshot) => {
        const uList = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
        setUsersList(uList);
      }
    );

    return () => { unsubInv(); unsubLogs(); unsubUsers(); };
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400">
      <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="font-medium">Loading Warehouse Data...</p>
    </div>
  );

  return (
    <>
      <Layout 
        currentView={view} 
        onViewChange={setView}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      >
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'inventory' && (
          <Inventory 
            onNavigate={setView} 
            onOpenModal={(type, item) => {
              setActiveModal(type);
              setSelectedItem(item || null);
            }} 
          />
        )}
        {view === 'rapid-receive' && <RapidReceive />}
        {view === 'history' && <Logs />}
        {view === 'team' && role === 'admin' && <Team />}
        {view === 'backup' && role === 'admin' && <Backup />}
        {view === 'settings' && <Settings />}

        <Modals 
          activeModal={activeModal} 
          selectedItem={selectedItem} 
          onClose={() => { setActiveModal('none'); setSelectedItem(null); }} 
        />
      </Layout>

      {/* Global Components */}
      <ToastContainer />
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleCommandSelect}
      />
    </>
  );
}

export default App;