import { doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { InventoryItem, LogItem, UserProfile, InventoryEvent } from '../types';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

type SoftDeletableEntity = InventoryItem | LogItem | UserProfile | InventoryEvent;
type EntityType = 'inventory' | 'logs' | 'users' | 'events';

/**
 * Soft delete a single entity by marking it as deleted
 * @param entityType - The type of entity (inventory, logs, users, events)
 * @param entityId - The ID of the entity to soft delete
 * @param userId - The ID of the user performing the deletion
 * @returns Promise<void>
 */
export const softDeleteEntity = async (
  entityType: EntityType,
  entityId: string,
  userId: string
): Promise<void> => {
  const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, entityId);
  
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: Timestamp.now(),
    deletedBy: userId,
  });
};

/**
 * Batch soft delete multiple entities
 * @param entityType - The type of entities to delete
 * @param entityIds - Array of entity IDs to soft delete
 * @param userId - The ID of the user performing the deletion
 * @returns Promise<void>
 */
export const softDeleteBatch = async (
  entityType: EntityType,
  entityIds: string[],
  userId: string
): Promise<void> => {
  // Firestore batch limit is 500 operations
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchIds = entityIds.slice(i, i + BATCH_SIZE);
    
    batchIds.forEach((id) => {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, id);
      batch.update(docRef, {
        isDeleted: true,
        deletedAt: Timestamp.now(),
        deletedBy: userId,
      });
    });
    
    await batch.commit();
  }
};

/**
 * Restore a soft-deleted entity
 * @param entityType - The type of entity to restore
 * @param entityId - The ID of the entity to restore
 * @returns Promise<void>
 */
export const restoreEntity = async (
  entityType: EntityType,
  entityId: string
): Promise<void> => {
  const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, entityId);
  
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  });
};

/**
 * Batch restore multiple entities
 * @param entityType - The type of entities to restore
 * @param entityIds - Array of entity IDs to restore
 * @returns Promise<void>
 */
export const restoreBatch = async (
  entityType: EntityType,
  entityIds: string[]
): Promise<void> => {
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchIds = entityIds.slice(i, i + BATCH_SIZE);
    
    batchIds.forEach((id) => {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, id);
      batch.update(docRef, {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
    });
    
    await batch.commit();
  }
};

/**
 * Permanently delete an entity (hard delete - admin only)
 * This should only be used after 90 days or with explicit admin confirmation
 * @param entityType - The type of entity to permanently delete
 * @param entityId - The ID of the entity to permanently delete
 * @returns Promise<void>
 */
export const hardDeleteEntity = async (
  entityType: EntityType,
  entityId: string
): Promise<void> => {
  const batch = writeBatch(db);
  const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, entityId);
  batch.delete(docRef);
  await batch.commit();
};

/**
 * Batch permanently delete multiple entities
 * @param entityType - The type of entities to permanently delete
 * @param entityIds - Array of entity IDs to permanently delete
 * @returns Promise<void>
 */
export const hardDeleteBatch = async (
  entityType: EntityType,
  entityIds: string[]
): Promise<void> => {
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchIds = entityIds.slice(i, i + BATCH_SIZE);
    
    batchIds.forEach((id) => {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', entityType, id);
      batch.delete(docRef);
    });
    
    await batch.commit();
  }
};

/**
 * Filter out soft-deleted entities from a collection
 * @param entities - Array of entities to filter
 * @returns Array of non-deleted entities
 */
export const filterDeleted = <T extends SoftDeletableEntity>(entities: T[]): T[] => {
  return entities.filter((entity) => !entity.isDeleted);
};

/**
 * Get only soft-deleted entities from a collection
 * @param entities - Array of entities to filter
 * @returns Array of deleted entities
 */
export const filterOnlyDeleted = <T extends SoftDeletableEntity>(entities: T[]): T[] => {
  return entities.filter((entity) => entity.isDeleted === true);
};

/**
 * Check if an entity is eligible for auto-purge (deleted > 90 days ago)
 * @param entity - The entity to check
 * @returns boolean
 */
export const isEligibleForAutoPurge = (entity: SoftDeletableEntity): boolean => {
  if (!entity.isDeleted || !entity.deletedAt) return false;
  
  const deletedDate = entity.deletedAt instanceof Timestamp 
    ? entity.deletedAt.toDate() 
    : new Date(entity.deletedAt);
  
  const daysSinceDeletion = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceDeletion > 90;
};
