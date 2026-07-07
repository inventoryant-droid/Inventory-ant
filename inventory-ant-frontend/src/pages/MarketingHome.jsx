import React, { useEffect } from 'react';
import { Hero } from '../components/ui/Hero';
import { TrustBar } from '../components/ui/TrustBar';
import { Features } from '../components/ui/Features';
import { Stats } from '../components/ui/Stats';
import { HowItWorks } from '../components/ui/HowItWorks';
import { Testimonials } from '../components/ui/Testimonials';
import { CtaSection } from '../components/ui/CtaSection';

export default function MarketingHome() {
  useEffect(() => {
    document.title = "Inventory Ant — Your Warehouse. Simplified.";
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <Stats />
      <HowItWorks />
      <Testimonials />
      <CtaSection />
    </>
  );
}
