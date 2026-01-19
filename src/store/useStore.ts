import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from 'firebase/auth';
import { InventoryItem, LogItem, UserProfile, Role, InventoryEvent, DateField } from '@/types';

interface AppState {
  user: User | null;
  userProfile: UserProfile | null;
  role: Role;
  inventory: InventoryItem[];
  logs: LogItem[];
  usersList: UserProfile[];
  inventoryEvents: InventoryEvent[];
  lastBackupDate: DateField | null;
  loading: boolean;
  isOffline: boolean;
  isFirebaseConfigured: boolean;
  favorites: string[]; // Array of item IDs


  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setRole: (role: Role) => void;
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  softDeleteInventoryItem: (id: string, userId: string) => void;
  restoreInventoryItem: (id: string) => void;
  setLogs: (logs: LogItem[]) => void;
  addLog: (log: LogItem) => void;
  softDeleteLog: (id: string, userId: string) => void;
  restoreLog: (id: string) => void;
  setInventoryEvents: (events: InventoryEvent[]) => void;
  addInventoryEvent: (event: InventoryEvent) => void;
  updateInventoryEvent: (id: string, updates: Partial<InventoryEvent>) => void;
  deleteInventoryEvent: (id: string) => void;
  softDeleteInventoryEvent: (id: string, userId: string) => void;
  restoreInventoryEvent: (id: string) => void;
  setLastBackupDate: (date: DateField) => void;
  setUsersList: (users: UserProfile[]) => void;
  softDeleteUser: (uid: string, deletedBy: string) => void;
  restoreUser: (uid: string) => void;
  setLoading: (loading: boolean) => void;
  setIsOffline: (isOffline: boolean) => void;
  setIsFirebaseConfigured: (configured: boolean) => void;
  toggleFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  getUniqueCategories: () => string[];
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      userProfile: null,
      role: 'admin', // Default to admin for offline mode
      inventory: [],
      logs: [],
      inventoryEvents: [],
      lastBackupDate: null,
      usersList: [],
      loading: true,
      isOffline: !navigator.onLine,
      isFirebaseConfigured: false,
      favorites: [],

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
      softDeleteInventoryItem: (id, userId) => set({
        inventory: get().inventory.map(item =>
          item.id === id ? { ...item, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: userId } : item
        )
      }),
      restoreInventoryItem: (id) => set({
        inventory: get().inventory.map(item =>
          item.id === id ? { ...item, isDeleted: false, deletedAt: undefined, deletedBy: undefined } : item
        )
      }),
      setLogs: (logs) => set({ logs }),
      addLog: (log) => set({ logs: [log, ...get().logs] }),
      softDeleteLog: (id, userId) => set({
        logs: get().logs.map(log =>
          log.id === id ? { ...log, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: userId } : log
        )
      }),
      restoreLog: (id) => set({
        logs: get().logs.map(log =>
          log.id === id ? { ...log, isDeleted: false, deletedAt: undefined, deletedBy: undefined } : log
        )
      }),
      setInventoryEvents: (inventoryEvents) => set({ inventoryEvents }),
      addInventoryEvent: (event) => set({ inventoryEvents: [event, ...get().inventoryEvents] }),
      updateInventoryEvent: (id, updates) => set({
        inventoryEvents: get().inventoryEvents.map(e => e.id === id ? { ...e, ...updates } : e)
      }),
      deleteInventoryEvent: (id) => set({
        inventoryEvents: get().inventoryEvents.filter(e => e.id !== id)
      }),
      softDeleteInventoryEvent: (id, userId) => set({
        inventoryEvents: get().inventoryEvents.map(e =>
          e.id === id ? { ...e, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy: userId } : e
        )
      }),
      restoreInventoryEvent: (id) => set({
        inventoryEvents: get().inventoryEvents.map(e =>
          e.id === id ? { ...e, isDeleted: false, deletedAt: undefined, deletedBy: undefined } : e
        )
      }),
      setLastBackupDate: (lastBackupDate) => set({ lastBackupDate }),
      setUsersList: (usersList) => set({ usersList }),
      softDeleteUser: (uid, deletedBy) => set({
        usersList: get().usersList.map(user =>
          user.uid === uid ? { ...user, isDeleted: true, deletedAt: new Date().toISOString(), deletedBy } : user
        )
      }),
      restoreUser: (uid) => set({
        usersList: get().usersList.map(user =>
          user.uid === uid ? { ...user, isDeleted: false, deletedAt: undefined, deletedBy: undefined } : user
        )
      }),
      setLoading: (loading) => set({ loading }),
      setIsOffline: (isOffline) => set({ isOffline }),
      setIsFirebaseConfigured: (isFirebaseConfigured) => set({ isFirebaseConfigured }),
      toggleFavorite: (itemId) => set({
        favorites: get().favorites.includes(itemId)
          ? get().favorites.filter(id => id !== itemId)
          : [...get().favorites, itemId]
      }),
      isFavorite: (itemId) => get().favorites.includes(itemId),
      getUniqueCategories: () => {
        const categories = new Set(
          get().inventory
            .map(item => item.category)
            .filter(cat => cat && cat.trim())
        );
        return Array.from(categories).sort();
      },
    }),
    {
      name: 'stocktrack-data',
      partialize: (state) => ({
        inventory: state.inventory,
        logs: state.logs,
        inventoryEvents: state.inventoryEvents,
        lastBackupDate: state.lastBackupDate,
        userProfile: state.userProfile,
        role: state.role,
        favorites: state.favorites,
      }),
    }
  )
);