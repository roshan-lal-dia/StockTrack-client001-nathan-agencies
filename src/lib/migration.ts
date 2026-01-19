import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;
const MIGRATION_KEY = 'stocktrack_soft_delete_migration_v1';

/**
 * Check if soft delete migration has already been run
 */
export const isMigrationCompleted = (): boolean => {
  return localStorage.getItem(MIGRATION_KEY) === 'completed';
};

/**
 * Mark migration as completed
 */
const markMigrationCompleted = (): void => {
  localStorage.setItem(MIGRATION_KEY, 'completed');
};

/**
 * Run one-time migration to add isDeleted: false to all existing documents
 * This should be run once on first admin login after deploying soft delete
 */
export const runSoftDeleteMigration = async (): Promise<{
  success: boolean;
  message: string;
  counts: { inventory: number; logs: number; users: number; events: number };
}> => {
  if (isMigrationCompleted()) {
    return {
      success: true,
      message: 'Migration already completed',
      counts: { inventory: 0, logs: 0, users: 0, events: 0 }
    };
  }

  const counts = { inventory: 0, logs: 0, users: 0, events: 0 };

  try {
    // Migrate inventory
    const inventoryRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    if (!inventorySnapshot.empty) {
      const inventoryBatch = writeBatch(db);
      inventorySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Only update if isDeleted field doesn't exist
        if (data.isDeleted === undefined) {
          inventoryBatch.update(docSnap.ref, { isDeleted: false });
          counts.inventory++;
        }
      });
      if (counts.inventory > 0) {
        await inventoryBatch.commit();
      }
    }

    // Migrate logs
    const logsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs');
    const logsSnapshot = await getDocs(logsRef);
    
    if (!logsSnapshot.empty) {
      // Process in batches of 500 (Firestore limit)
      const logDocs = logsSnapshot.docs;
      for (let i = 0; i < logDocs.length; i += 500) {
        const logsBatch = writeBatch(db);
        const batchDocs = logDocs.slice(i, i + 500);
        
        batchDocs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isDeleted === undefined) {
            logsBatch.update(docSnap.ref, { isDeleted: false });
            counts.logs++;
          }
        });
        
        if (batchDocs.length > 0 && counts.logs > 0) {
          await logsBatch.commit();
        }
      }
    }

    // Migrate users
    const usersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    if (!usersSnapshot.empty) {
      const usersBatch = writeBatch(db);
      usersSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted === undefined) {
          usersBatch.update(docSnap.ref, { isDeleted: false });
          counts.users++;
        }
      });
      if (counts.users > 0) {
        await usersBatch.commit();
      }
    }

    // Migrate events
    const eventsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    
    if (!eventsSnapshot.empty) {
      const eventsBatch = writeBatch(db);
      eventsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isDeleted === undefined) {
          eventsBatch.update(docSnap.ref, { isDeleted: false });
          counts.events++;
        }
      });
      if (counts.events > 0) {
        await eventsBatch.commit();
      }
    }

    // Mark migration as completed
    markMigrationCompleted();

    const total = counts.inventory + counts.logs + counts.users + counts.events;
    return {
      success: true,
      message: `Migration completed successfully. Updated ${total} documents.`,
      counts
    };
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      counts
    };
  }
};

/**
 * Reset migration flag (for testing purposes only)
 */
export const resetMigration = (): void => {
  localStorage.removeItem(MIGRATION_KEY);
};
