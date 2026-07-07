import React, { useState, useEffect } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function MarketingLayout({ children }) {
  // Temporarily forced to false to disable dark theme completely
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`marketing-site ${isDark ? 'dark dark-theme' : 'light-theme'} w-full min-h-screen flex flex-col bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans`}>
      <SiteHeader />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
