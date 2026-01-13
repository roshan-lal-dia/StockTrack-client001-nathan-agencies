import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/types';
import { ImageViewer, ImageThumbnail } from './ImageViewer';
import { Search } from 'lucide-react';
import { fetchLogsByDateRange } from '@/lib/firestoreQueries';



export const Logs = () => {
  const { logs } = useStore();
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Date Search State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof logs | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Use searchResults if available, otherwise use live logs
  const displayedLogs = searchResults || logs;

  const filteredLogs = displayedLogs.filter(log =>
    log.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDateSearch = async () => {
    if (!startDate || !endDate) return;

    setIsLoadingHistory(true);
    try {
      const results = await fetchLogsByDateRange(startDate, endDate);
      setSearchResults(results);
      setIsSearching(true);
    } catch (error) {
      console.error(error);
      // alert('Failed to fetch logs'); 
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const clearDateSearch = () => {
    setStartDate('');
    setEndDate('');
    setSearchResults(null);
    setIsSearching(false);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Logs</h2>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <input
              type="date"
              className="bg-transparent text-slate-600 dark:text-slate-300 text-sm px-3 outline-none"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <span className="text-slate-400 self-center">-</span>
            <input
              type="date"
              className="bg-transparent text-slate-600 dark:text-slate-300 text-sm px-3 outline-none"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {isSearching ? (
              <button
                onClick={clearDateSearch}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
              >
                Clear
              </button>
            ) : (
              <button
                onClick={handleDateSearch}
                disabled={!startDate || !endDate || isLoadingHistory}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isLoadingHistory ? '...' : 'Filter'}
              </button>
            )}
          </div>

          {/* Text Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search visible logs..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none transition-all text-slate-800 dark:text-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isSearching && (
        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm flex items-center gap-2">
          <span className="font-bold">Archive View:</span> Showing results for {startDate} to {endDate}.
          <button onClick={clearDateSearch} className="underline hover:text-indigo-800">Return to Live Feed</button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">User</th>
                <th className="px-4 py-4">Attach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(log.timestamp, 'datetime')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                            ${log.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400' :
                        log.type === 'out' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400' :
                          'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400'}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{log.itemName}</td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{log.quantity}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {log.user.charAt(0)}
                      </div>
                      {log.user}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <ImageThumbnail
                      imageUrl={log.attachmentUrl}
                      alt={log.attachmentName || 'Attachment'}
                      size="sm"
                      onClick={() => log.attachmentUrl && setViewingImage({
                        url: log.attachmentUrl,
                        title: log.attachmentName || `${log.itemName} - ${log.type.toUpperCase()}`
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          isOpen={true}
          onClose={() => setViewingImage(null)}
          imageUrl={viewingImage.url}
          title={viewingImage.title}
        />
      )}
    </div>
  );
};