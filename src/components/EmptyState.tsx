import { Package, Search, FileQuestion, Inbox, AlertTriangle } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-items' | 'no-results' | 'no-logs' | 'error';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const defaultContent = {
  'no-items': {
    icon: Inbox,
    title: 'No inventory items yet',
    description: 'Start by adding your first product to the inventory.',
    iconColor: 'text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
    iconColor: 'text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  'no-logs': {
    icon: FileQuestion,
    title: 'No activity yet',
    description: 'Transaction logs will appear here once you start managing inventory.',
    iconColor: 'text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  'error': {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'We encountered an error loading this data. Please try again.',
    iconColor: 'text-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
  },
};

export const EmptyState = ({ type, title, description, action }: EmptyStateProps) => {
  const content = defaultContent[type];
  const Icon = content.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`p-6 rounded-full ${content.bgColor} mb-4`}>
        <Icon size={48} className={content.iconColor} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
        {title || content.title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        {description || content.description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
        >
          <Package size={18} />
          {action.label}
        </button>
      )}
    </div>
  );
};
