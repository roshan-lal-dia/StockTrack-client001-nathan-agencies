import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'staff';

// Allow both Timestamp (online) and string (offline) for dates
export type DateField = Timestamp | string;

/**
 * Helper function to parse DateField to Date object
 * Works with both Firestore Timestamp and ISO string
 */
export const parseDate = (dateField: DateField | undefined | null): Date | null => {
  if (!dateField) return null;

  // If it's a string (offline mode)
  if (typeof dateField === 'string') {
    const parsed = new Date(dateField);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // If it's a Firestore Timestamp (online mode)
  if (dateField && typeof dateField === 'object' && 'seconds' in dateField) {
    return new Date(dateField.seconds * 1000);
  }

  return null;
};

/**
 * Format a DateField for display
 */
export const formatDate = (dateField: DateField | undefined | null, format: 'date' | 'time' | 'datetime' = 'datetime'): string => {
  const date = parseDate(dateField);
  if (!date) return 'N/A';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  switch (format) {
    case 'date':
      return dateStr;
    case 'time':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'datetime':
    default:
      return `${dateStr} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
};

export interface InventoryItem {
  id: string;
  name: string;
  shortName?: string;
  category: string;
  quantity: number;
  minStock: number;
  location: string;
  notes: string;
  lastUpdated?: DateField;
  // Image fields (Cloudinary URLs - small strings, not base64)
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface LogItem {
  id: string;
  type: 'in' | 'out' | 'create' | 'audit' | 'update';
  itemName: string;
  quantity: number;
  user: string;
  timestamp: DateField;
  // Optional attachment for transaction proof
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface UserProfile {
  uid: string;
  role: Role;
  name: string;
  email?: string;
  photoUrl?: string;
  lastActive: DateField;
}

export interface InventoryEvent {
  id: string;
  type: 'shipment' | 'visit' | 'audit' | 'other';
  description: string;
  timestamp: DateField;
  user: string;
  imageUrl?: string;
  thumbnailUrl?: string; // Optimized Cloudinary thumbnail
}