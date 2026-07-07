import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { CtaSection } from '../components/ui/CtaSection';
import { Reveal } from '../components/ui/MotionPrimitives';
import { Faq } from '../components/ui/Faq';
import { PricingPlans } from '../components/ui/PricingPlans';

const comparison = [
  { feature: 'Store locations', starter: '1', growth: 'Up to 3', business: 'Unlimited' },
  { feature: 'Products', starter: '100', growth: 'Unlimited', business: 'Unlimited' },
  { feature: 'GST billing & e-invoice', starter: false, growth: true, business: true },
  { feature: 'Low-stock alerts', starter: false, growth: true, business: true },
  { feature: 'Staff users', starter: '1', growth: '5', business: 'Unlimited' },
  { feature: 'Analytics & reports', starter: 'Basic', growth: 'Advanced', business: 'Advanced+' },
  { feature: 'API & ERP integrations', starter: false, growth: false, business: true },
  { feature: 'Support', starter: 'Community', growth: 'Priority email', business: 'Dedicated manager' },
];

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

        <Reveal className="mt-10 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900">
                  <th className="px-6 py-4 font-display text-sm font-bold text-slate-900 dark:text-white">Feature</th>
                  <th className="px-6 py-4 text-center font-display text-sm font-bold text-slate-900 dark:text-white">Starter</th>
                  <th className="bg-primary/5 px-6 py-4 text-center font-display text-sm font-bold text-primary">Growth</th>
                  <th className="px-6 py-4 text-center font-display text-sm font-bold text-slate-900 dark:text-white">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {comparison.map((row) => (
                  <tr key={row.feature} className="bg-white dark:bg-slate-900/20">
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{row.feature}</td>
                    <td className="px-6 py-4 text-center"><Cell value={row.starter} /></td>
                    <td className="bg-primary/5 px-6 py-4 text-center"><Cell value={row.growth} /></td>
                    <td className="px-6 py-4 text-center"><Cell value={row.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
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
