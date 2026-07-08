/**
 * Shared UI Components — Phase 9A.4 Production Polish
 * 
 * Reusable primitives to ensure consistent design across all pages:
 *  - PageSkeleton        → full-page loading state
 *  - PageError           → retry-able error state
 *  - EmptyState          → empty data state
 *  - StatusBadge         → consistent badge styling
 *  - SectionHeader       → page header typography
 */

import React from 'react';
import { AlertTriangle, RefreshCw, InboxIcon, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────
// Full-page skeleton loader
// Usage: <PageSkeleton rows={3} cols={4} />
// ─────────────────────────────────────────
export function PageSkeleton({ rows = 2, cols = 4, hasHeader = true }) {
  return (
    <div
      className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 animate-pulse bg-slate-50"
      role="status"
      aria-label="Loading page content"
    >
      {hasHeader && (
        <div className="space-y-2">
          <div className="h-8 bg-slate-200 rounded-xl w-56" />
          <div className="h-4 bg-slate-100 rounded-lg w-80" />
        </div>
      )}
      {cols > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
          {[...Array(cols)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl shadow-sm" />
          ))}
        </div>
      )}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-56 bg-white border border-slate-100 rounded-3xl shadow-sm" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// ─────────────────────────────────────────
// Full-page error state with retry
// Usage: <PageError message="…" onRetry={refetch} />
// ─────────────────────────────────────────
export function PageError({ message = 'Something went wrong.', onRetry }) {
  return (
    <div
      className="p-8 flex-1 flex flex-col items-center justify-center text-center min-h-[420px] bg-slate-50"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-5 border border-rose-100">
        <AlertTriangle size={28} className="text-rose-500" />
      </div>
      <h2 className="text-base font-extrabold text-slate-800 m-0">Failed to load</h2>
      <p className="text-slate-500 text-sm mt-2 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 py-2.5 px-6 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          aria-label="Retry loading page"
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Empty state placeholder
// Usage: <EmptyState icon={...} title="No data" description="..." />
// ─────────────────────────────────────────
export function EmptyState({ icon: Icon = InboxIcon, title = 'Nothing here yet', description = '', action }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center px-6"
      role="status"
      aria-label={title}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5 border border-slate-200">
        <Icon size={26} className="text-slate-400" />
      </div>
      <h3 className="text-sm font-extrabold text-slate-700 m-0">{title}</h3>
      {description && <p className="text-slate-400 text-xs mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// Status Badge
// Usage: <StatusBadge status="active" />
// ─────────────────────────────────────────
const STATUS_STYLES = {
  active:     'bg-emerald-100 text-emerald-800',
  trial:      'bg-sky-100 text-sky-800',
  grace:      'bg-amber-100 text-amber-800',
  expired:    'bg-rose-100 text-rose-800',
  cancelled:  'bg-slate-100 text-slate-600',
  success:    'bg-emerald-100 text-emerald-800',
  refunded:   'bg-rose-100 text-rose-800',
  pending:    'bg-amber-100 text-amber-800',
  disabled:   'bg-rose-100 text-rose-800',
  enabled:    'bg-emerald-100 text-emerald-800',
  default:    'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status = 'default', label }) {
  const style = STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES.default;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${style}`}
      role="status"
      aria-label={`Status: ${label ?? status}`}
    >
      {label ?? status}
    </span>
  );
}

// ─────────────────────────────────────────
// Page section header
// Usage: <SectionHeader title="Users" subtitle="…" icon={Users} />
// ─────────────────────────────────────────
export function SectionHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
      <div>
        <h1 className="m-0 text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2.5">
          {Icon && <Icon size={22} className="text-indigo-600 shrink-0" aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && (
          <p className="m-0 mt-1 text-xs text-slate-400 font-semibold leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────
// Inline loading spinner
// ─────────────────────────────────────────
export function Spinner({ size = 16, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
