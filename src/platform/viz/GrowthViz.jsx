import { motion } from 'framer-motion';

/* Growth curves / asymptotic bounds. Curves that leave the chart are cut where they cross the top edge. */
const W = 420, H = 270, L = 44, R = 12, T = 12, B = 34;
const TONE = {
  green: ['stroke-green-600 dark:stroke-green-400', 'bg-green-600 dark:bg-green-400'],
  teal: ['stroke-teal-600 dark:stroke-teal-400', 'bg-teal-600 dark:bg-teal-400'],
  sky: ['stroke-sky-600 dark:stroke-sky-400', 'bg-sky-600 dark:bg-sky-400'],
  amber: ['stroke-amber-500 dark:stroke-amber-400', 'bg-amber-500 dark:bg-amber-400'],
  orange: ['stroke-orange-600 dark:stroke-orange-400', 'bg-orange-600 dark:bg-orange-400'],
  rose: ['stroke-rose-600 dark:stroke-rose-400', 'bg-rose-600 dark:bg-rose-400'],
  violet: ['stroke-violet-600 dark:stroke-violet-400', 'bg-violet-600 dark:bg-violet-400'],
};

export default function GrowthViz({ frame }) {
  const { xmax, ymax, n, series, band, table } = frame;
  const X = (x) => L + ((x - 1) / (xmax - 1)) * (W - L - R);
  const Y = (y) => T + (1 - Math.min(y, ymax) / ymax) * (H - T - B);
  const pathFor = (ys) => {
    const pts = [];
    for (let i = 0; i < ys.length; i++) {
      const x = i + 1, y = ys[i];
      if (y <= ymax) pts.push([X(x), Y(y)]);
      else {
        if (i > 0 && ys[i - 1] <= ymax) { const t = (ymax - ys[i - 1]) / (y - ys[i - 1]); pts.push([X(x - 1 + t), Y(ymax)]); }
        break;
      }
    }
    return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  };
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * ymax));
  const xTicks = Array.from({ length: Math.min(xmax, 10) }, (_, i) => Math.round(1 + (i * (xmax - 1)) / (Math.min(xmax, 10) - 1)));
  const bandPath = band && (() => {
    const hi = band.hi.map((y, i) => [X(i + 1), Y(y)]), lo = band.lo.map((y, i) => [X(i + 1), Y(y)]).reverse();
    return 'M' + [...hi, ...lo].map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + ' Z';
  })();
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 'calc(var(--viz-h, 520px) - 100px)' }} className="mx-auto w-full rounded-md bg-slate-100/60 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" role="img" aria-label="Growth chart">
        {yTicks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} className="stroke-slate-200 dark:stroke-zinc-800" /><text x={L - 6} y={Y(t) + 3} textAnchor="end" className="fill-slate-500 text-[9px] dark:fill-zinc-400">{t}</text></g>)}
        {xTicks.map((t) => <text key={t} x={X(t)} y={H - 14} textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-zinc-400">{t}</text>)}
        <text x={(L + W - R) / 2} y={H - 3} textAnchor="middle" className="fill-slate-500 text-[9px] dark:fill-zinc-400">input size n</text>
        <text x={10} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 10 ${(T + H - B) / 2})`} className="fill-slate-500 text-[9px] dark:fill-zinc-400">operations</text>
        {bandPath && <motion.path d={bandPath} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fill-green-600/15 dark:fill-green-400/15" />}
        {series.map((s) => (
          <motion.path key={s.id} d={pathFor(s.ys)} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeDasharray={s.dash ? '5 4' : undefined} className={TONE[s.tone][0]}
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        ))}
        {n !== null && (
          <g>
            <line x1={X(n)} x2={X(n)} y1={T} y2={H - B} strokeDasharray="3 3" className="stroke-slate-500 dark:stroke-zinc-400" />
            {series.map((s) => s.ys[n - 1] <= ymax && <circle key={s.id} cx={X(n)} cy={Y(s.ys[n - 1])} r="3.5" className={TONE[s.tone][0].replace('stroke-', 'fill-')} />)}
          </g>
        )}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-zinc-300">
        {series.map((s) => <span key={s.id} className="inline-flex items-center gap-1.5"><i className={`inline-block h-2.5 w-2.5 rounded-full ${TONE[s.tone][1]}`} />{s.label}</span>)}
      </div>
      {table.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">n = {n}</span>
          {table.map(([k, v]) => <span key={k} className="rounded-md bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">{k}: {v}</span>)}
        </div>
      )}
    </div>
  );
}
