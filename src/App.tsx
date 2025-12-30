import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, collection, doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useStore } from '@/store/useStore';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { Inventory } from '@/components/Inventory';
import { RapidReceive } from '@/components/RapidReceive';
import { Logs } from '@/components/Logs';
import { Team } from '@/components/Team';
import { Backup } from '@/components/Backup';
import { Modals } from '@/components/Modals';
import { InventoryItem, LogItem, UserProfile } from '@/types';

function App() {
  const { 
    user, setUser, setUserProfile, setRole, 
    setInventory, setLogs, setUsersList, setLoading, 
    loading, role 
  } = useStore();

  const [view, setView] = useState<'dashboard' | 'inventory' | 'history' | 'rapid-receive' | 'team' | 'backup'>('dashboard');
  const [activeModal, setActiveModal] = useState<'none' | 'add' | 'transaction' | 'edit'>('none');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

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
          // Update last active
          // Note: This might trigger a write every refresh, which is fine for this scale
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="font-medium">Loading Warehouse Data...</p>
    </div>
  );

  return (
    <Layout currentView={view} onViewChange={setView}>
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

      <Modals 
        activeModal={activeModal} 
        selectedItem={selectedItem} 
        onClose={() => { setActiveModal('none'); setSelectedItem(null); }} 
      />
    </Layout>
  );
}

export default App;