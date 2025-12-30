import { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Loader2,
  Check,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'inventory' | 'lowStock' | 'logs' | 'summary';

export const ReportGenerator = () => {
  const { inventory, logs } = useStore();
  const { addToast } = useToastStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(i => i.category));
    return Array.from(cats).sort();
  }, [inventory]);

  const getFilteredData = () => {
    let filteredInventory = [...inventory];
    let filteredLogs = [...logs];

    // Category filter
    if (categoryFilter !== 'all') {
      filteredInventory = filteredInventory.filter(i => i.category === categoryFilter);
      filteredLogs = filteredLogs.filter(l => {
        const item = inventory.find(i => i.name === l.itemName);
        return item?.category === categoryFilter;
      });
    }

    // Low stock filter
    if (lowStockOnly) {
      filteredInventory = filteredInventory.filter(i => i.quantity <= i.minStock);
    }

    // Date filter for logs
    if (dateFrom || dateTo) {
      filteredLogs = filteredLogs.filter(log => {
        let logDate: Date;
        if (typeof log.timestamp === 'string') {
          logDate = new Date(log.timestamp);
        } else if (log.timestamp?.seconds) {
          logDate = new Date(log.timestamp.seconds * 1000);
        } else {
          return false;
        }

        if (dateFrom && logDate < new Date(dateFrom)) return false;
        if (dateTo && logDate > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    return { filteredInventory, filteredLogs };
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const { filteredInventory, filteredLogs } = getFilteredData();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(51, 51, 51);
      doc.text('StockTrack Pro Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
      
      let yPosition = 40;

      if (reportType === 'inventory' || reportType === 'summary') {
        // Inventory Table
        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text('Inventory Report', 14, yPosition);
        yPosition += 8;

        const inventoryData = filteredInventory.map(item => [
          item.name,
          item.category,
          item.quantity.toString(),
          item.minStock.toString(),
          item.quantity <= item.minStock ? 'LOW' : 'OK',
          item.location || '-'
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Name', 'Category', 'Qty', 'Min', 'Status', 'Location']],
          body: inventoryData,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
          didParseCell: (data: any) => {
            if (data.column.index === 4 && data.section === 'body') {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = data.cell.raw === 'LOW' ? [220, 38, 38] : [22, 163, 74];
            }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (reportType === 'lowStock') {
        // Low Stock Items
        const lowStockItems = filteredInventory.filter(i => i.quantity <= i.minStock);
        
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text(`Low Stock Alert (${lowStockItems.length} items)`, 14, yPosition);
        yPosition += 8;

        const lowStockData = lowStockItems.map(item => [
          item.name,
          item.category,
          item.quantity.toString(),
          item.minStock.toString(),
          `${item.minStock - item.quantity} needed`,
          item.location || '-'
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Name', 'Category', 'Current', 'Min', 'Shortage', 'Location']],
          body: lowStockData,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38] },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (reportType === 'logs' || reportType === 'summary') {
        // Check if we need a new page
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text('Transaction Logs', 14, yPosition);
        yPosition += 8;

        const logsData = filteredLogs.slice(0, 100).map(log => {
          let dateStr = '';
          if (typeof log.timestamp === 'string') {
            dateStr = new Date(log.timestamp).toLocaleDateString();
          } else if (log.timestamp?.seconds) {
            dateStr = new Date(log.timestamp.seconds * 1000).toLocaleDateString();
          }

          return [
            log.type.toUpperCase(),
            log.itemName,
            log.quantity?.toString() || '-',
            log.user,
            dateStr
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Type', 'Item', 'Qty', 'User', 'Date']],
          body: logsData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          didParseCell: (data: any) => {
            if (data.column.index === 0 && data.section === 'body') {
              if (data.cell.raw === 'IN') {
                data.cell.styles.textColor = [22, 163, 74];
              } else if (data.cell.raw === 'OUT') {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      if (reportType === 'summary') {
        // Check if we need a new page
        if (yPosition > 220) {
          doc.addPage();
          yPosition = 20;
        }

        // Summary Statistics
        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text('Summary Statistics', 14, yPosition);
        yPosition += 10;

        const totalItems = filteredInventory.length;
        const totalStock = filteredInventory.reduce((sum, i) => sum + i.quantity, 0);
        const lowStock = filteredInventory.filter(i => i.quantity <= i.minStock).length;
        const categoriesCount = new Set(filteredInventory.map(i => i.category)).size;
        
        const inLogs = filteredLogs.filter(l => l.type === 'in');
        const outLogs = filteredLogs.filter(l => l.type === 'out');
        const totalReceived = inLogs.reduce((sum, l) => sum + (l.quantity || 0), 0);
        const totalDispatched = outLogs.reduce((sum, l) => sum + (l.quantity || 0), 0);

        autoTable(doc, {
          startY: yPosition,
          head: [['Metric', 'Value']],
          body: [
            ['Total Products', totalItems.toString()],
            ['Total Stock Units', totalStock.toString()],
            ['Low Stock Items', lowStock.toString()],
            ['Categories', categoriesCount.toString()],
            ['Total Received', totalReceived.toString()],
            ['Total Dispatched', totalDispatched.toString()],
          ],
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
          columnStyles: {
            0: { fontStyle: 'bold' }
          }
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount} | StockTrack Pro`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `stocktrack-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      addToast(`Report downloaded: ${fileName}`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('Failed to generate report', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">PDF Reports</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate detailed reports with filters
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Report Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'inventory', label: 'Inventory', icon: BarChart3 },
              { value: 'lowStock', label: 'Low Stock', icon: AlertTriangle },
              { value: 'logs', label: 'Logs', icon: FileText },
              { value: 'summary', label: 'Full Summary', icon: Check },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setReportType(value as ReportType)}
                className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${
                  reportType === value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Filter size={14} className="inline mr-1" />
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Low Stock Toggle */}
        {(reportType === 'inventory' || reportType === 'summary') && (
          <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Include only low stock items
            </span>
          </label>
        )}

        {/* Generate Button */}
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download size={20} />
              Generate PDF Report
            </>
          )}
        </button>
      </div>
    </div>
  );
};
