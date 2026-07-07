import React from 'react';
import { ArrowRight, IndianRupee, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';

const easeOut = [0.22, 1, 0.36, 1];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/10 via-background to-background" />
      <div className="pointer-events-none absolute -right-24 top-24 -z-10 size-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-48 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center flex flex-col items-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
          >
            <Sparkles className="size-4" />
            India&apos;s simplest inventory & billing software
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: easeOut }}
            className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl text-slate-900 dark:text-white"
          >
            Manage stock, billing & orders{' '}
            <span className="text-primary">from one dashboard</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: easeOut }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-slate-500 dark:text-slate-400"
          >
            Inventory Ant helps Indian shops, wholesalers and distributors track
            real-time inventory, create GST-ready invoices and never run out of
            stock again. Set up in minutes, no technical skills needed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: easeOut }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="h-12 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto"
              to="/signup"
            >
              Start Free — No Card Needed
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto"
              to="/mobile-app"
            >
              Try the Mobile App
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="mt-4 text-sm text-slate-400"
          >
            Trusted by 12,000+ businesses across India
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: easeOut }}
          className="relative mx-auto mt-16 max-w-5xl"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-primary/5">
            <img
              src="/dashboard-preview.png"
              alt="Inventory Ant dashboard preview showing stock levels, product table and revenue chart"
              className="h-auto w-full block"
              loading="eager"
            />
          </div>

          <motion.div
            className="absolute -left-4 top-16 hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg sm:flex sm:items-center sm:gap-3"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-slate-400 dark:text-slate-500 m-0">Today&apos;s Sales</p>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white m-0">₹1,84,250</p>
            </div>
          </motion.div>

          <motion.div
            className="absolute -right-4 bottom-16 hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg sm:flex sm:items-center sm:gap-3"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-400/20 text-amber-600">
              <ShieldCheck className="size-5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-slate-400 dark:text-slate-500 m-0">GST Invoices</p>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white m-0">Auto-filed</p>
            </div>
          </motion.div>

          <motion.div
            className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg md:flex"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="size-5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-slate-400 dark:text-slate-500 m-0">Low-stock saved</p>
              <p className="font-display text-sm font-bold text-slate-900 dark:text-white m-0">₹42L / year</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
