import { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Package, Activity } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { LogItem } from '@/types';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const DashboardCharts = () => {
  const { inventory, logs } = useStore();

  // Category distribution for pie chart
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    inventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + item.quantity;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [inventory]);

  // Activity over last 7 days
  const activityData = useMemo(() => {
    const now = new Date();
    const days: Record<string, { date: string; received: number; dispatched: number }> = {};
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      days[key] = { date: dayName, received: 0, dispatched: 0 };
    }

    // Count activity
    logs.forEach((log: LogItem) => {
      let logDate: string;
      if (typeof log.timestamp === 'string') {
        logDate = new Date(log.timestamp).toISOString().split('T')[0];
      } else if (log.timestamp?.seconds) {
        logDate = new Date(log.timestamp.seconds * 1000).toISOString().split('T')[0];
      } else {
        return;
      }

      if (days[logDate]) {
        if (log.type === 'in') {
          days[logDate].received += log.quantity;
        } else if (log.type === 'out') {
          days[logDate].dispatched += log.quantity;
        }
      }
    });

    return Object.values(days);
  }, [logs]);

  // Top items by quantity
  const topItems = useMemo(() => {
    return [...inventory]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(item => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        quantity: item.quantity
      }));
  }, [inventory]);

  if (inventory.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Activity Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Activity (Last 7 Days)</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Stock received vs dispatched</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDispatched" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="received" 
                stroke="#22c55e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReceived)" 
                name="Received"
              />
              <Area 
                type="monotone" 
                dataKey="dispatched" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorDispatched)" 
                name="Dispatched"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Package className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Stock by Category</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Quantity distribution</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Top Items</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Highest stock levels</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  width={100}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar 
                  dataKey="quantity" 
                  fill="#6366f1" 
                  radius={[0, 4, 4, 0]}
                  name="Quantity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
