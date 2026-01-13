import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { parseDate, InventoryItem, LogItem, UserProfile, InventoryEvent } from '@/types';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

/**
 * Export utility functions for generating backups from the frontend.
 * Admins can trigger these exports directly from the app.
 */

export const exportToJSON = (data: unknown, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
};

export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        // Escape quotes and wrap in quotes if contains comma
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  downloadBlob(blob, `${filename}.csv`);
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateFullBackup = async (): Promise<void> => {
  const store = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');

  let backupData: {
    inventory: InventoryItem[];
    logs: LogItem[];
    users: UserProfile[];
    events: InventoryEvent[];
  };

  if (store.isFirebaseConfigured) {
    try {
      const [invSnap, logsSnap, usersSnap, eventsSnap] = await Promise.all([
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users')),
        getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'))
      ]);

      backupData = {
        inventory: invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)),
        logs: logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as LogItem)),
        users: usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)),
        events: eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryEvent))
      };
    } catch (e) {
      console.error("Backup fetch failed", e);
      throw new Error("Failed to fetch full data from server");
    }
  } else {
    backupData = {
      inventory: store.inventory,
      logs: store.logs,
      users: store.usersList,
      events: store.inventoryEvents
    };
  }

  const finalBackup = {
    exportedAt: new Date().toISOString(),
    ...backupData
  };

  exportToJSON(finalBackup, `stocktrack_backup_${timestamp}`);
};

export const exportInventoryCSV = async (): Promise<void> => {
  const store = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd');

  let items: InventoryItem[] = store.inventory;

  if (store.isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory'));
    items = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
  }

  const data = items.map(item => ({
    id: item.id,
    name: item.name,
    shortName: item.shortName || '',
    category: item.category,
    quantity: item.quantity,
    minStock: item.minStock,
    location: item.location,
    notes: item.notes
  }));

  exportToCSV(data, `inventory_${timestamp}`);
};

export const exportLogsCSV = async (): Promise<void> => {
  const store = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd');

  let logs: LogItem[] = store.logs;

  if (store.isFirebaseConfigured) {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as LogItem));
  }

  const data = logs.map(log => {
    const date = parseDate(log.timestamp);
    return {
      id: log.id,
      type: log.type,
      itemName: log.itemName,
      quantity: log.quantity,
      user: log.user,
      timestamp: date ? date.toISOString() : ''
    };
  });

  exportToCSV(data, `logs_${timestamp}`);
};

export const exportEventsCSV = async (): Promise<void> => {
  const store = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd');

  let events: InventoryEvent[] = store.inventoryEvents;

  if (store.isFirebaseConfigured) {
    const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'events'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    events = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryEvent));
  }

  const data = events.map(event => {
    const date = parseDate(event.timestamp);
    return {
      id: event.id,
      type: event.type,
      user: event.user,
      description: event.description,
      timestamp: date ? date.toISOString() : ''
    };
  });

  exportToCSV(data, `events_${timestamp}`);
};