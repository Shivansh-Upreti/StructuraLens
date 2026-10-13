/* Skeleton loaders: flat placeholder blocks in the panel tone, shown while async work runs
   (lazy route chunks, the frame worker, sandbox runs). They mirror the real layout so nothing jumps. */

export function LinesSkeleton({ rows = 6, className = '' }) {
  const widths = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3', 'w-1/3', 'w-4/5', 'w-3/5', 'w-1/2'];
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} className={`skeleton h-3.5 ${widths[i % widths.length]}`} />)}
    </div>
  );
}

export function VizSkeleton({ label = 'Loading', className = '' }) {
  return (
    <div role="status" aria-live="polite" className={`card flex min-h-[320px] flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-7 w-28" />
      </div>
      <div className="flex flex-1 items-end gap-2 border border-slate-200 p-4 dark:border-line">
        {[45, 70, 30, 85, 55, 65, 40, 75].map((h, i) => <div key={i} className="skeleton flex-1" style={{ height: `${h}%`, minHeight: 24 }} />)}
      </div>
      <p className="font-mono text-xs text-slate-500 dark:text-fg-muted">&gt;_ {label}</p>
    </div>
  );
}

/** Route-level fallback: navbar is already painted; this mirrors the split workspace. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto grid max-w-[1500px] gap-4 px-5 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
      <div className="card space-y-4">
        <div className="skeleton h-5 w-32" />
        <LinesSkeleton rows={10} />
      </div>
      <VizSkeleton label="Loading module" />
    </div>
  );
}
