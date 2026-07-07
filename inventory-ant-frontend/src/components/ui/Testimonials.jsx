import React from 'react';
import { Quote, Star } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from './MotionPrimitives';

const testimonials = [
  {
    quote:
      'Pehle stock ka hisaab register mein rakhte the. Ab sab kuch phone par hai. Inventory Ant ne meri dukaan ka poora system badal diya.',
    name: 'Rajesh Kumar',
    role: 'Owner, Sri Balaji Kirana · Hyderabad',
    initials: 'RK',
  },
  {
    quote:
      'GST billing used to take my accountant hours. Now invoices are ready instantly and filing is stress-free. Best decision for my wholesale business.',
    name: 'Priya Sharma',
    role: 'Director, Sharma Distributors · Jaipur',
    initials: 'PS',
  },
  {
    quote:
      'Managing 6 pharmacy outlets was chaos. Multi-store sync means I see every branch from home. Low-stock alerts alone save us lakhs.',
    name: 'Arun Nair',
    role: 'Founder, MedPlus Care · Kochi',
    initials: 'AN',
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Loved across Bharat
        </span>
        <h2 className="mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
          Business owners trust Inventory Ant
        </h2>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            4.8/5 from 3,200+ reviews
          </span>
        </div>
      </Reveal>

      <StaggerGroup className="mt-14 grid gap-6 md:grid-cols-3 text-left">
        {testimonials.map((t) => (
          <StaggerItem key={t.name}>
            <figure className="flex h-full flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 m-0">
              <Quote className="size-8 text-primary/30 shrink-0" />
              <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-slate-800 dark:text-slate-200 not-italic m-0">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {t.initials}
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-slate-900 dark:text-white m-0">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
