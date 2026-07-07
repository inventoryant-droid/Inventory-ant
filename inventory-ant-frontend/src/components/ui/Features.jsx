import React from 'react';
import {
  Bell,
  FileText,
  LayoutDashboard,
  QrCode,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from './MotionPrimitives';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Real-time Stock Tracking',
    desc: 'See live stock levels across every store and warehouse. Know exactly what you have, everywhere, instantly.',
  },
  {
    icon: FileText,
    title: 'GST-Ready Billing',
    desc: 'Create professional GST invoices in seconds. Auto-calculated CGST, SGST & IGST with e-invoice support.',
  },
  {
    icon: QrCode,
    title: 'Barcode & QR Scanning',
    desc: 'Add and sell products with a quick scan from your phone camera. No expensive hardware required.',
  },
  {
    icon: Bell,
    title: 'Low-Stock Alerts',
    desc: 'Get instant WhatsApp and app alerts before you run out, so you never lose a sale to empty shelves.',
  },
  {
    icon: Truck,
    title: 'Purchase & Supplier Orders',
    desc: 'Manage suppliers, raise purchase orders and track deliveries all in one clean workflow.',
  },
  {
    icon: RefreshCw,
    title: 'Multi-Store Sync',
    desc: 'Run 2 shops or 200 — inventory, pricing and reports stay perfectly in sync in real time.',
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Everything you need
        </span>
        <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          One platform to run your entire inventory
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-slate-500 dark:text-slate-400">
          Replace messy registers, spreadsheets and guesswork with software
          designed for how Indian businesses actually work.
        </p>
      </Reveal>

      <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left">
        {features.map((feature) => (
          <StaggerItem key={feature.title}>
            <div className="group h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <feature.icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {feature.desc}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
