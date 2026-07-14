import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  Users, TrendingUp, ShieldAlert, Activity, ArrowUpRight, 
  Settings, RefreshCw, Layers, CheckCircle2, AlertTriangle, 
  XCircle, Zap, ShieldCheck, Mail, Database, HardDrive, Calendar
} from 'lucide-react';
import '../App.css';

export default function AdminDashboard({ setView }) {
  
  // 1. FETCH METRICS & HEALTH DATA
  const { data: adminData, isLoading: adminLoading, error: adminError, refetch: refetchAdmin } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: AdminService.getDashboardAnalytics,
    staleTime: 10000,
  });

  const { data: healthData, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: AdminService.getSystemHealth,
    staleTime: 15000,
  });

  // Recent Users for signups list
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsersList'],
    queryFn: () => AdminService.getUsers(),
    staleTime: 20000,
  });

  // Handle Refreshes
  const handleReload = () => {
    refetchAdmin();
    refetchHealth();
  };

  // 2. LOADING STATE (SKELETONS)
  if (adminLoading || healthLoading || usersLoading) {
    return (
      <div className="p-6 md:p-8 flex-1 overflow-y-auto bg-slate-50 space-y-6 animate-pulse text-left">
        <div className="h-10 bg-slate-200 rounded-lg w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

  // 3. ERROR RENDERING
  if (adminError || healthError) {
    return (
      <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center bg-slate-50 text-center min-h-[500px]">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Admin Dashboard load failed</h2>
        <p className="text-slate-500 text-sm mt-2">Could not authenticate or load SaaS metrics logs.</p>
        <button 
          onClick={handleReload}
          className="mt-6 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const metrics = adminData?.metrics || {};
  const topFeatures = adminData?.mostUsedFeatures || [];
  const aiUsage = adminData?.aiUsage || { aiChatCount: 0, voiceCount: 0, scanCount: 0 };
  const healthServices = healthData?.services || {};

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left">
      
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-xl md:text-2xl font-black text-slate-800">SaaS Node Overview</h2>
          <span className="text-xs text-slate-400 font-bold font-mono">Dynamic System Logs and User allocations</span>
        </div>
        <button 
          onClick={handleReload}
          className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-500 cursor-pointer transition-colors"
          title="Reload metrics"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div 
          onClick={() => setView('admin_users')}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total User Accounts</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{metrics.totalUsers}</h3>
            <span className="text-xs text-slate-500 mt-1 block">{metrics.activeUsers} active owners</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        {/* Financial MRR */}
        <div 
          onClick={() => setView('admin_analytics')}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Monthly Revenue (MRR)</span>
            <h3 className="text-2xl font-black text-indigo-600 mt-2 m-0">₹{metrics.mrr.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-1 block">ARR: ₹{metrics.arr.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Total Sales Paid */}
        <div 
          onClick={() => setView('admin_analytics')}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Sales Invoiced</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">₹{metrics.totalRevenue.toLocaleString()}</h3>
            <span className="text-xs text-[#0f9d63] font-bold mt-1 block">Completed payments</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-[#0f9d63] rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Expiring Reminders */}
        <div 
          onClick={() => setView('admin_subscriptions')}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start justify-between shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expiring in 7 Days</span>
            <h3 className="text-2xl font-black text-slate-800 mt-2 m-0">{metrics.expiringSubscriptions}</h3>
            <span className="text-xs text-slate-500 mt-1 block">{metrics.trialUsers} free trial members</span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity size={20} />
          </div>
        </div>

      </div>

      {/* PLAN TIER ALLOCATIONS BADGES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h4 className="m-0 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider mb-3">Subscription Tier Distributions</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(adminData?.planDistributions || []).map(dist => (
            <div 
              key={dist.id}
              onClick={() => {
                localStorage.setItem('admin_users_plan_filter', dist.slug);
                setView('admin_users');
              }}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border hover:border-indigo-300 rounded-xl cursor-pointer transition-all"
            >
              <span className="text-[9px] uppercase font-bold text-slate-400 block">{dist.name}</span>
              <span className="text-lg font-black text-slate-800 mt-1">{dist.count} users</span>
            </div>
          ))}
          {(!adminData?.planDistributions || adminData.planDistributions.length === 0) && (
            <div className="text-slate-400 text-xs py-4 col-span-4 text-center">No active pricing plans found.</div>
          )}
        </div>
      </div>

      {/* SYSTEM HEALTH DIAGNOSTICS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <ShieldCheck className="text-indigo-600" size={18} /> System Diagnostics Node
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'database', label: 'Prisma DB', icon: <Database size={16} />, data: healthServices.database, targetView: 'admin_system' },
            { id: 'payment', label: 'Razorpay POS', icon: <TrendingUp size={16} />, data: healthServices.payment, targetView: 'admin_payments' },
            { id: 'subscription', label: 'SaaS Engine', icon: <Layers size={16} />, data: healthServices.subscription, targetView: 'admin_subscriptions' },
            { id: 'ai', label: 'Gemini AI Hub', icon: <Zap size={16} />, data: healthServices.ai, targetView: 'admin_ai' },
            { id: 'email', label: 'Brevo Mailer', icon: <Mail size={16} />, data: healthServices.email, targetView: 'admin_system' },
            { id: 'storage', label: 'File Drive', icon: <HardDrive size={16} />, data: healthServices.storage, targetView: 'admin_system' },
          ].map(service => {
            const isUp = service.data?.status === 'UP';
            return (
              <div 
                key={service.id} 
                onClick={() => setView(service.targetView)}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2 cursor-pointer hover:shadow-md transition-all ${
                  isUp 
                    ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300 text-emerald-800' 
                    : 'bg-rose-50/20 border-rose-200 hover:border-rose-300 text-rose-800'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {service.icon}
                </div>
                <span className="font-bold text-xs block">{service.label}</span>
                <span className="text-[9px] uppercase font-black tracking-widest">{service.data?.status || 'DOWN'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOWER GRID: RECENT SIGNUPS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Signups list */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="m-0 text-base font-extrabold text-slate-800 mb-5 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" /> Recent Signups (Audits)
          </h3>

          <div className="divide-y divide-slate-100">
            {usersData && usersData.slice(0, 5).map((user) => (
              <div key={user.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 block text-sm">{user.name}</span>
                  <span className="text-slate-400 block">{user.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase block w-fit ml-auto">
                    {user.plan || 'Free'}
                  </span>
                  <span className="text-slate-400 text-[10px] mt-1 block">Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {(!usersData || usersData.length === 0) && (
              <div className="text-slate-400 text-center py-6">No signup records resolved.</div>
            )}
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="m-0 text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Settings size={18} className="text-indigo-600" /> Administrative Operations
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            <button 
              onClick={() => setView('admin_subscriptions')}
              className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2"><Layers size={16} className="text-indigo-600" /> Subscription Override</span>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>

            <button 
              onClick={() => setView('admin_flags')}
              className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2"><Zap size={16} className="text-indigo-600" /> Feature Flags</span>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>

            <button 
              onClick={() => setView('admin_users')}
              className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2"><Users size={16} className="text-indigo-600" /> View Users list</span>
              <ArrowUpRight size={14} className="text-slate-400" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
