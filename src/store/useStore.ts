import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { InventoryItem, LogItem, UserProfile, Role } from '@/types';

interface AppState {
  user: User | null;
  userProfile: UserProfile | null;
  role: Role;
  inventory: InventoryItem[];
  logs: LogItem[];
  usersList: UserProfile[];
  loading: boolean;
  isOffline: boolean;
  isFirebaseConfigured: boolean;
  
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setRole: (role: Role) => void;
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  setLogs: (logs: LogItem[]) => void;
  addLog: (log: LogItem) => void;
  setUsersList: (users: UserProfile[]) => void;
  setLoading: (loading: boolean) => void;
  setIsOffline: (isOffline: boolean) => void;
  setIsFirebaseConfigured: (configured: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      role: 'admin', // Default to admin for offline mode
      inventory: [],
      logs: [],
      usersList: [],
      loading: true,
      isOffline: !navigator.onLine,
      isFirebaseConfigured: false,

      setUser: (user) => set({ user }),
      setUserProfile: (userProfile) => set({ userProfile }),
      setRole: (role) => set({ role }),
      setInventory: (inventory) => set({ inventory }),
      addInventoryItem: (item) => set({ inventory: [...get().inventory, item] }),
      updateInventoryItem: (id, updates) => set({
        inventory: get().inventory.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      }),
      deleteInventoryItem: (id) => set({
        inventory: get().inventory.filter(item => item.id !== id)
      }),
      setLogs: (logs) => set({ logs }),
      addLog: (log) => set({ logs: [log, ...get().logs] }),
      setUsersList: (usersList) => set({ usersList }),
      setLoading: (loading) => set({ loading }),
      setIsOffline: (isOffline) => set({ isOffline }),
      setIsFirebaseConfigured: (isFirebaseConfigured) => set({ isFirebaseConfigured }),
    }),
    {
      name: 'stocktrack-data',
      partialize: (state) => ({
        inventory: state.inventory,
        logs: state.logs,
        userProfile: state.userProfile,
        role: state.role,
      }),
    }
  )
);