import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'staff';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  location: string;
  notes: string;
  lastUpdated?: Timestamp;
}

export interface LogItem {
  id: string;
  type: 'in' | 'out' | 'create' | 'audit' | 'update';
  itemName: string;
  quantity: number;
  user: string;
  timestamp: Timestamp;
}

export interface UserProfile {
  uid: string;
  role: Role;
  name: string;
  lastActive: Timestamp;
}