import { doc, updateDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { InventoryItem, LogItem } from '../types';

const APP_ID = import.meta.env.VITE_FIREBASE_APP_ID;

/**
 * ONE-TIME RECONCILIATION UTILITY
 * 
 * This calculates the correct quantity for each inventory item from transaction logs.
 * Use this ONCE to fix any quantity discrepancies caused by sync issues.
 * 
 * IMPORTANT: After running this, the quantity field becomes the source of truth.
 * - Logs are only for audit/history
 * - Logs can be deleted for space management
 * - Future stock updates rely on quantity field + increment operations
 */

export interface ReconciliationResult {
  itemName: string;
  itemId: string;
  currentQuantity: number;
  calculatedQuantity: number;
  discrepancy: number;
  logsProcessed: number;
  needsFixing: boolean;
}

/**
 * Calculate quantity for a single item from its transaction logs
 * @param itemName - Name of the inventory item
 * @param allLogs - All log entries (will be filtered for this item)
 * @returns Calculated quantity and number of logs processed
 */
export const calculateQuantityFromLogs = (
  itemName: string, 
  allLogs: LogItem[]
): { quantity: number; logsProcessed: number } => {
  const itemLogs = allLogs
    .filter(log => log.itemName === itemName && !log.isDeleted)
    .sort(/* ... */);

  console.log(`🔍 Item: "${itemName}"`);
  console.log(`📊 Found ${itemLogs.length} logs`);
  
  let quantity = 0;
  let isFirstOperation = true;

  for (const log of itemLogs) {
    const type = (log.type || '').toUpperCase();
    console.log(`  Log: type="${log.type}" → "${type}", qty=${log.quantity}`);
    
    switch (type) {
      case 'CREATE':
        if (isFirstOperation) {
          // First operation: CREATE sets the initial quantity
          console.log(`    ✅ CREATE (first op): setting initial quantity to ${log.quantity}`);
          quantity = log.quantity || 0;
        } else {
          // CREATE after other operations: treat as adding new units (like IN)
          console.log(`    ✅ CREATE (later): adding ${log.quantity} units, total now ${quantity + (log.quantity || 0)}`);
          quantity += log.quantity || 0;
        }
        break;
      case 'IN':
        console.log(`    ✅ IN: adding ${log.quantity}, total now ${quantity + (log.quantity || 0)}`);
        quantity += log.quantity || 0;
        break;
      case 'OUT':
        console.log(`    ✅ OUT: subtracting ${log.quantity}, total now ${quantity - (log.quantity || 0)}`);
        quantity -= log.quantity || 0;
        break;
      case 'AUDIT':
        // Audit sets absolute quantity ONLY if non-zero (manual correction)
        // Zero quantity audits are just inspections/views, not corrections
        if (log.quantity && log.quantity > 0) {
          console.log(`    ✅ AUDIT: setting quantity to ${log.quantity}`);
          quantity = log.quantity;
        } else {
          console.log(`    ⏭️  AUDIT: quantity=0, skipping (inspection only)`);
        }
        break;
      default:
        console.log(`    ❌ UNKNOWN TYPE: "${type}" - skipping!`);
    }
    
    isFirstOperation = false;
  }

  console.log(`📦 Final calculated quantity: ${quantity}`);
  return { 
    quantity: Math.max(0, quantity), 
    logsProcessed: itemLogs.length 
  };
};

/**
 * Analyze all inventory items and detect quantity discrepancies
 * @returns Array of reconciliation results showing current vs calculated quantities
 */
export const analyzeInventory = async (): Promise<ReconciliationResult[]> => {
  const results: ReconciliationResult[] = [];

  try {
    // Fetch all inventory items from Firebase
    const inventorySnap = await getDocs(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory')
    );

    // Fetch all transaction logs
    const logsSnap = await getDocs(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'logs')
    );

    const inventory = inventorySnap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as InventoryItem));

    const logs = logsSnap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as LogItem));

    console.log(`Analyzing ${inventory.length} items with ${logs.length} logs`);

    // Analyze each item
    for (const item of inventory) {
      if (item.isDeleted) continue; // Skip soft-deleted items

      const { quantity: calculatedQty, logsProcessed } = calculateQuantityFromLogs(
        item.name, 
        logs
      );

      // Skip items with no logs - current quantity is source of truth
      if (logsProcessed === 0) {
        console.log(`⏭️  Skipping "${item.name}" - no logs found, current quantity (${item.quantity}) is source of truth`);
        continue;
      }

      const discrepancy = item.quantity - calculatedQty;
      const needsFixing = Math.abs(discrepancy) > 0;

      results.push({
        itemName: item.name,
        itemId: item.id,
        currentQuantity: item.quantity,
        calculatedQuantity: calculatedQty,
        discrepancy,
        logsProcessed,
        needsFixing
      });
    }

    // Sort by discrepancy (largest first)
    results.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy));

    return results;
  } catch (err) {
    console.error('Analysis failed:', err);
    throw new Error('Failed to analyze inventory: ' + (err as Error).message);
  }
};

/**
 * Fix all inventory quantities based on transaction logs (ONE-TIME USE)
 * @param onProgress - Optional callback for progress updates
 * @returns Summary of fixed/unchanged items with detailed results
 */
export const reconcileAllInventory = async (
  onProgress?: (current: number, total: number) => void
): Promise<{
  fixed: number;
  unchanged: number;
  errors: number;
  results: ReconciliationResult[];
}> => {
  const results = await analyzeInventory();
  const itemsNeedingFix = results.filter(r => r.needsFixing);
  
  console.log(`Found ${itemsNeedingFix.length} items needing reconciliation`);
  
  let fixed = 0;
  let unchanged = 0;
  let errors = 0;

  // Use batch writes for efficiency (Firebase limit: 500 per batch)
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let operationCount = 0;
  let processedCount = 0;

  for (const result of results) {
    processedCount++;
    
    // Report progress
    if (onProgress) {
      onProgress(processedCount, results.length);
    }

    if (result.needsFixing) {
      try {
        // Update the quantity to match calculated value
        const itemRef = doc(
          db, 
          'artifacts', 
          APP_ID, 
          'public', 
          'data', 
          'inventory', 
          result.itemId
        );

        batch.update(itemRef, {
          quantity: result.calculatedQuantity,
          lastUpdated: new Date().toISOString(),
          reconciledAt: new Date().toISOString()
        });

        operationCount++;
        fixed++;

        // Commit batch if reaching limit
        if (operationCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`Committed batch of ${operationCount} updates`);
          batch = writeBatch(db);
          operationCount = 0;
        }
      } catch (err) {
        console.error(`Error fixing ${result.itemName}:`, err);
        errors++;
      }
    } else {
      unchanged++;
    }
  }

  // Commit remaining operations
  if (operationCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${operationCount} updates`);
  }

  return {
    fixed,
    unchanged,
    errors,
    results: itemsNeedingFix // Return only items that needed fixing
  };
};

/**
 * Fix quantity for a single item based on its logs
 * @param itemId - ID of the inventory item
 * @param itemName - Name of the inventory item
 * @param allLogs - All transaction logs
 * @returns Reconciliation result for this item
 */
export const reconcileSingleItem = async (
  itemId: string, 
  itemName: string, 
  allLogs: LogItem[]
): Promise<ReconciliationResult> => {
  const { quantity: calculatedQty, logsProcessed } = calculateQuantityFromLogs(
    itemName, 
    allLogs
  );

  // Get current item data
  const itemSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'public', 'data', 'inventory')
  );
  const itemDoc = itemSnap.docs.find(d => d.id === itemId);

  if (!itemDoc) {
    throw new Error('Item not found');
  }

  const item = itemDoc.data() as InventoryItem;
  const currentQty = item.quantity;
  const discrepancy = currentQty - calculatedQty;
  const needsFixing = Math.abs(discrepancy) > 0;

  // Update if there's a discrepancy
  if (needsFixing) {
    const itemRef = doc(
      db, 
      'artifacts', 
      APP_ID, 
      'public', 
      'data', 
      'inventory', 
      itemId
    );

    await updateDoc(itemRef, {
      quantity: calculatedQty,
      lastUpdated: new Date().toISOString(),
      reconciledAt: new Date().toISOString()
    });
  }

  return {
    itemName,
    itemId,
    currentQuantity: currentQty,
    calculatedQuantity: calculatedQty,
    discrepancy,
    logsProcessed,
    needsFixing
  };
};

/**
 * Generate a summary report of reconciliation results
 * @param results - Array of reconciliation results
 * @returns Human-readable summary
 */
export const generateReconciliationReport = (
  results: ReconciliationResult[]
): string => {
  const itemsNeedingFix = results.filter(r => r.needsFixing);
  const totalDiscrepancy = results.reduce((sum, r) => sum + Math.abs(r.discrepancy), 0);

  let report = `📊 RECONCILIATION REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `Total Items Analyzed: ${results.length}\n`;
  report += `Items Needing Fix: ${itemsNeedingFix.length}\n`;
  report += `Total Discrepancy: ${totalDiscrepancy} units\n\n`;

  if (itemsNeedingFix.length > 0) {
    report += `Items with Discrepancies:\n`;
    report += `${'-'.repeat(50)}\n`;
    
    for (const result of itemsNeedingFix) {
      const sign = result.discrepancy > 0 ? '+' : '';
      report += `\n${result.itemName}\n`;
      report += `  Current: ${result.currentQuantity}\n`;
      report += `  Calculated: ${result.calculatedQuantity}\n`;
      report += `  Difference: ${sign}${result.discrepancy} (${result.logsProcessed} logs)\n`;
    }
  } else {
    report += `✅ All quantities match logs - no reconciliation needed!\n`;
  }

  return report;
};
