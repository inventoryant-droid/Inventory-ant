import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';
import { InventoryService } from '../services/inventoryService';
import { 
  Box, AlertTriangle, Layers, Shield, Calendar, ArrowUpRight, 
  PlusCircle, UserPlus, FileText, Scan, History, RefreshCw, 
  Zap, ChevronRight, XCircle, CheckCircle, Info, Loader2 
} from 'lucide-react';
import '../App.css';

const parseQty = (qty) => {
  if (!qty) return 0;
  const clean = String(qty).replace(/,/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export default function Dashboard({ 
  products, 
  userId, 
  onAlertClick, 
  onTotalClick, 
  onOpenScanner, 
  onGoToProfile, 
  onGoToSettings, 
  userProfile, 
  userRole, 
  setView, 
  setInventoryFilter 
}) {
  
  // 1. REACT QUERY CLIENT SERVER STATES
  const { 
    data: subData, 
    isLoading: subLoading, 
    error: subError, 
    refetch: refetchSub 
  } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: SubscriptionService.getCurrentSubscription,
    staleTime: 30000,
  });

  const { 
    data: usageData, 
    isLoading: usageLoading, 
    error: usageError, 
    refetch: refetchUsage 
  } = useQuery({
    queryKey: ['userUsages'],
    queryFn: SubscriptionService.getUserUsages,
    staleTime: 10000,
  });

  const { 
    data: historyData, 
    isLoading: historyLoading, 
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['recentHistory'],
    queryFn: InventoryService.getHistory,
    staleTime: 15000,
  });

  // Calculate local client states based on products prop (which is reactive)
  const threshold = userProfile?.lowStockThreshold ?? 20;

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const q = parseQty(p.quantity);
      return q > 0 && q <= threshold;
    }).length;
  }, [products, threshold]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => parseQty(p.quantity) === 0).length;
  }, [products]);

  const totalStock = useMemo(() => {
    return products.reduce((acc, p) => acc + parseQty(p.quantity), 0);
  }, [products]);

  // Subscription calculation helpers
  const subscription = subData?.subscription;
  const plan = subData?.plan;
  const isActive = subData?.active;

  const daysRemaining = useMemo(() => {
    if (!subscription?.expiryDate) return null;
    const diff = new Date(subscription.expiryDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [subscription]);

  // Handle generic retry
  const handleRetry = () => {
    refetchSub();
    refetchUsage();
    refetchHistory();
  };

  // 2. LOADING STATE (SKELETONS)
  if (subLoading || usageLoading || historyLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-[#F8FAFC]">
        {/* Welcome Banner Skeleton */}
        <div className="h-32 bg-white border border-slate-200 rounded-3xl" />
        
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl" />
          ))}
        </div>

        {/* Dynamic Widgets Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-white border border-slate-100 rounded-2xl" />
            <div className="h-80 bg-white border border-slate-100 rounded-2xl" />
          </div>
          <div className="h-96 bg-white border border-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // 3. ERROR STATE
  if (subError || usageError || historyError) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Failed to load Dashboard data</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md">
          There was an error communicating with the server. Please check your connection and try again.
        </p>
        <button 
          onClick={handleRetry}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry loading
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 bg-[#F8FAFC]">
      
      {/* ─── WELCOME BANNER ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] transition-all">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left flex-1 min-w-0 w-full">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
            <Shield size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div className="flex-1 min-w-0 w-full text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#0f9d63]">
                {userRole === 'staff' ? `Staff Node • ${userProfile?.businessName || 'Warehouse'}` : 'Warehouse Active'}
              </span>
              {plan && (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {plan.name} Plan
                </span>
              )}
            </div>
            <h2 className="m-0 text-lg sm:text-xl md:text-2xl font-black text-slate-800 mt-1 leading-tight whitespace-normal">
              {userRole === 'staff' ? `Welcome, ${userProfile?.name || 'Staff'}!` : `Welcome back, ${userProfile?.businessName || 'Business Partner'}!`}
            </h2>
          </div>
        </div>
        
        {userRole !== 'staff' && (
          <button 
            onClick={onGoToProfile}
            className="py-2.5 px-5 bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* ─── LIMIT WARNING CARDS ─── */}
      {usageData?.INVENTORY && usageData.INVENTORY.limitValue && (usageData.INVENTORY.used / usageData.INVENTORY.limitValue) >= 0.8 && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
          usageData.INVENTORY.used >= usageData.INVENTORY.limitValue 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div className="text-left text-xs sm:text-sm">
            <span className="font-bold uppercase tracking-wider block text-[10px] mb-1">
              {usageData.INVENTORY.used >= usageData.INVENTORY.limitValue ? 'Limit Reached' : 'Entitlement Alert'}
            </span>
            You have used {usageData.INVENTORY.used} of your {usageData.INVENTORY.limitValue} SKU capacity limit. 
            {userRole !== 'staff' && (
              <button 
                onClick={() => setView('settings')}
                className="ml-2 font-bold underline hover:text-opacity-80 border-none bg-transparent cursor-pointer"
              >
                Upgrade Plan ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── QUICK STATISTICS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow" 
          onClick={onTotalClick}
        >
          <div className="flex flex-col text-left">
            <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Total SKU Inventory</h3>
            <p className="text-3xl my-2 font-extrabold text-slate-800">{products.length}</p>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
              View catalog ➔
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Box size={22} strokeWidth={2} />
          </div>
        </div>

        <div 
          className={`bg-white border ${lowStockCount > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'} rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow`} 
          onClick={() => onAlertClick('lowStock')}
        >
          <div className="flex flex-col text-left">
            <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Low Stock items</h3>
            <p className="text-3xl my-2 font-extrabold text-slate-800">{lowStockCount}</p>
            <span className="text-xs text-slate-500 font-medium">
              Below threshold ({threshold})
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl shrink-0 ${lowStockCount > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center`}>
            <AlertTriangle size={22} strokeWidth={2} />
          </div>
        </div>

        <div 
          className={`bg-white border ${outOfStockCount > 0 ? 'border-red-200 bg-rose-50/10' : 'border-slate-100'} rounded-2xl p-6 flex items-start justify-between cursor-pointer hover:shadow-md transition-shadow`} 
          onClick={() => onAlertClick('outOfStock')}
        >
          <div className="flex flex-col text-left">
            <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Out of Stock</h3>
            <p className="text-3xl my-2 font-extrabold text-slate-800">{outOfStockCount}</p>
            <span className="text-xs text-slate-500 font-medium font-sans">
              Critical replenishment
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl shrink-0 ${outOfStockCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'} flex items-center justify-center`}>
            <XCircle size={22} strokeWidth={2} />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-start justify-between">
          <div className="flex flex-col text-left">
            <h3 className="text-slate-400 m-0 uppercase text-[10px] tracking-wider font-bold">Total Stock Sum</h3>
            <p className="text-3xl my-2 font-extrabold text-slate-800">{totalStock}</p>
            <span className="text-xs text-slate-500 font-medium">
              Physical inventory items
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Layers size={22} strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC SUBSCRIPTION & USAGE PANELS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* USAGE SUMMARY WIDGET */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-800 m-0 font-extrabold text-base flex items-center gap-2">
                <Zap className="text-emerald-500" size={18} /> Plan Usage quotas
              </h3>
              <button 
                onClick={() => refetchUsage()}
                className="p-1 hover:bg-slate-100 rounded border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                title="Reload Usages"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-5">
              {usageData ? Object.entries(usageData).map(([key, usage]) => {
                const used = usage.used || 0;
                const limit = usage.limitValue;
                const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wide">
                      <span>{key.replace('_', ' ')}</span>
                      <span>{limit === null ? `${used} / Unlimited` : `${used} / ${limit}`}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          limit && used >= limit 
                            ? 'bg-rose-500' 
                            : pct >= 80 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${limit === null ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="text-slate-400 text-sm py-4">No usage stats loaded</div>
              )}
            </div>
          </div>

          {/* RECENT TRANSACTIONS PANEL */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-800 m-0 font-extrabold text-base flex items-center gap-2">
                <History className="text-emerald-500" size={18} /> Recent Activities
              </h3>
              <button 
                onClick={() => refetchHistory()}
                className="text-xs font-bold text-emerald-600 hover:underline border-none bg-transparent cursor-pointer flex items-center gap-0.5"
              >
                View all logs <ChevronRight size={14} />
              </button>
            </div>

            <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
              {historyData && historyData.slice(0, 5).map((log, idx) => (
                <div key={log.id || idx} className="relative">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                    log.actionType === 'STOCK_IN' 
                      ? 'bg-emerald-500' 
                      : log.actionType === 'STOCK_OUT' 
                        ? 'bg-rose-500' 
                        : 'bg-indigo-500'
                  }`} />
                  
                  <div className="text-xs text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">
                    {log.productName} ({log.productId})
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Action: <strong>{log.actionType}</strong> • Operator: {log.operatorName} • Details: {log.details}
                  </div>
                </div>
              ))}

              {(!historyData || historyData.length === 0) && (
                <div className="text-slate-400 text-sm py-4 -ml-4">No recent history events found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="space-y-6 text-left">
          
          {/* SUBSCRIPTION SUMMARY CARD */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-slate-800 m-0 font-extrabold text-base flex items-center gap-2 mb-4">
              <Calendar className="text-emerald-500" size={18} /> SaaS Subscription
            </h3>

            {isActive && subscription ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Plan</div>
                  <div className="text-lg font-black text-slate-800 mt-0.5">{plan?.name || 'Standard Tier'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs font-bold text-slate-600 capitalize">{subscription.status} status</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Cycle:</span>
                    <span className="font-bold text-slate-800 capitalize">{subscription.billingCycle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Renews/Expires:</span>
                    <span className="font-bold text-slate-800">{new Date(subscription.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Auto Renew:</span>
                    <span className={`font-bold ${subscription.autoRenew ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* RENEWAL COUNTDOWN */}
                {daysRemaining !== null && daysRemaining <= 15 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2 text-amber-800 text-xs">
                    <Info size={14} className="shrink-0" />
                    <span>Your plan expires in <strong>{daysRemaining} days</strong>. Enable auto-renew or upgrade to keep operations live.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <p className="text-sm">No active SaaS subscription configured.</p>
                {userRole !== 'staff' && (
                  <button 
                    onClick={() => setView('settings')}
                    className="mt-3 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold border-none cursor-pointer transition-colors"
                  >
                    Select Plan
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QUICK ACTIONS PANEL */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-slate-800 m-0 font-extrabold text-base flex items-center gap-2 mb-4">
              <PlusCircle className="text-emerald-500" size={18} /> Quick Operations
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <button 
                onClick={() => setView('billing')}
                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><FileText size={16} className="text-emerald-600" /> Create Sale Invoice</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </button>

              <button 
                onClick={() => { setView('inventory'); setInventoryFilter('all'); }}
                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Box size={16} className="text-emerald-600" /> Add Product SKU</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </button>

              <button 
                onClick={() => setView('ai_lab')}
                className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Scan size={16} className="text-emerald-600" /> Smart Scanner uploads</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </button>

              {userRole !== 'staff' && (
                <button 
                  onClick={() => setView('staff_management')}
                  className="py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><UserPlus size={16} className="text-emerald-600" /> Manage Team staff</span>
                  <ArrowUpRight size={14} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
