import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './MotionPrimitives';
import { Button } from './Button';

export function CtaSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-white sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-white/10 blur-3xl" />

          <h2 className="relative text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl m-0 text-white">
            Ready to take control of your inventory?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-emerald-100">
            Join 12,000+ Indian businesses. Start free today — upgrade only when
            you grow. No credit card, no lock-in.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="h-12 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto"
              to="/signup"
            >
              Start Free
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-xl border-white/30 bg-transparent px-6 text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
              to="/mobile-app"
            >
              Get the App
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
