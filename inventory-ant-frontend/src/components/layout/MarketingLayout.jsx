import React, { useState, useEffect } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function MarketingLayout({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('ant_theme');
    if (savedTheme) return savedTheme === 'dark';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? true : false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('ant_theme')) {
        setIsDark(e.matches);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

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
