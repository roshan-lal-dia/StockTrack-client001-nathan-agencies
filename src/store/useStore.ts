import { create } from 'zustand';
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
  
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setRole: (role: Role) => void;
  setInventory: (items: InventoryItem[]) => void;
  setLogs: (logs: LogItem[]) => void;
  setUsersList: (users: UserProfile[]) => void;
  setLoading: (loading: boolean) => void;
  setIsOffline: (isOffline: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  userProfile: null,
  role: 'staff',
  inventory: [],
  logs: [],
  usersList: [],
  loading: true,
  isOffline: !navigator.onLine,

  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setRole: (role) => set({ role }),
  setInventory: (inventory) => set({ inventory }),
  setLogs: (logs) => set({ logs }),
  setUsersList: (usersList) => set({ usersList }),
  setLoading: (loading) => set({ loading }),
  setIsOffline: (isOffline) => set({ isOffline }),
}));