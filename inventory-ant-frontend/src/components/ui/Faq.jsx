import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const faqs = [
  {
    q: 'Is there really a free plan?',
    a: 'Yes! Our Starter plan is free forever for a single store with up to 100 products. No credit card required and no hidden charges. Upgrade only when your business grows.',
  },
  {
    q: 'Does Inventory Ant support GST billing and e-invoicing?',
    a: 'Absolutely. Growth and Business plans generate GST-compliant invoices with auto-calculated CGST, SGST and IGST, plus e-invoice and e-way bill support for eligible businesses.',
  },
  {
    q: 'Can I use it on my mobile phone?',
    a: 'Yes. Inventory Ant works on Android and iOS, and you can scan barcodes using just your phone camera — no expensive hardware needed.',
  },
  {
    q: 'How do I pay? Is UPI accepted?',
    a: 'We accept UPI, all major debit/credit cards, net banking and wallets through secure Indian payment gateways. Annual plans can also be paid via bank transfer.',
  },
  {
    q: 'Can I switch or cancel my plan anytime?',
    a: 'Of course. You can upgrade, downgrade or cancel at any time from your dashboard. There are no lock-in contracts — you only pay for what you use.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden text-left">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left border-none bg-transparent cursor-pointer text-slate-800 dark:text-slate-200"
              aria-expanded={isOpen}
            >
              <span className="font-display text-base font-semibold">
                {faq.q}
              </span>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform',
                  isOpen && 'rotate-45',
                )}
              >
                <Plus className="size-4" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 m-0">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
