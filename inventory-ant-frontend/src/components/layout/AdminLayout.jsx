import React, { useState } from 'react';
import { 
  Shield, LayoutDashboard, CreditCard, Users, Tag, 
  Settings as SettingsIcon, Activity, Menu, X, LogOut, 
  ChevronRight, UserCheck, BellRing, RefreshCw, Layers, Sparkles,
  FileText, Terminal, Database, Key, UserCog, BarChart3
} from 'lucide-react';
import '../../App.css';

export default function AdminLayout({ 
  children, 
  view, 
  setView, 
  userId, 
  onLogout 
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'admin_dashboard', label: 'Admin Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'admin_analytics', label: 'Business Analytics', icon: <BarChart3 size={18} /> },
    { id: 'admin_plans', label: 'Plan Management', icon: <Layers size={18} /> },
    { id: 'admin_features', label: 'Feature Matrix', icon: <Activity size={18} /> },
    { id: 'admin_coupons', label: 'Coupon Management', icon: <Tag size={18} /> },
    { id: 'admin_users', label: 'User Management', icon: <Users size={18} /> },
    { id: 'admin_admins', label: 'Admin Management', icon: <UserCog size={18} /> },
    { id: 'admin_subscriptions', label: 'Subscription Overrides', icon: <CreditCard size={18} /> },
    { id: 'admin_payments', label: 'Payment Gateway Logs', icon: <FileText size={18} /> },
    { id: 'admin_audits', label: 'Audit Logs Center', icon: <Database size={18} /> },
    { id: 'admin_flags', label: 'Rollout feature flags', icon: <UserCheck size={18} /> },
    { id: 'admin_ai', label: 'Cognitive parameters', icon: <Sparkles size={18} /> },
    { id: 'admin_system', label: 'System & Support', icon: <Terminal size={18} /> },
  ];

  // Resolve breadcrumb path dynamically
  const getBreadcrumb = () => {
    switch (view) {
      case 'admin_dashboard': return 'Dashboard';
      case 'admin_analytics': return 'Business Analytics';
      case 'admin_plans': return 'SaaS Pricing Plans';
      case 'admin_features': return 'Features & Matrix';
      case 'admin_coupons': return 'Discount Coupons';
      case 'admin_users': return 'B2B User Accounts';
      case 'admin_admins': return 'System Administrators';
      case 'admin_subscriptions': return 'Subscription Overrides';
      case 'admin_payments': return 'Payments Invoices logs';
      case 'admin_audits': return 'Audit Logs Center';
      case 'admin_flags': return 'Feature Flags Rollout';
      case 'admin_ai': return 'Gemini Model Configs';
      case 'admin_system': return 'System Tools & Support';
      default: return 'Overview';
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden bg-slate-100 font-sans" role="application">
      {/* Skip navigation */}
      <a href="#admin-main" className="skip-to-content">Skip to main content</a>
      
      {/* ─── MOBILE HEADER ─── */}
      <div className="md:hidden w-full bg-[#1e293b] text-white p-4 flex justify-between items-center shadow-md z-50 shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-indigo-400" />
          <span className="font-black text-sm tracking-wider uppercase">SaaS Control Hub</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-transparent border-none text-white cursor-pointer"
        >
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ─── ADMIN SIDEBAR ─── */}
      <div className={`fixed inset-y-0 left-0 transform ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-200 ease-in-out z-40 md:relative w-64 bg-[#0f172a] text-slate-300 flex flex-col p-5 justify-between shrink-0 shadow-lg`}>
        
        <div className="space-y-8">
          {/* Brand branding */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield size={22} />
            </div>
            <div className="text-left">
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block">Enterprise</span>
              <h2 className="m-0 text-sm font-black text-white uppercase tracking-wider">Admin Console</h2>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-3 justify-start ${
                  view === item.id || (view === 'admin_panel' && item.id === 'admin_dashboard')
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer profile & logout button */}
        <div className="border-t border-slate-800 pt-5 space-y-3">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs">
              AD
            </div>
            <div className="truncate flex-1">
              <span className="text-xs font-bold text-white block truncate">{userId}</span>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">System Operator</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 bg-[#ef4444]/10 hover:bg-[#ef4444] text-[#ef4444] hover:text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> Exit Console
          </button>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shrink-0 shadow-sm print:hidden">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Admin</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-800">{getBreadcrumb()}</span>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
              Primary Core Linked
            </span>
            <button
              onClick={onLogout}
              className="py-1.5 px-3 bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 text-red-700 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Pages Area */}
        <main
          id="admin-main"
          role="main"
          className="flex-1 overflow-y-auto min-h-0 flex flex-col page-enter"
          tabIndex={-1}
          aria-label="Admin Console Content"
        >
          {children}
        </main>
      </div>

    </div>
  );
}
