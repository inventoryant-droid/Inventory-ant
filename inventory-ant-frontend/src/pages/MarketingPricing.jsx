import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SubscriptionService } from '../services/subscriptionService';
import { Check, X, Loader2 } from 'lucide-react';
import { CtaSection } from '../components/ui/CtaSection';
import { Reveal } from '../components/ui/MotionPrimitives';
import { Faq } from '../components/ui/Faq';
import { PricingPlans } from '../components/ui/PricingPlans';
import { cn } from '../utils/cn';

function Cell({ value }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-4" />
      </span>
    ) : (
      <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
        <X className="size-4" />
      </span>
    );
  }
  return <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>;
}

export default function MarketingPricing() {
  useEffect(() => {
    document.title = "Pricing & Plans — Inventory Ant";
    window.scrollTo(0, 0);
  }, []);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: SubscriptionService.getPlans,
  });

  const { data: compareMatrix, isLoading: compareLoading } = useQuery({
    queryKey: ['plansCompare'],
    queryFn: SubscriptionService.getPlansCompare,
  });

  return (
    <>
      <section className="relative overflow-hidden bg-dots">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/10 to-background" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center flex flex-col items-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Pricing
            </span>
            <h1 className="mt-3 text-balance font-display text-4xl font-extrabold tracking-tight sm:text-5xl text-slate-900 dark:text-white">
              Plans that grow with your business
            </h1>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-500 dark:text-slate-400">
              Start free, forever. Simple pricing in rupees with no hidden fees.
              Pay yearly and save 20%.
            </p>
          </Reveal>

          <div className="mt-12">
            <PricingPlans />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center flex flex-col items-center">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Compare all features
          </h2>
        </Reveal>

        {plansLoading || compareLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <Reveal className="mt-10 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    <th className="px-6 py-4 font-display text-sm font-bold text-slate-900 dark:text-white">Feature</th>
                    {plansData?.map((plan) => {
                      const isHighlighted = plan.recommendedBadge || plan.popularBadge;
                      return (
                        <th
                          key={plan.id}
                          className={cn(
                            "px-6 py-4 text-center font-display text-sm font-bold",
                            isHighlighted
                              ? "bg-primary/5 text-primary"
                              : "text-slate-900 dark:text-white"
                          )}
                        >
                          {plan.name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {compareMatrix?.map((row) => (
                    <tr key={row.featureId} className="bg-white dark:bg-slate-900/20">
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{row.featureName}</td>
                      {plansData?.map((plan) => {
                        const planVal = row[plan.slug];
                        const isAllowed = planVal?.allowed;
                        const limit = planVal?.limitValue;
                        const isHighlighted = plan.recommendedBadge || plan.popularBadge;
                        return (
                          <td
                            key={plan.id}
                            className={cn(
                              "px-6 py-4 text-center",
                              isHighlighted && "bg-primary/5"
                            )}
                          >
                            <Cell value={isAllowed ? (limit !== null && limit !== undefined ? limit : true) : false} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            FAQ
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Questions? We&apos;ve got answers
          </h2>
        </Reveal>
        <Faq />
      </section>

      <CtaSection />
    </>
  );
}
