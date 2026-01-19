import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { LogItem, InventoryItem, UserProfile, InventoryEvent } from '@/types';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

/**
 * Fetch logs by date range, excluding soft-deleted logs
 */
export const fetchLogsByDateRange = async (startDate: string, endDate: string) => {
    try {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const logsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs');
        console.log(`Fetching logs from ${start.toISOString()} to ${end.toISOString()}`);

        const q = query(
            logsRef,
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end)),
            limit(1000)
        );

        const snapshot = await getDocs(q);
        console.log(`Fetched ${snapshot.size} logs for date range`);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogItem));

        // Filter out soft-deleted logs
        const activeResults = results.filter(log => !log.isDeleted);

        // Client-side sort
        return activeResults.sort((a, b) => {
            const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp as any).seconds * 1000;
            const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp as any).seconds * 1000;
            return bTime - aTime;
        });
    } catch (error) {
        console.error('Error fetching logs by date:', error);
        throw error;
    }
};

/**
 * Fetch logs by item name, excluding soft-deleted logs
 */
export const fetchLogsByItem = async (itemName: string) => {
    try {
        const logsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs');
        console.log(`Fetching logs for item: "${itemName}"`);
        const q = query(
            logsRef,
            where('itemName', '==', itemName),
            limit(100)
        );

        const snapshot = await getDocs(q);
        console.log(`Fetched ${snapshot.size} logs for item: "${itemName}"`);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogItem));

        // Filter out soft-deleted logs
        const activeResults = results.filter(log => !log.isDeleted);

        // Client-side sort
        return activeResults.sort((a, b) => {
            const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp as any).seconds * 1000;
            const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp as any).seconds * 1000;
            return bTime - aTime;
        });
    } catch (error) {
        console.error('Error fetching logs by item:', error);
        throw error;
    }
};

/**
 * Fetch all deleted inventory items (for recovery panel)
 */
export const fetchDeletedInventory = async (): Promise<InventoryItem[]> => {
    try {
        const inventoryRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory');
        const q = query(inventoryRef, where('isDeleted', '==', true), limit(500));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
    } catch (error) {
        console.error('Error fetching deleted inventory:', error);
        throw error;
    }
};

/**
 * Fetch all deleted logs (for recovery panel)
 */
export const fetchDeletedLogs = async (): Promise<LogItem[]> => {
    try {
        const logsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs');
        const q = query(logsRef, where('isDeleted', '==', true), limit(500));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogItem));
    } catch (error) {
        console.error('Error fetching deleted logs:', error);
        throw error;
    }
};

/**
 * Fetch all deleted users (for recovery panel)
 */
export const fetchDeletedUsers = async (): Promise<UserProfile[]> => {
    try {
        const usersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'users');
        const q = query(usersRef, where('isDeleted', '==', true), limit(500));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
        console.error('Error fetching deleted users:', error);
        throw error;
    }
};

/**
 * Fetch all deleted events (for recovery panel)
 */
export const fetchDeletedEvents = async (): Promise<InventoryEvent[]> => {
    try {
        const eventsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'events');
        const q = query(eventsRef, where('isDeleted', '==', true), limit(500));
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryEvent));
    } catch (error) {
        console.error('Error fetching deleted events:', error);
        throw error;
    }
};
