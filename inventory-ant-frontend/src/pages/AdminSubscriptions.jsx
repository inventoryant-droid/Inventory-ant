import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminService } from '../services/adminService';
import { 
  CreditCard, Search, RefreshCw, Clock, ArrowUpRight, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../utils/config';
import { PageSkeleton, PageError, EmptyState, StatusBadge, SectionHeader } from '../components/ui/SharedUI';
import '../App.css';

export default function AdminSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState(null); // Detailed edit modal
  
  // Edit variables
  const [status, setStatus] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [graceEndsAt, setGraceEndsAt] = useState('');
  
  // Manual plan assignment states
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isPlanAssignOpen, setIsPlanAssignOpen] = useState(false);

  // 1. FETCH SUBSCRIPTIONS
  const { data: subscriptions, isLoading, error, refetch } = useQuery({
    queryKey: ['adminSubscriptionsList', search],
    queryFn: () => AdminService.getSubscriptions(search),
    staleTime: 10000,
  });

  // 2. FETCH PRICING PLANS
  const { data: plans } = useQuery({
    queryKey: ['plansList'],
    queryFn: () => fetch(`${API_BASE_URL}/api/subscription/plans`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('ant_token')}` }
    }).then(res => res.json()),
  });

  // 3. ASSIGN PLAN MUTATION
  const assignPlanMutation = useMutation({
    mutationFn: ({ subId, planId }) => AdminService.assignPlan(subId, planId),
    onSuccess: () => {
      toast.success('Subscription plan manually updated');
      setIsPlanAssignOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message)
  });

  // 4. MANAGE DATES & STATUS MUTATION
  const manageSubscriptionMutation = useMutation({
    mutationFn: ({ subId, fields }) => AdminService.manageSubscription(subId, fields),
    onSuccess: () => {
      toast.success('Subscription limits and dates overrides saved');
      setSelectedSub(null);
      refetch();
    },
    onError: (err) => toast.error(err.message)
  });

  const handleEditClick = (sub) => {
    setSelectedSub(sub);
    setStatus(sub.status || '');
    setExpiryDate(sub.expiryDate ? new Date(sub.expiryDate).toISOString().split('T')[0] : '');
    setTrialEndsAt(sub.trialEndsAt ? new Date(sub.trialEndsAt).toISOString().split('T')[0] : '');
    setGraceEndsAt(sub.graceEndsAt ? new Date(sub.graceEndsAt).toISOString().split('T')[0] : '');
  };

  const handleSaveSubDates = (e) => {
    e.preventDefault();
    const fields = {
      status,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : undefined,
      graceEndsAt: graceEndsAt ? new Date(graceEndsAt).toISOString() : undefined,
    };
    manageSubscriptionMutation.mutate({ subId: selectedSub.id, fields });
  };

  const handlePlanAssignSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlanId || !selectedSub) return;
    assignPlanMutation.mutate({ subId: selectedSub.id, planId: selectedPlanId });
  };

  if (isLoading) return <PageSkeleton rows={2} cols={3} />;
  if (error) return <PageError message="Could not load subscription overrides." onRetry={refetch} />;

  return (
    <div className="p-6 md:p-8 bg-slate-50 flex-1 overflow-y-auto space-y-6 text-left relative">
      
      {/* ─── OVERRIDE STATUS & DATES MODAL ─── */}
      {selectedSub && !isPlanAssignOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveSubDates} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">Override Dates & Status</h3>
            <span className="text-[10px] text-slate-400 font-mono block">Sub ID: #{selectedSub.id.slice(0, 8)}</span>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Subscription Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs">
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="grace">Grace Period</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Trial Ends At</label>
              <input type="date" value={trialEndsAt} onChange={e => setTrialEndsAt(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Grace Ends At</label>
              <input type="date" value={graceEndsAt} onChange={e => setGraceEndsAt(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setSelectedSub(null)} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer">Save Dates</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MANUAL PLAN ASSIGNMENT MODAL ─── */}
      {selectedSub && isPlanAssignOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePlanAssignSubmit} className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <h3 className="m-0 text-base font-extrabold text-slate-800">Manual Plan Override</h3>
            <span className="text-[10px] text-slate-400 font-mono block">Tenant: {selectedSub.userId}</span>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">Select SaaS Tier</label>
              <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} required className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none text-xs">
                <option value="">-- Select --</option>
                {plans?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setIsPlanAssignOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold border-none cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer">Override Plan</button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER */}
      <SectionHeader
        title="Subscription Overrides"
        subtitle="Manually upgrade plans, extend trial parameters, extend expirations and reset grace periods."
        icon={CreditCard}
        action={
          <button onClick={() => refetch()} aria-label="Refresh subscriptions" className="p-2 border rounded-xl hover:bg-slate-100 cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* Search Filter bar */}
      <div className="bg-white border rounded-2xl p-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search subscriptions by email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none text-sm"
          />
        </div>
        <button onClick={() => refetch()} className="p-2 border rounded-xl hover:bg-slate-50 cursor-pointer bg-white">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">Sub ID</th>
                <th className="p-4">Tenant Email</th>
                <th className="p-4">Active Plan</th>
                <th className="p-4">Cycle</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Expiry</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions?.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50 font-medium text-slate-700">
                  <td className="p-4 font-mono">#{sub.id.slice(0, 8)}</td>
                  <td className="p-4">{sub.userId}</td>
                  <td className="p-4 font-bold text-slate-800">{sub.plan?.name}</td>
                  <td className="p-4 capitalize">{sub.billingCycle}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono">{new Date(sub.expiryDate).toLocaleDateString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleEditClick(sub)}
                        className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold border-none cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Clock size={12} /> Override Dates
                      </button>
                      <button 
                        onClick={() => { setSelectedSub(sub); setIsPlanAssignOpen(true); }}
                        className="py-1 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <ArrowUpRight size={12} /> Shift Plan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
