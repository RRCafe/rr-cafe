import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart2, TrendingUp, ShoppingBag, Star, ArrowLeft, Calendar, Package, DollarSign, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomDropdown } from '../components/CustomDropdown';

interface OrderItem {
  quantity: number;
  unit_price: number;
  total_price: number;
  menu_item_id: string;
  item_name: string;
}

interface Order {
  id: string;
  created_at: string;
  order_type: string;
  grand_total: number;
  source: string;
  status: string;
  order_items: OrderItem[];
}

type DateRange = 'today' | 'week' | 'month' | 'custom';
type OrderTypeFilter = 'all' | 'dine_in' | 'dine_out' | 'delivery';
type SourceFilter = 'all' | 'app' | 'pos_manual' | 'zomato' | 'swiggy';

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  dine_out: 'Takeaway',
  delivery: 'Delivery',
};

const SOURCE_LABELS: Record<string, string> = {
  app: 'App',
  pos_manual: 'POS',
  zomato: 'Zomato',
  swiggy: 'Swiggy',
};

const ORDER_TYPE_OPTIONS: { value: OrderTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Order Types' },
  { value: 'dine_in', label: 'Dine In' },
  { value: 'dine_out', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'app', label: 'App' },
  { value: 'pos_manual', label: 'POS' },
  { value: 'zomato', label: 'Zomato' },
  { value: 'swiggy', label: 'Swiggy' },
];

function getDateRangeFilter(range: DateRange, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  } else if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  } else if (range === 'month') {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  } else {
    return {
      start: customStart ? new Date(customStart + 'T00:00:00') : new Date(now.setDate(1)),
      end: customEnd ? new Date(customEnd + 'T23:59:59') : end,
    };
  }
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OrderReport() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderTypeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, order_type, grand_total, source, status,
        order_items(quantity, unit_price, total_price, menu_item_id, item_name)
      `)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRangeFilter(dateRange, customStart, customEnd);
    return orders.filter(order => {
      const date = new Date(order.created_at);
      const inRange = date >= start && date <= end;
      const matchType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter;
      const matchSource = sourceFilter === 'all' || order.source === sourceFilter;
      return inRange && matchType && matchSource;
    });
  }, [orders, dateRange, customStart, customEnd, orderTypeFilter, sourceFilter]);

  // KPI computations
  const totalRevenue = useMemo(() => filteredOrders.reduce((s, o) => s + (o.grand_total || 0), 0), [filteredOrders]);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Item-wise sales
  const itemSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredOrders.forEach(order => {
      (order.order_items || []).forEach(item => {
        const key = item.item_name || item.menu_item_id;
        if (!map[key]) map[key] = { name: key, qty: 0, revenue: 0 };
        map[key].qty += item.quantity;
        map[key].revenue += item.total_price;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const mostOrderedItem = itemSales[0]?.name ?? '—';

  // Daily revenue
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; orders: number; revenue: number }> = {};
    filteredOrders.forEach(order => {
      const d = order.created_at.slice(0, 10);
      if (!map[d]) map[d] = { date: d, orders: 0, revenue: 0 };
      map[d].orders += 1;
      map[d].revenue += order.grand_total || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders]);

  // Order type breakdown
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const t = o.order_type || 'unknown';
      if (!map[t]) map[t] = { count: 0, revenue: 0 };
      map[t].count += 1;
      map[t].revenue += o.grand_total || 0;
    });
    return Object.entries(map).map(([type, data]) => ({ type, ...data }));
  }, [filteredOrders]);

  // Payment method breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      const s = o.source || 'unknown';
      if (!map[s]) map[s] = { count: 0, revenue: 0 };
      map[s].count += 1;
      map[s].revenue += o.grand_total || 0;
    });
    return Object.entries(map).map(([source, data]) => ({ source, ...data }));
  }, [filteredOrders]);

  const maxDailyRevenue = Math.max(...dailyData.map(d => d.revenue), 1);
  const maxItemRevenue = Math.max(...itemSales.map(i => i.revenue), 1);

  const typeColors: Record<string, string> = {
    dine_in: 'bg-blue-500',
    dine_out: 'bg-orange-500',
    delivery: 'bg-green-500',
    unknown: 'bg-gray-400',
  };

  const sourceColors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-yellow-500'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/30">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Sales Report</h1>
            <p className="text-xs text-gray-500 font-medium">Analytics & Insights</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        {/* Mobile: horizontal scrollable chips + compact selects */}
        <div className="md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {(['today', 'week', 'month', 'custom'] as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                dateRange === r ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
              }`}>
                {r === 'today' ? 'Today' : r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'Custom'}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <CustomDropdown
              value={orderTypeFilter}
              onChange={val => setOrderTypeFilter(val as OrderTypeFilter)}
              options={ORDER_TYPE_OPTIONS}
              size="sm"
              className="flex-1 min-w-0"
            />
            <CustomDropdown
              value={sourceFilter}
              onChange={val => setSourceFilter(val as SourceFilter)}
              options={SOURCE_OPTIONS}
              size="sm"
              className="flex-1 min-w-0"
            />
          </div>
          {dateRange === 'custom' && (
            <div className="flex gap-2 mt-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        {/* Desktop: original layout */}
        <div className="hidden md:flex flex-row gap-3 flex-wrap">
          {/* Date Range */}
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl flex-wrap">
            {(['today', 'week', 'month', 'custom'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                  dateRange === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Custom'}
              </button>
            ))}
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {/* Order Type Filter */}
          <CustomDropdown
            value={orderTypeFilter}
            onChange={val => setOrderTypeFilter(val as OrderTypeFilter)}
            options={ORDER_TYPE_OPTIONS}
            size="sm"
            className="w-44"
          />

          {/* Source Filter */}
          <CustomDropdown
            value={sourceFilter}
            onChange={val => setSourceFilter(val as SourceFilter)}
            options={SOURCE_OPTIONS}
            size="sm"
            className="w-40"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Orders</p>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{totalOrders}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Avg Order Value</p>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{formatCurrency(avgOrderValue)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Most Ordered</p>
          <p className="text-sm font-black text-gray-900 tracking-tight leading-tight mt-1 line-clamp-2">{mostOrderedItem}</p>
        </div>
      </div>

      {/* Mobile Breakdown: Compact stat pills */}
      <div className="md:hidden grid grid-cols-1 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-gray-400" /> Order Types
          </h3>
          {typeBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No data</p>
          ) : (
            <div className="space-y-2.5">
              {typeBreakdown.map(({ type, count, revenue }) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                const colors: Record<string, { bg: string; text: string; bar: string }> = {
                  dine_in: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
                  dine_out: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
                  delivery: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
                };
                const c = colors[type] || { bg: 'bg-gray-50', text: 'text-gray-600', bar: 'bg-gray-400' };
                return (
                  <div key={type} className={`${c.bg} rounded-xl p-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-sm ${c.text}`}>{ORDER_TYPE_LABELS[type] || type}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-700">{formatCurrency(revenue)}</span>
                        <span className={`ml-2 text-xs font-semibold ${c.text}`}>{count} orders</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">{pct}% of total</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-400" /> Order Sources
          </h3>
          {sourceBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No data</p>
          ) : (
            <div className="space-y-2.5">
              {sourceBreakdown.map(({ source, count, revenue }, idx) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                const barColors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'];
                const bgColors = ['bg-indigo-50', 'bg-purple-50', 'bg-pink-50', 'bg-teal-50'];
                const textColors = ['text-indigo-700', 'text-purple-700', 'text-pink-700', 'text-teal-700'];
                const ci = idx % 4;
                return (
                  <div key={source} className={`${bgColors[ci]} rounded-xl p-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-sm ${textColors[ci]}`}>{SOURCE_LABELS[source] || source}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-700">{formatCurrency(revenue)}</span>
                        <span className={`ml-2 text-xs font-semibold ${textColors[ci]}`}>{count}</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColors[ci]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Breakdown Grid */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Order Type Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            Order Type Breakdown
          </h3>
          {typeBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {typeBreakdown.map(({ type, count, revenue }) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-gray-700">{ORDER_TYPE_LABELS[type] || type}</span>
                      <span className="text-xs font-bold text-gray-500">{count} orders • {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${typeColors[type] || 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(revenue)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Source Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <Users className="w-4 h-4 text-gray-400" />
            Order Source
          </h3>
          {sourceBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {sourceBreakdown.map(({ source, count, revenue }, idx) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-gray-700">{SOURCE_LABELS[source] || source}</span>
                      <span className="text-xs font-bold text-gray-500">{count} • {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${sourceColors[idx % sourceColors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(revenue)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Revenue Visual Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            Revenue by Type
          </h3>
          {typeBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No data</p>
          ) : (
            <div className="flex items-end gap-3 h-32 mt-2">
              {typeBreakdown.map(({ type, revenue }) => {
                const maxRev = Math.max(...typeBreakdown.map(t => t.revenue), 1);
                const heightPct = (revenue / maxRev) * 100;
                return (
                  <div key={type} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-600 text-center">{formatCurrency(revenue)}</span>
                    <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className={`w-full rounded-t-lg transition-all ${typeColors[type] || 'bg-gray-400'}`}
                        style={{ height: `${heightPct}%`, marginTop: `${100 - heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">
                      {ORDER_TYPE_LABELS[type] || type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily Revenue Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="font-bold text-gray-800">Daily Revenue</h3>
          <span className="ml-auto text-xs text-gray-400 font-medium">{dailyData.length} days</span>
        </div>
        {dailyData.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No orders in selected range</p>
          </div>
        ) : (
          <>
            {/* Mobile Daily Revenue - card list */}
            <div className="md:hidden space-y-2 p-4">
              {dailyData.map(day => (
                <div key={day.date} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{formatDate(day.date)}</p>
                    <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(day.revenue / maxDailyRevenue) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-gray-900 text-sm">{formatCurrency(day.revenue)}</p>
                    <p className="text-xs text-gray-400">{day.orders} orders</p>
                  </div>
                </div>
              ))}
              {/* Mobile total footer */}
              <div className="flex justify-between items-center bg-blue-50 rounded-xl p-3 border border-blue-100 mt-2">
                <span className="font-black text-gray-800">Total</span>
                <div className="text-right">
                  <span className="font-black text-blue-700">{formatCurrency(totalRevenue)}</span>
                  <span className="text-xs text-gray-500 ml-2">{totalOrders} orders</span>
                </div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Orders</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Revenue</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Avg Value</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider w-40">Revenue Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map(day => (
                    <tr key={day.date} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="p-4 font-semibold text-gray-800">{formatDate(day.date)}</td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full">{day.orders}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">{formatCurrency(day.revenue)}</td>
                      <td className="p-4 text-right text-gray-500 font-medium text-sm">{formatCurrency(day.orders > 0 ? day.revenue / day.orders : 0)}</td>
                      <td className="p-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(day.revenue / maxDailyRevenue) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50/50 border-t-2 border-blue-100">
                  <tr>
                    <td className="p-4 font-black text-gray-900">Total</td>
                    <td className="p-4 text-center font-black text-gray-900">{totalOrders}</td>
                    <td className="p-4 text-right font-black text-blue-700 text-lg">{formatCurrency(totalRevenue)}</td>
                    <td className="p-4 text-right font-bold text-gray-700">{formatCurrency(avgOrderValue)}</td>
                    <td className="p-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Item-wise Sales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Star className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-gray-800">Item-wise Sales</h3>
          <span className="ml-auto text-xs text-gray-400 font-medium">{itemSales.length} items</span>
        </div>
        {itemSales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No items sold in selected range</p>
          </div>
        ) : (
          <>
            {/* Mobile Item Sales - ranked cards */}
            <div className="md:hidden space-y-2 p-4">
              {itemSales.map((item, idx) => {
                const pct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
                const barPct = (item.revenue / maxItemRevenue) * 100;
                const isMostSelling = idx === 0;
                const isLeastSelling = idx === itemSales.length - 1 && itemSales.length > 1;
                return (
                  <div key={item.name} className={`rounded-xl p-3 border ${isMostSelling ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gray-400 font-bold text-sm w-5 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.qty} units sold</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-black text-gray-900 text-sm">{formatCurrency(item.revenue)}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          {isMostSelling && <span className="text-[10px] font-bold bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded-full">🔥 Top</span>}
                          {isLeastSelling && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">Least</span>}
                          <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isMostSelling ? 'bg-orange-400' : 'bg-blue-400'}`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider w-8">#</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Item Name</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Qty Sold</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Revenue</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">% of Total</th>
                    <th className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider w-40">Popularity</th>
                  </tr>
                </thead>
                <tbody>
                  {itemSales.map((item, idx) => {
                    const pct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
                    const barPct = (item.revenue / maxItemRevenue) * 100;
                    const isMostSelling = idx === 0;
                    const isLeastSelling = idx === itemSales.length - 1 && itemSales.length > 1;
                    return (
                      <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                        <td className="p-4 text-gray-400 text-sm font-bold">{idx + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{item.name}</span>
                            {isMostSelling && (
                              <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full uppercase tracking-wide">🔥 Top</span>
                            )}
                            {isLeastSelling && (
                              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Least</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-gray-700">{item.qty}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-gray-900">{formatCurrency(item.revenue)}</td>
                        <td className="p-4 text-right text-gray-500 font-semibold text-sm">{pct}%</td>
                        <td className="p-4">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isMostSelling ? 'bg-orange-400' : 'bg-blue-400'}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
