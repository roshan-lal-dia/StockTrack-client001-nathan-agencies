import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';
import { initializeTheme, useThemeStore } from '@/store/useThemeStore';
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
    user, userProfile, setUser, setUserProfile, setRole, 
    setInventory, setLogs, setUsersList, setLoading, 
    loading, role, setIsOffline 
  } = useStore();

  const [view, setView] = useState<ViewType>('dashboard');
  const [activeModal, setActiveModal] = useState<'none' | 'add' | 'transaction' | 'edit'>('none');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [initialTransactionType, setInitialTransactionType] = useState<'in' | 'out'>('in');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

  // Initialize theme once on mount
  useEffect(() => {
    initializeTheme();
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    // Set initial state
    setIsOffline(!navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline]);

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
        const currentTheme = useThemeStore.getState().theme;
        const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
        useThemeStore.getState().setTheme(nextTheme);
        break;
    }
    setCommandPaletteOpen(false);
  }, []);

  useEffect(() => {
    // Check if Firebase is properly configured
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const isConfigured = apiKey && apiKey !== 'YOUR_API_KEY' && !apiKey.includes('YOUR_');
    
    if (!isConfigured) {
      // Offline mode - no Firebase
      console.log('Firebase not configured - running in offline mode');
      useStore.getState().setIsFirebaseConfigured(false);
      
      // Set default user profile for offline mode
      if (!userProfile) {
        setUserProfile({
          uid: 'local-user',
          role: 'admin',
          name: 'Local Admin',
          lastActive: new Date().toISOString()
        });
        setRole('admin');
      }
      setLoading(false);
      return;
    }

    // Online mode - use Firebase
    useStore.getState().setIsFirebaseConfigured(true);
    
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error", err);
        // Fall back to offline mode on auth error
        useStore.getState().setIsFirebaseConfigured(false);
        if (!userProfile) {
          setUserProfile({
            uid: 'local-user',
            role: 'admin',
            name: 'Local Admin',
            lastActive: new Date().toISOString()
          });
          setRole('admin');
        }
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
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
          setLoading(false);
        } catch (err) {
          console.error("Firestore Error", err);
          // Fall back to offline mode
          useStore.getState().setIsFirebaseConfigured(false);
          if (!userProfile) {
            setUserProfile({
              uid: 'local-user',
              role: 'admin',
              name: 'Local Admin',
              lastActive: new Date().toISOString()
            });
            setRole('admin');
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore listeners - only active when Firebase is configured
  useEffect(() => {
    const { isFirebaseConfigured } = useStore.getState();
    if (!user || !isFirebaseConfigured) return;

    const unsubInv = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'),
      (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
        items.sort((a, b) => a.name.localeCompare(b.name));
        setInventory(items);
        setLoading(false);
      },
      (error) => {
        console.error('Inventory listener error:', error);
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'),
      (snapshot) => {
        const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LogItem));
        logsData.sort((a, b) => {
          const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp?.seconds || 0) * 1000;
          const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp?.seconds || 0) * 1000;
          return bTime - aTime;
        });
        setLogs(logsData);
      },
      (error) => {
        console.error('Logs listener error:', error);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'),
      (snapshot) => {
        const uList = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
        setUsersList(uList);
      },
      (error) => {
        console.error('Users listener error:', error);
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
            onOpenModal={(type, item, txType) => {
              setActiveModal(type);
              setSelectedItem(item || null);
              if (txType) setInitialTransactionType(txType);
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
          initialTransactionType={initialTransactionType}
          onClose={() => { setActiveModal('none'); setSelectedItem(null); setInitialTransactionType('in'); }} 
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