import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Loader2, Search } from 'lucide-react';
import { fuzzyMatch } from '../lib/searchUtils';
import { useStore } from '../store/useStore';
import { useToastStore } from '../store/useToastStore';
import {
  fetchDeletedInventory,
  fetchDeletedLogs,
  fetchDeletedUsers,
  fetchDeletedEvents,
} from '../lib/firestoreQueries';
import {
  restoreEntity,
  restoreBatch,
  hardDeleteEntity,
  hardDeleteBatch,
} from '../lib/softDelete';
import { InventoryItem, LogItem, UserProfile, InventoryEvent, formatDate } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { PinVerification } from './PinVerification';

type EntityType = 'inventory' | 'logs' | 'users' | 'events';

export const RecoveryPanel: React.FC = () => {
  const { user, role, isFirebaseConfigured } = useStore();
  const addToast = useToastStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<EntityType>('inventory');
  const [deletedItems, setDeletedItems] = useState<(InventoryItem | LogItem | UserProfile | InventoryEvent)[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items with fuzzy search
  const filteredItems = deletedItems.filter(item => {
    if (!searchQuery.trim()) return true;
    
    let searchableText = '';
    if ('name' in item) searchableText = `${item.name} ${(item as any).category || ''}`;
    else if ('itemName' in item) searchableText = `${item.itemName} ${item.user}`;
    else if ('description' in item) searchableText = `${item.type} ${item.description}`;
    else if ('email' in item) searchableText = `${item.name} ${item.email}`;
    
    return fuzzyMatch(searchableText, searchQuery);
  });
  
  // Confirmation states
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<string | null>(null);
  const [showBulkRestoreConfirm, setShowBulkRestoreConfirm] = useState(false);
  const [showBulkPurgeConfirm, setShowBulkPurgeConfirm] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [pendingPurgeAction, setPendingPurgeAction] = useState<(() => Promise<void>) | null>(null);

  // Fetch deleted items
  const loadDeletedItems = async () => {
    if (!isFirebaseConfigured) {
      addToast('Recovery panel requires Firebase configuration', 'error');
      return;
    }

    setLoading(true);
    try {
      let items: any[] = [];
      switch (activeTab) {
        case 'inventory':
          items = await fetchDeletedInventory();
          break;
        case 'logs':
          items = await fetchDeletedLogs();
          break;
        case 'users':
          items = await fetchDeletedUsers();
          break;
        case 'events':
          items = await fetchDeletedEvents();
          break;
      }
      setDeletedItems(items);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error loading deleted items:', error);
      addToast('Failed to load deleted items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedItems();
  }, [activeTab, isFirebaseConfigured]);

  // Single item restore
  const handleRestore = async () => {
    if (!restoreTarget || !user) return;

    try {
      await restoreEntity(activeTab, restoreTarget);
      addToast('Item restored successfully', 'success');
      setRestoreTarget(null);
      loadDeletedItems();
    } catch (error) {
      console.error('Restore error:', error);
      addToast('Failed to restore item', 'error');
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0 || !user) return;

    try {
      await restoreBatch(activeTab, Array.from(selectedIds));
      addToast(`Restored ${selectedIds.size} items`, 'success');
      setShowBulkRestoreConfirm(false);
      loadDeletedItems();
    } catch (error) {
      console.error('Bulk restore error:', error);
      addToast('Failed to restore items', 'error');
    }
  };

  // Single item permanent delete (requires PIN)
  const handlePermanentDelete = async () => {
    if (!purgeTarget || !user) return;

    const action = async () => {
      try {
        await hardDeleteEntity(activeTab, purgeTarget);
        addToast('Item permanently deleted', 'success');
        setPurgeTarget(null);
        loadDeletedItems();
      } catch (error) {
        console.error('Permanent delete error:', error);
        addToast('Failed to permanently delete item', 'error');
      }
    };

    setPendingPurgeAction(() => action);
    setShowPinVerify(true);
  };

  // Bulk permanent delete (requires PIN)
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.size === 0 || !user) return;

    const action = async () => {
      try {
        await hardDeleteBatch(activeTab, Array.from(selectedIds));
        addToast(`Permanently deleted ${selectedIds.size} items`, 'success');
        setShowBulkPurgeConfirm(false);
        loadDeletedItems();
      } catch (error) {
        console.error('Bulk permanent delete error:', error);
        addToast('Failed to permanently delete items', 'error');
      }
    };

    setPendingPurgeAction(() => action);
    setShowPinVerify(true);
  };

  const onPinVerified = async () => {
    if (pendingPurgeAction) {
      await pendingPurgeAction();
      setPendingPurgeAction(null);
    }
    setShowPinVerify(false);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => {
        if ('uid' in item) return item.uid;
        return item.id;
      })));
    }
  };

  // Get item ID
  const getItemId = (item: any) => ('uid' in item ? item.uid : item.id);

  // Render item details based on type
  const renderItemDetails = (item: any) => {
    switch (activeTab) {
      case 'inventory':
        return (
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Category: {item.category} | Location: {item.location}
            </div>
          </div>
        );
      case 'logs':
        return (
          <div>
            <div className="font-medium">{item.itemName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Type: {item.type.toUpperCase()} | Qty: {item.quantity} | By: {item.user}
            </div>
          </div>
        );
      case 'users':
        return (
          <div>
            <div className="font-medium">{item.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Role: {item.role} | Email: {item.email || 'N/A'}
            </div>
          </div>
        );
      case 'events':
        return (
          <div>
            <div className="font-medium capitalize">{item.type}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.description.substring(0, 80)}
              {item.description.length > 80 && '...'}
            </div>
          </div>
        );
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Firebase Required</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Recovery panel requires Firebase configuration to access deleted items.
        </p>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Only administrators can access the recovery panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Recovery Panel</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Restore or permanently delete soft-deleted items • {filteredItems.length} of {deletedItems.length} items
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search deleted items..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {(['inventory', 'logs', 'users', 'events'] as EntityType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                Select All ({selectedIds.size} selected)
              </span>
            </label>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={() => setShowBulkRestoreConfirm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restore Selected</span>
              </button>
              <button
                onClick={() => setShowBulkPurgeConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Purge Selected</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500">{searchQuery ? 'No matching items found' : `No deleted ${activeTab} found`}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const itemId = getItemId(item);
            return (
              <div
                key={itemId}
                className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(itemId)}
                    onChange={() => toggleSelect(itemId)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1">{renderItemDetails(item)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Deleted: {formatDate(item.deletedAt, 'datetime')}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setRestoreTarget(itemId)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Restore"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setPurgeTarget(itemId)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Permanently Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!restoreTarget}
        title="Restore Item"
        message="Are you sure you want to restore this item? It will be available again in the main view."
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
        confirmText="Restore"
        cancelText="Cancel"
      />

      <ConfirmDialog
        isOpen={showBulkRestoreConfirm}
        title="Restore Multiple Items"
        message={`Are you sure you want to restore ${selectedIds.size} items?`}
        onConfirm={handleBulkRestore}
        onCancel={() => setShowBulkRestoreConfirm(false)}
        confirmText="Restore All"
        cancelText="Cancel"
      />

      <ConfirmDialog
        isOpen={!!purgeTarget}
        title="Permanently Delete"
        message="⚠️ This action cannot be undone! The item will be permanently removed from the database. This requires PIN verification."
        onConfirm={handlePermanentDelete}
        onCancel={() => setPurgeTarget(null)}
        confirmText="Continue to PIN"
        cancelText="Cancel"
        isDangerous
      />

      <ConfirmDialog
        isOpen={showBulkPurgeConfirm}
        title="Permanently Delete Multiple Items"
        message={`⚠️ This action cannot be undone! ${selectedIds.size} items will be permanently removed from the database. This requires PIN verification.`}
        onConfirm={handleBulkPermanentDelete}
        onCancel={() => setShowBulkPurgeConfirm(false)}
        confirmText="Continue to PIN"
        cancelText="Cancel"
        isDangerous
      />

      {/* PIN Verification */}
      {showPinVerify && (
        <PinVerification
          onVerified={onPinVerified}
          onCancel={() => {
            setShowPinVerify(false);
            setPendingPurgeAction(null);
            setPurgeTarget(null);
            setShowBulkPurgeConfirm(false);
          }}
        />
      )}
    </div>
  );
};
