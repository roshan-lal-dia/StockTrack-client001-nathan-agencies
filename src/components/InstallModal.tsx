import { X, Share, Smartphone, Plus, MoreVertical, Download } from 'lucide-react';
import { getPlatformInfo } from '@/lib/pwaInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal = ({ isOpen, onClose }: InstallModalProps) => {
  const platform = getPlatformInfo();
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center relative animate-scale-in">
        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <X size={20} className="text-slate-600 dark:text-slate-300" />
        </button>
        
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
          <Smartphone size={40} className="text-white" />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Install StockTrack Pro
        </h3>
        
        {platform.isIOS ? (
          <>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              iOS requires manual installation via Safari. Follow these simple steps:
            </p>
            
            {/* Steps */}
            <div className="space-y-4 text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl mb-6">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tap the <Share size={16} className="inline mx-1 text-indigo-600" /> <strong>Share</strong> button
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Located at the bottom of Safari
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Look for the <Plus size={12} className="inline mx-0.5" /> icon
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tap <strong>"Add"</strong> to confirm
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    The app will appear on your home screen
                  </p>
                </div>
              </div>
            </div>
            
            {/* Visual hint for Share button location */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-4">
              <div className="w-8 h-1 bg-slate-200 dark:bg-slate-600 rounded" />
              <Share size={14} className="text-indigo-500" />
              <span>← Look for this icon</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Install for quick access and offline support. Follow these steps:
            </p>
            
            {/* Steps for Android */}
            <div className="space-y-4 text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl mb-6">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tap the <MoreVertical size={16} className="inline mx-1 text-indigo-600" /> <strong>Menu</strong> button
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Three dots at the top right of your browser
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tap <strong>"Install"</strong> to confirm
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Done button */}
        <button 
          onClick={onClose} 
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Got it!
        </button>
        
        {/* Browser hint */}
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          {platform.isIOS 
            ? "Make sure you're using Safari browser" 
            : `Detected: ${platform.browser}`
          }
        </p>
      </div>
    </div>
  );
};
