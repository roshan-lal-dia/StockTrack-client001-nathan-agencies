/**
 * Loading skeleton components for better perceived performance
 */

export const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
);

export const SkeletonText = ({ className = '', lines = 1 }: { className?: string; lines?: number }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 ${
          i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

export const InventoryCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
    <div className="flex items-start gap-4">
      <SkeletonBox className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <SkeletonBox className="h-5 w-3/4 mb-2" />
        <SkeletonBox className="h-4 w-1/2 mb-3" />
        <div className="flex gap-2">
          <SkeletonBox className="h-6 w-16 rounded-full" />
          <SkeletonBox className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <SkeletonBox className="w-10 h-10 rounded-lg" />
    </div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
    {/* Header */}
    <div>
      <SkeletonBox className="h-8 w-48 mb-2" />
      <SkeletonBox className="h-5 w-64" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <SkeletonBox className="w-14 h-14 rounded-xl" />
            <div className="flex-1">
              <SkeletonBox className="h-4 w-24 mb-2" />
              <SkeletonBox className="h-7 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Recent Activity */}
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
      <SkeletonBox className="h-6 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <SkeletonBox className="h-4 w-3/4 mb-1" />
              <SkeletonBox className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
    {/* Header */}
    <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700">
      <div className="flex gap-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
    {/* Rows */}
    <div className="bg-white dark:bg-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
          <div className="flex gap-8 items-center">
            {Array.from({ length: 5 }).map((_, j) => (
              <SkeletonBox key={j} className={`h-4 ${j === 0 ? 'w-32' : 'w-20'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);
