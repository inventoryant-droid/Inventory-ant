import React from 'react';

const items = [
  'Kirana Stores',
  'Wholesalers',
  'Pharmacies',
  'Distributors',
  'Garment Shops',
  'Electronics Retail',
  'Supermarkets',
  'Hardware Stores',
  'FMCG Traders',
  'D2C Brands',
];

export function TrustBar() {
  return (
    <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8">
      <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Powering every kind of Indian business
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-4">
          {[...items, ...items].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
