import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from './SiteHeader';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Mobile App', href: '/mobile-app' },
      { label: 'GST Billing', href: '/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/about' },
      { label: 'Contact', href: '/about' },
      { label: 'Blog', href: '/' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/' },
      { label: 'WhatsApp Support', href: '/' },
      { label: 'Privacy Policy', href: '/' },
      { label: 'Terms of Service', href: '/' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5 text-left">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Smart, affordable warehouse and inventory management built for Indian
              retailers, wholesalers and distributors. From local stores to
              growing enterprises.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-500 dark:text-slate-400 p-0 list-none">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" /> +91 98765 43210
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-primary" /> hello@inventoryant.in
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Bengaluru, Karnataka, India
              </li>
            </ul>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">{col.title}</h3>
              <ul className="mt-4 space-y-3 p-0 list-none">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-500 dark:text-slate-400 transition-colors hover:text-primary no-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Inventory Ant Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made in India <span aria-hidden>·</span> Bharat ke liye
          </p>
        </div>
      </div>
    </footer>
  );
}
