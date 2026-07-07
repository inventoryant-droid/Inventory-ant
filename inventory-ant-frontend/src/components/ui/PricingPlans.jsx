import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { cn } from '../../utils/cn';

const plans = [
  {
    name: 'Starter',
    tagline: 'For new & small shops getting started',
    monthly: 0,
    yearly: 0,
    cta: 'Start Free',
    features: [
      '1 store location',
      'Up to 100 products',
      'Basic billing & invoices',
      'Mobile app access',
      'Barcode scanning',
      'Community support',
    ],
  },
  {
    name: 'Growth',
    tagline: 'For growing retailers & wholesalers',
    monthly: 499,
    yearly: 399,
    popular: true,
    cta: 'Start 14-Day Trial',
    features: [
      'Up to 3 store locations',
      'Unlimited products',
      'GST-ready billing & e-invoice',
      'Low-stock WhatsApp alerts',
      'Purchase & supplier orders',
      'Sales & profit reports',
      'Up to 5 staff users',
      'Priority email support',
    ],
  },
  {
    name: 'Business',
    tagline: 'For multi-store & scaling enterprises',
    monthly: 1499,
    yearly: 1199,
    cta: 'Talk to Sales',
    features: [
      'Unlimited store locations',
      'Advanced analytics dashboard',
      'Unlimited staff & role controls',
      'API & Tally/ERP integrations',
      'Multi-warehouse management',
      'Dedicated account manager',
      'Priority phone support',
      'Custom onboarding & training',
    ],
  },
];

export function PricingPlans() {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="flex items-center justify-center gap-4">
        <span
          className={cn(
            'text-sm font-medium',
            !yearly ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500',
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((v) => !v)}
          className="relative h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-800 p-1 transition-colors border-none outline-none cursor-pointer"
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={cn(
              'block size-5 rounded-full bg-primary shadow-sm',
              yearly ? 'ml-7' : 'ml-0',
            )}
          />
        </button>
        <span
          className={cn(
            'text-sm font-medium',
            yearly ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500',
          )}
        >
          Yearly
        </span>
        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
          Save 20%
        </span>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-3 text-left">
        {plans.map((plan, i) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'relative flex h-full flex-col rounded-3xl border bg-white dark:bg-slate-900 p-7 m-0',
                plan.popular
                  ? 'border-primary shadow-xl shadow-primary/10 lg:-mt-4 lg:pb-10'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="size-3.5" /> Most Popular
                </span>
              )}

              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white m-0">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 m-0">{plan.tagline}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                <span className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                  {price === 0 ? 'forever' : '/ month'}
                </span>
              </div>
              {price > 0 && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 m-0">
                  {yearly ? 'Billed annually · GST extra' : 'Billed monthly · GST extra'}
                </p>
              )}

              <Button
                className="mt-6 h-11 w-full rounded-xl font-semibold"
                variant={plan.popular ? 'default' : 'outline'}
                to="/signup"
              >
                {plan.cta}
                <ArrowRight className="size-4" />
              </Button>

              <ul className="mt-7 space-y-3 p-0 list-none">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3.5" />
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
