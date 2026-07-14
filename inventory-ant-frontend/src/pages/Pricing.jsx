import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';
import { PaymentService } from '../services/paymentService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Check, X, Tag as TagIcon, Loader2, AlertTriangle, 
  TrendingUp, Sparkles, ShieldCheck, ArrowRight, Percent, RefreshCw
} from 'lucide-react';
import '../App.css';

export default function Pricing({ userId, userRole, setView }) {
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  
  // Checkout & polling states
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState(null);

  // 1. DYNAMIC API QUERIES
  const { data: currentSubData, isLoading: subLoading } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: SubscriptionService.getCurrentSubscription,
  });

  const { data: plansData, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: SubscriptionService.getPlans,
  });

  const { data: compareMatrix, isLoading: compareLoading } = useQuery({
    queryKey: ['plansCompare'],
    queryFn: SubscriptionService.getPlansCompare,
  });

  // Load Razorpay script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 2. COUPON CODE VALIDATION MUTATION
  const couponMutation = useMutation({
    mutationFn: ({ planId, code }) => SubscriptionService.applyCoupon(planId, billingCycle, code),
    onSuccess: (data) => {
      setAppliedCoupon(data);
      setCouponError('');
      toast.success('Coupon applied successfully!');
    },
    onError: (err) => {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
      toast.error(err.message || 'Invalid coupon code');
    }
  });

  const handleApplyCoupon = (planId) => {
    if (!couponCode.trim()) return;
    couponMutation.mutate({ planId, code: couponCode.trim().toUpperCase() });
  };

  // 3. AUTO POLLING WEBHOOK SUCCESS HANDLER
  const pollSubscriptionUpdated = async (targetSlug, maxRetries = 10) => {
    let retries = 0;
    setCheckoutMessage('Verifying payment details with banking gateway...');

    const interval = setInterval(async () => {
      retries++;
      try {
        const freshSub = await SubscriptionService.getCurrentSubscription();
        if (freshSub?.subscription?.plan?.slug === targetSlug || freshSub?.plan?.slug === targetSlug) {
          clearInterval(interval);
          setIsCheckoutProcessing(false);
          setActiveCheckoutPlan(null);
          setCouponCode('');
          setAppliedCoupon(null);
          queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
          queryClient.invalidateQueries({ queryKey: ['userUsages'] });
          toast.success('Subscription upgraded successfully! Welcome to premium tier.', { duration: 6000 });
          setView('dashboard');
          return;
        }
      } catch (e) {
        console.error('Polling check failed:', e);
      }

      if (retries >= maxRetries) {
        clearInterval(interval);
        setIsCheckoutProcessing(false);
        setActiveCheckoutPlan(null);
        toast.error('Webhook activation delayed. Your plan will update in a few minutes.', { duration: 6000 });
      }
    }, 2000);
  };

  // 4. CHECKOUT INITIATOR MUTATION
  const checkoutMutation = useMutation({
    mutationFn: ({ planId, code }) => PaymentService.createOrder(planId, billingCycle, code),
    onSuccess: async (data, variables) => {
      const targetPlan = plansData.find(p => p.id === variables.planId);

      if (data.alreadyCaptured) {
        setIsCheckoutProcessing(true);
        setCheckoutMessage('Payment successful! Processing activation logs...');
        pollSubscriptionUpdated(targetPlan.slug);
        return;
      }
      
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Inventory Ant B2B',
        description: `Upgrade to ${targetPlan?.name || 'Premium'} Plan`,
        order_id: data.orderId,
        handler: async function (response) {
          setIsCheckoutProcessing(true);
          setCheckoutMessage('Payment successful! Processing activation logs...');
          
          try {
            // Call renew to verify payment in case webhook gets delayed
            await SubscriptionService.renewSubscription(response.razorpay_payment_id);
          } catch (err) {
            console.warn('Manual renewal check failed, falling back to polling:', err.message);
          }

          // Start polling for webhook updates
          pollSubscriptionUpdated(targetPlan.slug);
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled by user');
            setActiveCheckoutPlan(null);
          }
        },
        prefill: {
          email: userId,
        },
        theme: {
          color: '#0f9d63',
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.error('Razorpay SDK failed to load. Please reload page.');
        setActiveCheckoutPlan(null);
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to initialize payment gateway');
      setActiveCheckoutPlan(null);
    }
  });

  const handleUpgrade = (planId) => {
    setActiveCheckoutPlan(planId);
    checkoutMutation.mutate({ planId, code: appliedCoupon ? couponCode : undefined });
  };

  // 5. LOADING SKELETON
  if (plansLoading || subLoading || compareLoading) {
    return (
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-8 animate-pulse bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="h-10 bg-slate-200 rounded-lg w-64 mx-auto" />
          <div className="h-6 bg-slate-200 rounded-lg w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-white border border-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // 6. ERROR RENDERING
  if (plansError) {
    return (
      <div className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] text-center min-h-[500px]">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load subscription plans</h2>
        <p className="text-slate-500 text-sm mt-2">Please check your network and try again.</p>
        <button 
          onClick={() => refetchPlans()}
          className="mt-6 py-2.5 px-6 bg-[#0f9d63] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold border-none cursor-pointer flex items-center gap-2"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const activePlanSlug = currentSubData?.plan?.slug || 'free';

  return (
    <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-[#F8FAFC] space-y-12">
      
      {/* FULL SCREEN CHECKOUT BLOCKER */}
      <AnimatePresence>
        {isCheckoutProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
              <Loader2 className="animate-spin text-emerald-600 mx-auto" size={48} />
              <h3 className="text-lg font-black text-slate-800">Completing Transaction</h3>
              <p className="text-slate-500 text-xs sm:text-sm">{checkoutMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER TABS */}
      <div className="max-w-4xl mx-auto text-center space-y-4">
        <h1 className="m-0 text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600">
          Flexible Pricing for Scale
        </h1>
        <p className="text-slate-500 text-sm sm:text-base m-0 max-w-xl mx-auto leading-relaxed">
          Choose a plan that fits your business volume. Get unlimited product listings, smart warehouse AI tools, and staff controls.
        </p>

        {/* BILLING CYCLE SELECTOR */}
        <div className="flex items-center justify-center gap-2.5 pt-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`py-2 px-6 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`py-2 px-6 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Yearly Billing
            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* PLANS DISPLAY MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plansData?.map((planItem) => {
          const isCurrentPlan = activePlanSlug === planItem.slug;
          const basePrice = billingCycle === 'yearly' ? planItem.yearlyPrice : planItem.monthlyPrice;
          const totalYearsSavings = billingCycle === 'yearly' ? (planItem.monthlyPrice * 12 - planItem.yearlyPrice) : 0;
          
          const isSelectedForCoupon = activeCheckoutPlan === planItem.id;
          const currentPlanPrice = isSelectedForCoupon && appliedCoupon ? appliedCoupon.finalAmount : basePrice;

          return (
            <div 
              key={planItem.id} 
              className={`bg-white rounded-3xl border p-8 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all relative ${
                planItem.recommendedBadge 
                  ? 'border-[#0f9d63] ring-4 ring-[#0f9d63]/5 md:scale-105' 
                  : 'border-slate-200'
              }`}
            >
              {/* Badges */}
              {planItem.popularBadge && (
                <span className="absolute -top-3 left-6 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Popular
                </span>
              )}
              {planItem.recommendedBadge && (
                <span className="absolute -top-3 left-6 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> Recommended
                </span>
              )}

              {/* Title & Price */}
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="m-0 text-xl font-black text-slate-800">{planItem.name}</h3>
                    <p className="text-slate-500 text-xs mt-1.5">{planItem.description}</p>
                  </div>
                  {isCurrentPlan && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      Active
                    </span>
                  )}
                </div>

                <div className="pt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-800">
                    ₹{currentPlanPrice}
                  </span>
                  <span className="text-slate-500 text-xs font-bold">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                {/* Savings and coupons details */}
                {totalYearsSavings > 0 && (
                  <div className="text-emerald-700 text-xs font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl w-fit">
                    <Percent size={12} /> Save ₹{totalYearsSavings} / year
                  </div>
                )}

                {/* Coupon Validation Segment */}
                {!isCurrentPlan && planItem.slug !== 'free' && (
                  <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="COUPON CODE"
                        value={isSelectedForCoupon ? couponCode : ''}
                        onChange={(e) => {
                          setActiveCheckoutPlan(planItem.id);
                          setCouponCode(e.target.value.toUpperCase());
                        }}
                        className="flex-1 text-center font-mono font-bold text-xs uppercase bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none"
                      />
                      <button 
                        onClick={() => handleApplyCoupon(planItem.id)}
                        disabled={couponMutation.isPending}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold border-none cursor-pointer transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {isSelectedForCoupon && couponError && (
                      <div className="text-rose-600 text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle size={10} /> {couponError}
                      </div>
                    )}
                    {isSelectedForCoupon && appliedCoupon && (
                      <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                        <div className="flex justify-between">
                          <span>Discount Applied:</span>
                          <span className="font-bold text-emerald-600">-₹{appliedCoupon.discount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (18%):</span>
                          <span className="font-bold text-slate-600">₹{appliedCoupon.tax}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-800">
                          <span>Total Amount:</span>
                          <span>₹{appliedCoupon.finalAmount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-8">
                {isCurrentPlan ? (
                  <button 
                    disabled 
                    className="w-full py-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed"
                  >
                    Current Active Plan
                  </button>
                ) : planItem.slug === 'free' ? (
                  <button 
                    disabled 
                    className="w-full py-3.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed"
                  >
                    Select Plan
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUpgrade(planItem.id)}
                    disabled={checkoutMutation.isPending && activeCheckoutPlan === planItem.id}
                    className="w-full py-3.5 bg-[#0f9d63] hover:bg-emerald-700 disabled:bg-emerald-700/60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all border-none cursor-pointer"
                  >
                    {checkoutMutation.isPending && activeCheckoutPlan === planItem.id ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Initializing Checkout...
                      </>
                    ) : (
                      <>
                        Upgrade Plan <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FEATURE COMPARISON MATRIX */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm text-left">
        <h3 className="text-slate-800 m-0 font-extrabold text-base flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <ShieldCheck className="text-emerald-500" size={18} /> Detailed Plan Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 text-left font-bold w-1/3">Features & Limits</th>
                {plansData?.map((plan) => (
                  <th key={plan.id} className="py-3 text-center font-bold capitalize">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compareMatrix?.map((row) => (
                <tr key={row.featureId} className="hover:bg-slate-50/50">
                  <td className="py-4 font-bold text-slate-800">{row.featureName}</td>
                  {plansData?.map((plan) => {
                    const planVal = row[plan.slug];
                    const isAllowed = planVal?.allowed;
                    const limit = planVal?.limitValue;
                    return (
                      <td key={plan.id} className="py-4 text-center">
                        {isAllowed ? (
                          <span className={`font-bold ${
                            plan.slug === 'free'
                              ? 'text-emerald-600'
                              : plan.slug === 'basic'
                              ? 'text-slate-700'
                              : 'text-indigo-700'
                          }`}>
                            {limit !== null && limit !== undefined ? limit : <Check size={16} className="mx-auto text-emerald-600" />}
                          </span>
                        ) : (
                          <X size={16} className="text-slate-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
