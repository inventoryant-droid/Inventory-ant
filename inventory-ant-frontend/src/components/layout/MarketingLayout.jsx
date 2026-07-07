import React from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function MarketingLayout({ children }) {
  const savedTheme = localStorage.getItem('ant_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme ? (savedTheme === 'dark') : prefersDark;

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
