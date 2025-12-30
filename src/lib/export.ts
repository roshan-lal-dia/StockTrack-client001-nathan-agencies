import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { parseDate } from '@/types';

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
        return str.includes(',') || str.includes('"') 
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

export const generateFullBackup = (): void => {
  const { inventory, logs, usersList } = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  
  const backup = {
    exportedAt: new Date().toISOString(),
    inventory,
    logs,
    users: usersList
  };
  
  exportToJSON(backup, `stocktrack_backup_${timestamp}`);
};

export const exportInventoryCSV = (): void => {
  const { inventory } = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  
  const data = inventory.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    minStock: item.minStock,
    location: item.location,
    notes: item.notes
  }));
  
  exportToCSV(data, `inventory_${timestamp}`);
};

export const exportLogsCSV = (): void => {
  const { logs } = useStore.getState();
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  
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