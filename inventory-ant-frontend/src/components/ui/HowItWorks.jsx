import React from 'react';
import { PackagePlus, ScanLine, TrendingUp } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from './MotionPrimitives';

const steps = [
  {
    icon: PackagePlus,
    step: '01',
    title: 'Add your products',
    desc: 'Import your catalogue from Excel or add items with a barcode scan. Set prices, tax slabs and reorder points.',
  },
  {
    icon: ScanLine,
    step: '02',
    title: 'Sell & bill in seconds',
    desc: 'Scan, generate a GST invoice and share it on WhatsApp. Stock updates automatically with every sale.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Grow with insights',
    desc: 'See best-sellers, dead stock and daily profit. Make smarter buying decisions backed by real data.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-slate-50/50 dark:bg-slate-900/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Get started in 3 steps
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Up and running before your next chai
          </h2>
        </Reveal>

        <StaggerGroup className="relative mt-14 grid gap-8 md:grid-cols-3 text-left">
          {steps.map((step) => (
            <StaggerItem key={step.step}>
              <div className="relative h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                <span className="font-display text-5xl font-extrabold text-primary/15 block mb-2">
                  {step.step}
                </span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-white">
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
