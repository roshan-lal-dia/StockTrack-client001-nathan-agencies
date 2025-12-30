import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Search, Package } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToastStore } from '@/store/useToastStore';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string, item?: any) => void;
  mode?: 'search' | 'receive' | 'dispatch';
}

export const BarcodeScanner = ({ isOpen, onClose, onScan, mode = 'search' }: BarcodeScannerProps) => {
  const { inventory } = useStore();
  const { addToast } = useToastStore();
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Camera access denied. Please allow camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScan = (code: string) => {
    if (code === lastScanned) return; // Prevent duplicate scans
    
    setLastScanned(code);
    
    // Look for matching item by name, SKU, or barcode in notes
    const matchedItem = inventory.find(item => 
      item.name.toLowerCase().includes(code.toLowerCase()) ||
      item.notes?.toLowerCase().includes(code.toLowerCase()) ||
      item.notes?.includes(code)
    );

    if (matchedItem) {
      addToast(`Found: ${matchedItem.name}`, 'success');
      onScan(code, matchedItem);
      handleClose();
    } else {
      addToast(`Scanned: ${code} - No matching product`, 'info');
      onScan(code, null);
    }
    
    // Reset last scanned after 2 seconds to allow re-scanning
    setTimeout(() => setLastScanned(null), 2000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  const modeConfig = {
    search: { title: 'Scan to Search', icon: Search, color: 'indigo' },
    receive: { title: 'Scan to Receive', icon: Package, color: 'emerald' },
    dispatch: { title: 'Scan to Dispatch', icon: Package, color: 'rose' }
  };

  const config = modeConfig[mode];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900">
        <div className="flex items-center gap-3">
          <config.icon className={`text-${config.color}-500`} size={24} />
          <h2 className="text-lg font-bold text-white">{config.title}</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white"
        >
          <X size={24} />
        </button>
      </div>

      {/* Scanner View */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center text-white">
            <Camera size={48} className="mx-auto mb-4 text-slate-500" />
            <p className="text-rose-400 mb-4">{error}</p>
            <button
              onClick={startScanner}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div 
              id="barcode-reader" 
              ref={containerRef}
              className="w-full max-w-md rounded-xl overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />
            
            {/* Scanning indicator */}
            {isScanning && (
              <div className="mt-4 flex items-center gap-2 text-emerald-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-sm">Scanning...</span>
              </div>
            )}

            {/* Last scanned */}
            {lastScanned && (
              <div className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-white">
                <span className="text-slate-400 text-sm">Last scanned: </span>
                <span className="font-mono">{lastScanned}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual Entry */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Or enter code manually..."
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
          >
            Search
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center mt-3">
          Point camera at barcode or QR code • Works with EAN, UPC, Code128, QR
        </p>
      </div>
    </div>
  );
};
