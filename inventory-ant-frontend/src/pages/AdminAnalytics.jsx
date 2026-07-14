import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  BarChart3, TrendingUp, Users, Layers, Activity, ShieldAlert, 
  DollarSign, AlertCircle, Calendar, Zap, Clock, ArrowUpRight, 
  UserX, ShieldCheck, Mail, Database, HardDrive, RefreshCw
} from 'lucide-react';
import { PageSkeleton, PageError, EmptyState, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminAnalytics() {
  
  // 1. FETCH ADVANCED ANALYTICS
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['adminBusinessAnalytics'],
    queryFn: AdminService.getBusinessAnalytics,
    staleTime: 15000,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: AdminService.getDashboardAnalytics,
    staleTime: 15000,
  });

  if (isLoading) return <PageSkeleton rows={2} cols={3} />;
  if (error) return <PageError message="Could not load business intelligence logs." onRetry={refetch} />;

  const data = analytics || {};
  const metrics = dashboardData?.metrics || {};
  const aiUsage = dashboardData?.aiUsage || { aiChatCount: 0, voiceCount: 0, scanCount: 0 };

  // Calculate SaaS growth KPIs
  const totalB2bUsers = metrics.totalUsers || 0;
  const activeB2bUsers = metrics.activeUsers || 0;
  const freeUsers = metrics.freeUsers || 0;
  
  // Conversion Rate (Non-free plan B2B users / total B2b users)
  const conversionRate = totalB2bUsers > 0 
    ? Math.round(((totalB2bUsers - freeUsers) / totalB2bUsers) * 100) 
    : 0;

  // Average Revenue Per User (MRR / active B2B owners)
  const arpu = activeB2bUsers > 0 
    ? Math.round(metrics.mrr / activeB2bUsers) 
    : 0;

  // Maximum value for login hours heatmap scaling
  const maxLogins = data.hourlyDistribution ? Math.max(...data.hourlyDistribution, 1) : 1;

  // Maximum value for log event distribution scaling
  const totalEvents = data.logDistribution 
    ? Object.values(data.logDistribution).reduce((a, b) => a + b, 0) 
    : 0;

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* HEADER CONTROLS */}
      <SectionHeader
        title="Business Intelligence & Telemetry"
        subtitle="Analyze platform transaction volume (GMV), staff account penetration, AI command usage, and B2B subscription conversion rates."
        icon={BarChart3}
        action={
          <button 
            onClick={() => refetch()} 
            aria-label="Refresh intelligence data" 
            className="p-2 border rounded-xl bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* ─── ROW 1: FINANCIAL & GROWTH ADVANCED KPIS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* GMV (Invoiced Sales) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Merchandise Value (GMV)</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">₹{data.gmv?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Total customer invoice value platform-wide</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        {/* ARPU */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Revenue Per User (ARPU)</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">₹{arpu.toLocaleString()}/mo</h3>
            <span className="text-xs text-indigo-600 font-bold mt-1 block">SaaS active MRR split per owner</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* SaaS Plan Conversion Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Free-To-Paid Conversion</span>
            <h3 className="text-2xl font-black text-indigo-600 mt-2 m-0">{conversionRate}%</h3>
            <span className="text-xs text-slate-500 mt-1 block">Percentage of users on premium tiers</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        {/* Churn Expirations Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">30-Day Churn Risk List</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{data.churnRiskList?.length || 0}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Subscriptions expiring in next 30 days</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <UserX size={20} />
          </div>
        </div>

      </div>

      {/* ─── ROW 2: PLATFORM OPERATIONS & DEPTH ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Products Registered</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{data.totalProducts}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Avg products per warehouse: <strong>{Math.round(data.averageProductsPerWarehouse || 0)}</strong></span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
        </div>

        {/* Low Stock Indicators */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Low Stock Warnings</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{data.lowStockCount}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Products below stock threshold &lt; 20</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
        </div>

        {/* Total Staff Accounts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Staff Sub-Accounts</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{data.totalStaff}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Staff penetration: <strong>{data.staffPenetration?.toFixed(1) || '0.0'}</strong> staff per owner</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        {/* AI usages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Cognitive AI Calls</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-2 m-0">{(aiUsage.aiChatCount + aiUsage.voiceCount + aiUsage.scanCount).toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-1 block">Smart scanner, OCR & voice assistants</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
        </div>

      </div>

      {/* ─── ROW 3: CHARTS AND HEATMAPS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Peak Activity Hours (HEATMAP simulation using CSS bars) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="text-indigo-600" size={18} /> User Login Peak Hours (Heatmap)
            </h3>
            <p className="text-slate-500 text-xs mt-1 mb-6">Distribution of system logins across a 24-hour cycle. Helps optimize server loading times.</p>
          </div>

          <div className="flex items-end justify-between h-44 gap-1.5 pt-4">
            {data.hourlyDistribution?.map((val, hour) => {
              const heightPct = Math.round((val / maxLogins) * 100);
              return (
                <div key={hour} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow">
                    {val} logins at {hour}:00
                  </div>
                  {/* Heatmap Bar */}
                  <div 
                    className="w-full rounded-t-md transition-all duration-300 bg-indigo-600/30 group-hover:bg-indigo-600" 
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  {/* Axis label */}
                  <span className="text-[8px] text-slate-400 font-mono mt-2 block">
                    {hour === 0 ? '12A' : hour === 12 ? '12P' : hour % 12}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Logs Event Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Activity className="text-indigo-600" size={18} /> Inventory Operations Distribution
            </h3>
            <p className="text-slate-500 text-xs mt-1 mb-4">Breakdown of the last 100 database transactions and stock history updates.</p>
          </div>

          <div className="space-y-3.5">
            {data.logDistribution && Object.entries(data.logDistribution).map(([action, count]) => {
              const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
              return (
                <div key={action} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span className="uppercase text-[10px] tracking-wider">{action.replace('_', ' ')}</span>
                    <span>{count} logs ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        action.startsWith('STOCK_IN') 
                          ? 'bg-emerald-500' 
                          : action.startsWith('STOCK_OUT') 
                            ? 'bg-amber-500' 
                            : action === 'DELETE' 
                              ? 'bg-rose-500' 
                              : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {totalEvents === 0 && (
              <div className="text-slate-400 text-center py-6 text-xs">No transaction logs available.</div>
            )}
          </div>
        </div>

      </div>

      {/* ─── CHURN AND EXPIRATION ALERTS TABLE ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2">
            <UserX className="text-indigo-600" size={18} /> Plan Expiry & Churn Threat Assessment
          </h3>
          <p className="text-slate-500 text-xs mt-1 mb-4">Monitor active premium B2B warehouse accounts expiring within the next 30 days. Auto-renew disabled represents immediate churn risk.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Owner Name</th>
                <th className="p-4">Business</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Subscription Plan</th>
                <th className="p-4 text-center">Expiry Date</th>
                <th className="p-4 text-center">Days Left</th>
                <th className="p-4 text-center">Auto-Renew</th>
                <th className="p-4 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.churnRiskList?.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 font-medium text-slate-700">
                  <td className="p-4 font-bold text-slate-800">{item.userName}</td>
                  <td className="p-4 text-slate-600">{item.businessName}</td>
                  <td className="p-4 text-slate-500">{item.userEmail}</td>
                  <td className="p-4 uppercase text-[10px] font-black">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{item.planName}</span>
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-center">{new Date(item.expiryDate).toLocaleDateString()}</td>
                  <td className="p-4 text-center font-bold">
                    <span className={item.daysRemaining <= 7 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}>
                      {item.daysRemaining} days
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.autoRenew ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {item.autoRenew ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.daysRemaining <= 7 && !item.autoRenew 
                        ? 'bg-rose-100 text-rose-800 font-extrabold animate-pulse' 
                        : item.daysRemaining <= 15
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.daysRemaining <= 7 && !item.autoRenew 
                        ? 'CRITICAL CHURN' 
                        : item.daysRemaining <= 15
                          ? 'Medium Risk'
                          : 'Low Risk'
                      }
                    </span>
                  </td>
                </tr>
              ))}
              {(!data.churnRiskList || data.churnRiskList.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-8 text-slate-400 text-center">
                    No users are currently at risk of expiring in the next 30 days. All subscriptions stable!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
