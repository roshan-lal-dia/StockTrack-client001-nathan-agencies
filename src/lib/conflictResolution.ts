import { InventoryItem } from '@/types';

export interface ConflictInfo {
  itemId: string;
  itemName: string;
  localVersion: InventoryItem;
  serverVersion: InventoryItem;
  conflictType: 'quantity' | 'metadata' | 'both';
  detectedAt: string;
}

export interface PendingChange {
  id: string;
  itemId: string;
  type: 'quantity_delta' | 'metadata_update';
  delta?: number; // For quantity changes: +5 or -3
  previousQuantity?: number;
  metadata?: Partial<InventoryItem>;
  timestamp: string;
  userId: string;
  userName: string;
  synced: boolean;
}

// Storage keys
const PENDING_CHANGES_KEY = 'stocktrack_pending_changes';
const CONFLICTS_KEY = 'stocktrack_conflicts';
const LAST_SYNC_KEY = 'stocktrack_last_sync';

// Pending Changes Management
export const getPendingChanges = (): PendingChange[] => {
  try {
    const stored = localStorage.getItem(PENDING_CHANGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const savePendingChange = (change: PendingChange) => {
  const changes = getPendingChanges();
  changes.push(change);
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
};

export const removePendingChange = (id: string) => {
  const changes = getPendingChanges().filter(c => c.id !== id);
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
};

export const markChangeSynced = (id: string) => {
  const changes = getPendingChanges().map(c => 
    c.id === id ? { ...c, synced: true } : c
  );
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
};

export const clearSyncedChanges = () => {
  const changes = getPendingChanges().filter(c => !c.synced);
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));
};

export const getPendingChangesForItem = (itemId: string): PendingChange[] => {
  return getPendingChanges().filter(c => c.itemId === itemId && !c.synced);
};

// Conflict Management
export const getConflicts = (): ConflictInfo[] => {
  try {
    const stored = localStorage.getItem(CONFLICTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addConflict = (conflict: ConflictInfo) => {
  const conflicts = getConflicts();
  const existing = conflicts.findIndex(c => c.itemId === conflict.itemId);
  if (existing >= 0) {
    conflicts[existing] = conflict;
  } else {
    conflicts.push(conflict);
  }
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
};

export const removeConflict = (itemId: string) => {
  const conflicts = getConflicts().filter(c => c.itemId !== itemId);
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
};

export const clearAllConflicts = () => {
  localStorage.removeItem(CONFLICTS_KEY);
};

// Last Sync Time
export const getLastSyncTime = (): Date => {
  try {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? new Date(stored) : new Date(0);
  } catch {
    return new Date(0);
  }
};

export const setLastSyncTime = (time: Date = new Date()) => {
  localStorage.setItem(LAST_SYNC_KEY, time.toISOString());
};

// Merge strategy for quantity changes - uses delta approach
export const mergeQuantityChanges = (
  serverQuantity: number,
  pendingChanges: PendingChange[]
): number => {
  const quantityChanges = pendingChanges.filter(c => c.type === 'quantity_delta' && !c.synced);
  const totalDelta = quantityChanges.reduce((sum, c) => sum + (c.delta || 0), 0);
  return Math.max(0, serverQuantity + totalDelta);
};

// Detect if there's a conflict between local and server versions
export const detectConflict = (
  localItem: InventoryItem,
  serverItem: InventoryItem,
  lastSyncTime: Date
): ConflictInfo | null => {
  let serverUpdateTime: Date;
  
  if (typeof serverItem.lastUpdated === 'string') {
    serverUpdateTime = new Date(serverItem.lastUpdated);
  } else if (serverItem.lastUpdated?.seconds) {
    serverUpdateTime = new Date(serverItem.lastUpdated.seconds * 1000);
  } else {
    return null;
  }

  // If server was updated after our last sync, check for conflicts
  if (serverUpdateTime > lastSyncTime) {
    const quantityDiff = localItem.quantity !== serverItem.quantity;
    const metadataDiff = 
      localItem.name !== serverItem.name ||
      localItem.category !== serverItem.category ||
      localItem.location !== serverItem.location ||
      localItem.minStock !== serverItem.minStock ||
      localItem.notes !== serverItem.notes;

    if (quantityDiff || metadataDiff) {
      return {
        itemId: localItem.id,
        itemName: localItem.name,
        localVersion: localItem,
        serverVersion: serverItem,
        conflictType: quantityDiff && metadataDiff ? 'both' : 
                      quantityDiff ? 'quantity' : 'metadata',
        detectedAt: new Date().toISOString()
      };
    }
  }

  return null;
};

// Generate unique change ID
export const generateChangeId = (): string => {
  return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Apply delta-based resolution
export const resolveWithDelta = (
  serverQuantity: number,
  localChanges: PendingChange[]
): number => {
  // Sum all local deltas and apply to current server quantity
  const totalDelta = localChanges
    .filter(c => c.type === 'quantity_delta')
    .reduce((sum, c) => sum + (c.delta || 0), 0);
  
  return Math.max(0, serverQuantity + totalDelta);
};
