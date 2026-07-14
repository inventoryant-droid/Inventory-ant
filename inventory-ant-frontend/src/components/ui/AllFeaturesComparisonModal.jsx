import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionService } from '../../services/subscriptionService';
import { X, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function AllFeaturesComparisonModal({ isOpen, onClose }) {
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: SubscriptionService.getPlans,
    enabled: isOpen,
  });

  const { data: compareMatrix, isLoading: compareLoading } = useQuery({
    queryKey: ['plansCompare'],
    queryFn: SubscriptionService.getPlansCompare,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left flex flex-col max-h-[85vh]"
        >
          {/* HEADER */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="m-0 text-base font-black text-slate-800 dark:text-white">
                  All Plans & Features Matrix
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider m-0 mt-0.5">
                  Complete pricing tiers features comparison
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border-none bg-transparent cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* TABLE CONTAINER */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {plansLoading || compareLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-3 text-slate-400 text-xs font-semibold">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                Loading comparison matrix...
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-xs sm:text-sm border-collapse text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 font-bold w-1/3">Features & Limits</th>
                      {plansData?.map((plan) => (
                        <th key={plan.id} className="py-4 px-6 text-center font-bold capitalize">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {compareMatrix?.map((row) => (
                      <tr key={row.featureId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-200">{row.featureName}</td>
                        {plansData?.map((plan) => {
                          const planVal = row[plan.slug];
                          const isAllowed = planVal?.allowed;
                          const limit = planVal?.limitValue;
                          return (
                            <td key={plan.id} className="py-4 px-6 text-center">
                              {isAllowed ? (
                                <span className={`font-bold ${
                                  plan.slug === 'free'
                                    ? 'text-emerald-600'
                                    : plan.slug === 'basic'
                                    ? 'text-slate-700 dark:text-slate-300'
                                    : 'text-indigo-600 dark:text-indigo-400'
                                }`}>
                                  {limit !== null && limit !== undefined ? (
                                    limit
                                  ) : (
                                    <Check size={16} className="mx-auto text-emerald-600" />
                                  )}
                                </span>
                              ) : (
                                <X size={16} className="text-slate-300 dark:text-slate-600 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
