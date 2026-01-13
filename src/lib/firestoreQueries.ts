import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { LogItem } from '@/types';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || 'default-app-id';

export const fetchLogsByDateRange = async (startDate: string, endDate: string) => {
    try {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Create query
        // Note: Firestore requires an index for range filters on different fields, 
        // but here we are filtering and sorting on the same field 'timestamp', so it should work out of the box.
        // Removed orderBy to avoid requiring a composite index. Sorting is done client-side.
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

        // Client-side sort
        return results.sort((a, b) => {
            const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp as any).seconds * 1000;
            const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp as any).seconds * 1000;
            return bTime - aTime;
        });
    } catch (error) {
        console.error('Error fetching logs by date:', error);
        throw error;
    }
};


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

        // Client-side sort
        return results.sort((a, b) => {
            const aTime = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : (a.timestamp as any).seconds * 1000;
            const bTime = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : (b.timestamp as any).seconds * 1000;
            return bTime - aTime;
        });
    } catch (error) {
        console.error('Error fetching logs by item:', error);
        throw error;
    }
};
