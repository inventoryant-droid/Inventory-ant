import React, { useEffect } from 'react';
import {
  Apple,
  Bell,
  CloudOff,
  Languages,
  Play,
  ScanLine,
  Star,
  Zap,
} from 'lucide-react';
import { CtaSection } from '../components/ui/CtaSection';
import { Reveal, StaggerGroup, StaggerItem } from '../components/ui/MotionPrimitives';

const appFeatures = [
  {
    icon: ScanLine,
    title: 'Scan to add & sell',
    desc: 'Use your phone camera as a barcode scanner. Add stock or bill a customer in seconds.',
  },
  {
    icon: Bell,
    title: 'Instant alerts',
    desc: 'Push and WhatsApp notifications the moment an item runs low or a big sale happens.',
  },
  {
    icon: CloudOff,
    title: 'Works offline',
    desc: 'Keep billing even when the internet drops. Data syncs automatically once you’re back online.',
  },
  {
    icon: Languages,
    title: 'Hindi & English',
    desc: 'A comfortable interface in the language your team prefers, right out of the box.',
  },
  {
    icon: Zap,
    title: 'Lightning fast',
    desc: 'A lightweight app that runs smoothly even on budget Android phones.',
  },
  {
    icon: Star,
    title: 'Rated 4.8 on stores',
    desc: 'Loved by thousands of shopkeepers and traders across the country.',
  },
];

function StoreBadge({
  icon,
  top,
  bottom,
}) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className="flex items-center gap-3 rounded-xl bg-slate-900 text-white px-5 py-3 transition-transform hover:-translate-y-0.5 no-underline"
    >
      {icon}
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wide opacity-80 leading-none">
          {top}
        </span>
        <span className="block font-display text-base font-bold leading-tight mt-1">
          {bottom}
        </span>
      </span>
    </a>
  );
}

export default function MarketingMobileApp() {
  useEffect(() => {
    document.title = "Try Our Mobile App — Inventory Ant";
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-grid">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="pointer-events-none absolute -left-20 top-40 -z-10 size-72 rounded-full bg-amber-400/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="text-left flex flex-col items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="size-4" /> Inventory Ant Mobile
              </span>
              <h1 className="mt-6 text-balance font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl text-slate-900 dark:text-white">
                Your entire shop, right in your pocket
              </h1>
              <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Bill customers, scan products and check stock from anywhere —
                the counter, the warehouse or on the road. Everything syncs
                instantly with your dashboard.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <StoreBadge
                  icon={<Play className="size-6 fill-white text-white" />}
                  top="Get it on"
                  bottom="Google Play"
                />
                <StoreBadge
                  icon={<Apple className="size-6 text-white" />}
                  top="Download on the"
                  bottom="App Store"
                />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 m-0">
                  4.8 rating · 5,00,000+ downloads
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="relative">
              <div className="animate-float">
                <img
                  src="/mobile-app-screens.png"
                  alt="Inventory Ant mobile app screens showing the stock dashboard and barcode scanner"
                  className="mx-auto h-auto w-full max-w-md block"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center flex flex-col items-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            Why you&apos;ll love it
          </span>
          <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Powerful features, pocket-sized
          </h2>
        </Reveal>

        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left">
          {appFeatures.map((feature) => (
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

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <Reveal>
          <div className="grid items-center gap-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-8 sm:p-12 md:grid-cols-[1fr_auto] text-left">
            <div>
              <h2 className="text-balance font-display text-2xl font-extrabold tracking-tight sm:text-3xl text-slate-900 dark:text-white m-0">
                Scan to download instantly
              </h2>
              <p className="mt-3 max-w-md text-pretty leading-relaxed text-slate-500 dark:text-slate-400 m-0">
                Point your phone camera at the QR code to install Inventory Ant on
                Android or iOS. It&apos;s free to get started.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <StoreBadge
                  icon={<Play className="size-6 fill-white text-white" />}
                  top="Get it on"
                  bottom="Google Play"
                />
                <StoreBadge
                  icon={<Apple className="size-6 text-white" />}
                  top="Download on the"
                  bottom="App Store"
                />
              </div>
            </div>
            <div className="mx-auto flex size-40 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:size-48 shrink-0">
              <div className="grid size-full grid-cols-8 grid-rows-8 gap-1">
                {Array.from({ length: 64 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      (i * 7 + ((i % 5) * 3)) % 3 === 0
                        ? 'rounded-[2px] bg-slate-900 dark:bg-slate-100'
                        : 'rounded-[2px] bg-transparent'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <CtaSection />
    </>
  );
}
