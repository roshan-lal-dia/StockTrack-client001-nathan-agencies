import { useState, useRef } from 'react';
import { Printer, X, Tag, Check, Settings2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import { InventoryItem } from '@/types';

interface LabelConfig {
  showName: boolean;
  showCategory: boolean;
  showLocation: boolean;
  showQuantity: boolean;
  showBarcode: boolean;
  showQR: boolean;
  labelSize: 'small' | 'medium' | 'large';
  columns: number;
}

interface PrintLabelsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems?: InventoryItem[];
}

export const PrintLabels = ({ isOpen, onClose, selectedItems: propItems }: PrintLabelsProps) => {
  const { inventory } = useStore();
  const { addToast } = useToastStore();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<LabelConfig>({
    showName: true,
    showCategory: true,
    showLocation: true,
    showQuantity: false,
    showBarcode: true,
    showQR: false,
    labelSize: 'medium',
    columns: 3
  });
  const [showConfig, setShowConfig] = useState(false);

  const items = propItems || inventory;
  const selectedItems = items.filter(item => selectedIds.has(item.id));

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handlePrint = () => {
    if (selectedItems.length === 0) {
      addToast('Please select items to print', 'error');
      return;
    }

    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Please allow popups to print', 'error');
      return;
    }

    const sizeStyles = {
      small: { width: '1.5in', height: '1in', fontSize: '8px', padding: '4px' },
      medium: { width: '2.5in', height: '1.5in', fontSize: '10px', padding: '8px' },
      large: { width: '4in', height: '2in', fontSize: '12px', padding: '12px' }
    };

    const size = sizeStyles[config.labelSize];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>StockTrack Labels</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 16px;
            }
            .label {
              width: ${size.width};
              height: ${size.height};
              border: 1px solid #333;
              padding: ${size.padding};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
              font-size: ${size.fontSize};
            }
            .label-name {
              font-weight: bold;
              font-size: 1.2em;
              margin-bottom: 4px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .label-detail {
              color: #666;
              margin-bottom: 2px;
            }
            .label-barcode {
              font-family: 'Libre Barcode 128', monospace;
              font-size: 2em;
              text-align: center;
              margin-top: auto;
            }
            .label-barcode-text {
              font-size: 0.8em;
              text-align: center;
              color: #666;
            }
            .qr-placeholder {
              width: 40px;
              height: 40px;
              border: 1px solid #333;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6px;
              margin-top: auto;
            }
            @media print {
              .labels-container { padding: 0; }
              .label { border: 1px dashed #999; }
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="labels-container">
            ${selectedItems.map(item => `
              <div class="label">
                ${config.showName ? `<div class="label-name">${item.name}</div>` : ''}
                ${config.showCategory ? `<div class="label-detail">Category: ${item.category}</div>` : ''}
                ${config.showLocation ? `<div class="label-detail">Location: ${item.location || 'N/A'}</div>` : ''}
                ${config.showQuantity ? `<div class="label-detail">Qty: ${item.quantity}</div>` : ''}
                ${config.showBarcode ? `
                  <div class="label-barcode">*${item.id.slice(-8).toUpperCase()}*</div>
                  <div class="label-barcode-text">${item.id.slice(-8).toUpperCase()}</div>
                ` : ''}
                ${config.showQR ? `<div class="qr-placeholder">QR</div>` : ''}
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    addToast(`Printing ${selectedItems.length} labels`, 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Tag className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Print Labels</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedIds.size} of {items.length} items selected
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-lg transition-colors ${
                showConfig 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
              }`}
            >
              <Settings2 size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showName}
                  onChange={e => setConfig({ ...config, showName: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCategory}
                  onChange={e => setConfig({ ...config, showCategory: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Category</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showLocation}
                  onChange={e => setConfig({ ...config, showLocation: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Location</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showQuantity}
                  onChange={e => setConfig({ ...config, showQuantity: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Quantity</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBarcode}
                  onChange={e => setConfig({ ...config, showBarcode: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Show Barcode</span>
              </label>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Label Size</label>
                <select
                  value={config.labelSize}
                  onChange={e => setConfig({ ...config, labelSize: e.target.value as any })}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                >
                  <option value="small">Small (1.5" x 1")</option>
                  <option value="medium">Medium (2.5" x 1.5")</option>
                  <option value="large">Large (4" x 2")</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Item Selection */}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={selectAll}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedIds.has(item.id)
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.category}</p>
                    {item.location && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.location}</p>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedIds.has(item.id)
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {selectedIds.has(item.id) && <Check size={12} className="text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedIds.size === 0}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={18} />
              Print {selectedIds.size} Labels
            </button>
          </div>
        </div>

        {/* Hidden print content */}
        <div ref={printRef} className="hidden" />
      </div>
    </div>
  );
};
