import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsService } from '../services/analyticsService';
import { 
  TrendingUp, AlertTriangle, Layers, DollarSign, PieChart as PieIcon, 
  BarChart2, Activity, Calendar, ShieldCheck, RefreshCw, Box
} from 'lucide-react';
import '../App.css';

export default function Analytics({ products }) {
  const [dateFilter, setDateFilter] = useState('30days'); // '1day' | '7days' | '30days'

  // Fetch B2B dynamic analytics from backend
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['analyticsData', dateFilter],
    queryFn: () => AnalyticsService.getAnalytics(dateFilter),
    staleTime: 30000,
  });

  // Calculate local product details
  const totalSkus = products.length;
  const outOfStock = products.filter(p => parseInt(p.quantity || '0', 10) === 0).length;
  const lowStock = products.filter(p => {
    const q = parseInt(p.quantity || '0', 10);
    return q > 0 && q <= 20; // default threshold
  }).length;

  // Calculate total inventory valuation
  const inventoryValuation = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = parseInt(p.quantity || '0', 10);
      const cp = parseFloat(p.costPrice || p.mrp || '0');
      return sum + (isNaN(qty) || isNaN(cp) ? 0 : qty * cp);
    }, 0);
  }, [products]);

  // Compute category/quantity distribution for Ring Chart
  const categoryStats = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const cat = p.paket || 'General';
      counts[cat] = (counts[cat] || 0) + parseInt(p.quantity || '0', 10);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5 categories
  }, [products]);

  // SVG Chart Calculation Helpers
  const maxRevenue = useMemo(() => {
    if (!analyticsData?.monthlyRevenue || analyticsData.monthlyRevenue.length === 0) return 1000;
    return Math.max(...analyticsData.monthlyRevenue.map(d => Math.max(d.revenue, d.profit))) * 1.15;
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-[#F8FAFC]">
        <div className="h-10 bg-slate-200 rounded-lg w-48 text-left" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white border border-slate-200 rounded-2xl" />
          <div className="h-96 bg-white border border-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load analytics dashboard</h2>
        <p className="text-slate-500 text-sm mt-2">Could not compute SaaS metrics reports.</p>
        <button 
          onClick={() => refetch()}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry Reports
        </button>
      </div>
    );
  }

  const sales = analyticsData?.sales || { totalOrders: 0, totalRevenue: 0, totalProfit: 0, totalLoss: 0 };
  const aiUsage = analyticsData?.aiUsage || { aiChat: 0, voiceAssistant: 0, smartScan: 0 };
  const monthlyRevenue = analyticsData?.monthlyRevenue || [];

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-6 text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
            Business Intelligence
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 m-0">
            Real-time warehouse audit metrics, profit margins, and AI utilities usage.
          </p>
        </div>

        {/* TIME FILTERS */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {['1day', '7days', '30days'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                dateFilter === filter 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {filter === '1day' ? 'Today' : filter === '7days' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Sales Revenue</span>
            <h3 className="text-3xl font-black text-slate-800 mt-2 m-0">₹{sales.totalRevenue.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-1 block">{sales.totalOrders} total sales receipts</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Profit margin</span>
            <h3 className="text-3xl font-black text-[#0f9d63] mt-2 m-0">₹{sales.totalProfit.toLocaleString()}</h3>
            <span className="text-xs text-emerald-600 font-semibold mt-1 block">Margin stable</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-[#0f9d63] rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inventory Valuation</span>
            <h3 className="text-3xl font-black text-slate-800 mt-2 m-0">₹{inventoryValuation.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-1 block">{totalSkus} SKUs in stock</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Box size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Warehouse Health</span>
            <h3 className="text-3xl font-black text-slate-800 mt-2 m-0">
              {outOfStock > 0 ? `${outOfStock} Alerts` : 'Perfect'}
            </h3>
            <span className="text-xs text-slate-500 mt-1 block">{lowStock} Low stock items</span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${outOfStock > 0 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MONTHLY TRENDS AREA CHART */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <h3 className="text-slate-800 font-extrabold text-base mb-6 flex items-center gap-2 m-0">
            <BarChart2 className="text-emerald-500" size={18} /> Sales & Profit Monthly Trends
          </h3>

          <div className="w-full h-64 relative mt-4">
            {/* SVG Plotting */}
            {monthlyRevenue.length > 0 ? (
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Gradients */}
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="#F1F5F9" strokeWidth="0.5" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#F1F5F9" strokeWidth="0.5" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#F1F5F9" strokeWidth="0.5" />

                {/* Paths */}
                {/* Revenue area */}
                <path
                  d={`M 0 200 ` + monthlyRevenue.map((d, i) => {
                    const x = (i / (monthlyRevenue.length - 1)) * 500;
                    const y = 200 - (d.revenue / maxRevenue) * 150;
                    return `L ${x} ${y}`;
                  }).join(' ') + ` L 500 200 Z`}
                  fill="url(#revenueGrad)"
                />
                <path
                  d={monthlyRevenue.map((d, i) => {
                    const x = (i / (monthlyRevenue.length - 1)) * 500;
                    const y = 200 - (d.revenue / maxRevenue) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />

                {/* Profit area */}
                <path
                  d={`M 0 200 ` + monthlyRevenue.map((d, i) => {
                    const x = (i / (monthlyRevenue.length - 1)) * 500;
                    const y = 200 - (d.profit / maxRevenue) * 150;
                    return `L ${x} ${y}`;
                  }).join(' ') + ` L 500 200 Z`}
                  fill="url(#profitGrad)"
                />
                <path
                  d={monthlyRevenue.map((d, i) => {
                    const x = (i / (monthlyRevenue.length - 1)) * 500;
                    const y = 200 - (d.profit / maxRevenue) * 150;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                No monthly transactions to plot.
              </div>
            )}
          </div>

          {/* Labels & Legends */}
          <div className="flex justify-between items-center mt-4 text-[10px] text-slate-400 font-mono">
            {monthlyRevenue.map((d, idx) => (
              <span key={idx}>{d.month}</span>
            ))}
          </div>
          <div className="flex gap-4 justify-center items-center mt-6 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 bg-emerald-500 rounded" /> Revenue
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 border-t-2 border-dashed border-blue-500 inline-block" /> Profit Margins
            </div>
          </div>
        </div>

        {/* INVENTORY / CATEGORY DISTRIBUTION RING CHART */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-slate-800 font-extrabold text-base mb-6 flex items-center gap-2 m-0">
              <PieIcon className="text-emerald-500" size={18} /> Stock Category distribution
            </h3>
            
            {categoryStats.length > 0 ? (
              <div className="flex justify-center py-4 relative">
                {/* SVG Ring Chart */}
                <svg width="140" height="140" viewBox="0 0 42 42" className="transform -rotate-90">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4" />
                  {/* Plot segments */}
                  {(() => {
                    const totalQty = categoryStats.reduce((sum, item) => sum + item.value, 0);
                    let accumulatedPercent = 0;
                    const colors = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#EF4444'];
                    
                    return categoryStats.map((item, idx) => {
                      const pct = totalQty > 0 ? (item.value / totalQty) * 100 : 0;
                      const strokeDasharray = `${pct} ${100 - pct}`;
                      const strokeDashoffset = 100 - accumulatedPercent + 25; // 25 to start at top
                      accumulatedPercent += pct;
                      return (
                        <circle
                          key={idx}
                          cx="21"
                          cy="21"
                          r="15.915"
                          fill="transparent"
                          stroke={colors[idx % colors.length]}
                          strokeWidth="4"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        />
                      );
                    });
                  })()}
                </svg>
                {/* Center count */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800">{categoryStats.length}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Categories</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">No categories to display.</div>
            )}
          </div>

          {/* List display */}
          <div className="space-y-2 mt-4 text-xs font-medium text-slate-600">
            {categoryStats.map((item, idx) => {
              const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500'];
              return (
                <div key={idx} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                    {item.name}
                  </span>
                  <span className="font-bold text-slate-800">{item.value} units</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI USAGE METRICS SUMMARY */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <h3 className="text-slate-800 font-extrabold text-base mb-6 flex items-center gap-2 m-0">
          <Activity className="text-emerald-500" size={18} /> B2B Cognitive Engines Usage
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Chat sessions</span>
            <span className="text-2xl font-black text-slate-800 mt-1">{aiUsage.aiChat} prompts</span>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (aiUsage.aiChat / 20) * 100)}%` }} />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hinglish Voice Commands</span>
            <span className="text-2xl font-black text-slate-800 mt-1">{aiUsage.voiceAssistant} queries</span>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (aiUsage.voiceAssistant / 20) * 100)}%` }} />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Smart Invoices Processed</span>
            <span className="text-2xl font-black text-slate-800 mt-1">{aiUsage.smartScan} scanned</span>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (aiUsage.smartScan / 10) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
