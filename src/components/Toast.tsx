import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToastStore, ToastType } from '@/store/useToastStore';

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-700',
  error: 'bg-rose-600 dark:bg-rose-700',
  warning: 'bg-amber-600 dark:bg-amber-700',
  info: 'bg-blue-600 dark:bg-blue-700',
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${styles[toast.type]} text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in-down`}
            role="alert"
          >
            <Icon size={20} className="flex-shrink-0" />
            <span className="font-medium flex-1">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
