import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { InventoryAntLogoMark, InventoryAntLogoText } from '../ui/InventoryAntLogo';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About Us' },
  { href: '/mobile-app', label: 'Mobile App' },
];

export function Logo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center no-underline', className)}>
      <InventoryAntLogoMark className="h-9 w-auto" />
    </Link>
  );
}

export function SiteHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const pathname = location.pathname;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'relative rounded-full px-4 py-2 text-sm font-medium transition-colors no-underline',
                  active
                    ? 'text-primary'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-primary/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" to="/login" className="px-4 py-2 font-semibold">
            Sign in
          </Button>
          <Button className="rounded-xl font-semibold px-4 py-2" to="/signup">
            Start Free
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 md:hidden bg-transparent cursor-pointer text-slate-600 dark:text-slate-300"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-slate-200/60 bg-white dark:border-slate-800/60 dark:bg-slate-950 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                       'rounded-lg px-4 py-3 text-sm font-medium transition-colors no-underline block',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl font-semibold w-full py-2.5"
                  to="/login"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Button>
                <Button
                  className="rounded-xl font-semibold w-full py-2.5"
                  to="/signup"
                  onClick={() => setOpen(false)}
                >
                  Start Free
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
