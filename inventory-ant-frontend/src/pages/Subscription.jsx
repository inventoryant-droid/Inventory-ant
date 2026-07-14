import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';
import { 
  CreditCard, Calendar, RefreshCw, AlertTriangle, ShieldCheck, 
  Trash2, Play, ArrowUpRight, CheckCircle2, RefreshCcw, Info, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentHistory from './PaymentHistory';
import { FeatureDemoModal } from '../components/ui/FeatureDemoModal';
import { AllFeaturesComparisonModal } from '../components/ui/AllFeaturesComparisonModal';
import '../App.css';

export default function Subscription({ userRole, setView, userProfile }) {
  const queryClient = useQueryClient();
  const [activePreviewType, setActivePreviewType] = useState(null); // 'cancel' | 'resume'
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedDemoFeature, setSelectedDemoFeature] = useState(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // 1. DYNAMIC API QUERIES
  const { data: subData, isLoading: subLoading, error: subError, refetch: refetchSub } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: SubscriptionService.getCurrentSubscription,
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['userUsages'],
    queryFn: SubscriptionService.getUserUsages,
  });

  // 2. ACTION MUTATIONS
  const cancelMutation = useMutation({
    mutationFn: () => SubscriptionService.cancelSubscription(cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      toast.success('Subscription cancellation & refund requested successfully.');
      setActivePreviewType(null);
      setPreviewData(null);
      setCancelReason('');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to cancel subscription');
    }
  });

  const resumeMutation = useMutation({
    mutationFn: SubscriptionService.resumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      toast.success('Subscription renewal resumed successfully!');
      setActivePreviewType(null);
      setPreviewData(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to resume subscription');
    }
  });

  // Fetch cancel/resume previews before execution
  const handleLoadCancelPreview = async () => {
    setPreviewLoading(true);
    setActivePreviewType('cancel');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscription/cancel-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load cancel preview');
      setPreviewData(data);
    } catch (err) {
      toast.error(err.message);
      setActivePreviewType(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLoadResumePreview = async () => {
    setPreviewLoading(true);
    setActivePreviewType('resume');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscription/resume-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ant_token')}`,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load resume preview');
      setPreviewData(data);
    } catch (err) {
      toast.error(err.message);
      setActivePreviewType(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 3. SKELETON LOADER
  if (subLoading || usageLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-[#F8FAFC]">
        <div className="h-48 bg-white border border-slate-200 rounded-3xl" />
        <div className="h-64 bg-white border border-slate-200 rounded-3xl" />
      </div>
    );
  }

  // 4. ERROR STATES
  if (subError) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load subscription details</h2>
        <p className="text-slate-500 text-sm mt-2">Could not retrieve active plan data.</p>
        <button 
          onClick={() => refetchSub()}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const subscription = subData?.subscription;
  const plan = subData?.plan;
  const isActive = subData?.active;

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-6 text-left">
      
      {/* ─── DYNAMIC DIALOG PREVIEWS ─── */}
      <AnimatePresence>
        {activePreviewType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6">
              
              {activePreviewType === 'cancel' && (
                <div className="space-y-4">
                  <h3 className="m-0 text-lg font-black text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={20} /> Request Cancellation & Refund
                  </h3>
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                      <Loader2 className="animate-spin" size={18} /> Calculating cancellation values...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-500 text-sm m-0">
                        Please select a reason to cancel your premium subscription and request a full refund:
                      </p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Reason for Cancellation</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Too expensive / Not using it / Changing tools" 
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl outline-none text-sm text-slate-800 font-medium"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => { setActivePreviewType(null); setPreviewData(null); }}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                        >
                          Keep Subscription
                        </button>
                        <button 
                          onClick={() => cancelMutation.mutate()}
                          disabled={cancelMutation.isPending}
                          className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                        >
                          {cancelMutation.isPending && <Loader2 className="animate-spin" size={12} />}
                          Submit Refund Request
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activePreviewType === 'resume' && (
                <div className="space-y-4">
                  <h3 className="m-0 text-lg font-black text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 size={20} /> Resume Auto-Renewal
                  </h3>
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                      <Loader2 className="animate-spin" size={18} /> Gathering subscription details...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-slate-500 text-sm m-0">
                        Resuming auto-renewal guarantees uninterrupted warehouse operations. Your billing cycle details:
                      </p>
                      {previewData && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-800">
                          <div className="flex justify-between">
                            <span>Next Billing Date:</span>
                            <span className="font-bold">{new Date(previewData.nextBillingDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Renewal Amount:</span>
                            <span className="font-bold">₹{previewData.renewalAmount} {previewData.currency}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => { setActivePreviewType(null); setPreviewData(null); }}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => resumeMutation.mutate()}
                          disabled={resumeMutation.isPending}
                          className="flex-1 py-3 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                        >
                          {resumeMutation.isPending && <Loader2 className="animate-spin" size={12} />}
                          Confirm & Resume
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER TITLE */}
      <div>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight text-emerald-600">
          My Subscription
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1 m-0">
          Manage your active B2B warehouse tier, renewals, and features quotas.
        </p>
      </div>

      {/* ACTIVE PLAN PROFILE */}
      {isActive && subscription ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Subscription Main Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="m-0 text-xl font-black text-slate-800">{plan?.name || 'Standard Tier'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                      subscription.status === 'pending_refund' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-xs font-bold text-slate-500 capitalize">
                      {subscription.status === 'pending_refund' ? 'Refund Requested (Under Review)' : `${subscription.status} status`}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Plan Action Trigger Buttons */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {subscription.status === 'pending_refund' ? (
                  <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
                    <Info size={14} className="text-amber-500" /> Reviewing Refund Request
                  </span>
                ) : subscription.autoRenew ? (
                  <button 
                    onClick={handleLoadCancelPreview}
                    className="flex-1 sm:flex-initial py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 hover:border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> Cancel & Request Refund
                  </button>
                ) : (
                  <button 
                    onClick={handleLoadResumePreview}
                    className="flex-1 sm:flex-initial py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 hover:border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play size={14} /> Resume Auto-Renew
                  </button>
                )}
                <button 
                  onClick={() => setView('pricing')}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  Change Plan <ArrowUpRight size={14} />
                </button>
              </div>
            </div>

            {/* Plan Info Details list */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billing Frequency</span>
                <p className="m-0 text-sm font-black text-slate-800 capitalize">{subscription.billingCycle}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expiry/Renewal Date</span>
                <p className="m-0 text-sm font-black text-slate-800">{new Date(subscription.expiryDate).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subscription Price</span>
                <p className="m-0 text-sm font-black text-slate-800">₹{subscription.billingCycle === 'yearly' ? plan?.yearlyPrice : plan?.monthlyPrice} / cycle</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grace Expiry</span>
                <p className="m-0 text-sm font-black text-slate-800">
                  {subscription.graceEndsAt ? new Date(subscription.graceEndsAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Trial notification */}
            {subscription.status === 'trial' && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm">
                <Info size={18} className="shrink-0" />
                <span>You are currently on a free trial period. Your account will automatically transition to standard billing after the trial ends.</span>
              </div>
            )}
          </div>

          {/* Right Column: Limits summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100/60">
              <h4 className="m-0 text-slate-700 font-bold text-xs uppercase tracking-wider">Limits Summary</h4>
              <button
                onClick={() => setIsComparisonOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] px-2.5 py-1.5 rounded-xl font-bold uppercase border border-emerald-100/50 cursor-pointer transition-colors focus:outline-none flex items-center gap-1 shadow-sm"
              >
                All Features
              </button>
            </div>
            <div className="space-y-5">
              {usageData ? Object.entries(usageData).map(([key, usage]) => {
                const used = usage.used || 0;
                const limit = usage.limitValue;
                const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wide items-center">
                      <span className="flex items-center gap-2">
                        {key.replace('_', ' ')}
                        <button 
                          onClick={() => setSelectedDemoFeature(key)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer border border-emerald-100/50 transition-colors focus:outline-none"
                        >
                          Show Demo
                        </button>
                      </span>
                      <span>{limit === null ? `${used} / Unlimited` : `${used} / ${limit}`}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          limit && used >= limit ? 'bg-rose-500' : 'bg-emerald-500'
                        }`} 
                        style={{ width: `${limit === null ? 100 : pct}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="text-slate-400 text-center py-6">No usage data resolved.</div>
              )}
            </div>
          </div>

        </div>
      ) : (
        // Subscription Free tier state
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <CreditCard size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="m-0 text-xl font-black text-slate-800">Select a subscription plan</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
              Your warehouse is currently on the free trial plan. Upgrade your plan to get access to advanced stock forecasts, bulk import tool, and staff management features.
            </p>
          </div>
          <button 
            onClick={() => setView('pricing')}
            className="py-3 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            Upgrade Plan <ArrowUpRight size={16} />
          </button>
        </div>
      )}

      {/* Merged Billing Invoices / Payment History Section */}
      <div className="pt-8 border-t border-slate-200">
        <PaymentHistory userProfile={userProfile} isMerged={true} />
      </div>

      <FeatureDemoModal 
        featureId={selectedDemoFeature} 
        onClose={() => setSelectedDemoFeature(null)} 
      />
      <AllFeaturesComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </div>
  );
}
