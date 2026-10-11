import { motion } from 'framer-motion';

/* Greedy: activities as bars on a shared time axis. The greedy choice (chosen) is green, rejected overlaps are rose. */
const BAR = {
  pending: 'bg-slate-400 dark:bg-zinc-600',
  considering: 'bg-amber-400 dark:bg-amber-400',
  chosen: 'bg-green-600 dark:bg-green-500',
  rejected: 'bg-rose-400 dark:bg-rose-500',
};

export default function TimelineViz({ frame }) {
  const { acts, status, last, tmax, sorted } = frame;
  if (!acts.length) return <p className="text-sm text-slate-500 dark:text-zinc-400">No valid activities.</p>;
  const ticks = Array.from({ length: Math.min(tmax, 20) + 1 }, (_, i) => Math.round((i * tmax) / Math.min(tmax, 20)));
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">{sorted ? 'Sorted by finish time (the greedy key)' : 'Input order'}</p>
      <div className="relative rounded-md bg-slate-100/60 py-3 pl-[74px] pr-3 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
        {last !== null && <motion.div aria-hidden="true" className="absolute bottom-7 top-3 w-0 border-l-2 border-dashed border-green-600 dark:border-green-400" initial={false} animate={{ left: `calc(74px + (100% - 74px - 12px) * ${last / tmax})` }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}><span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-green-600 px-1 text-[10px] font-bold text-white">last = {last}</span></motion.div>}
        <div className="space-y-1">
          {acts.map((a) => (
            <motion.div layout key={a.id} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="relative flex h-6 items-center">
              <span className="absolute -left-[68px] w-16 text-right font-mono text-[11px] tabular-nums text-slate-600 dark:text-zinc-400">[{a.s}, {a.f})</span>
              <div className="relative h-full w-full">
                <motion.div layout className={`absolute top-0 h-full rounded-md ${BAR[status[a.id]]} ${status[a.id] === 'rejected' ? 'opacity-55' : ''}`} style={{ left: `${(a.s / tmax) * 100}%`, width: `${((a.f - a.s) / tmax) * 100}%` }}
                  animate={{ scale: status[a.id] === 'considering' ? 1.04 : 1 }}>
                  <span className="px-1.5 text-[10px] font-bold leading-6 text-white">{status[a.id] === 'chosen' ? '✔' : status[a.id] === 'rejected' ? '✘' : ''}</span>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="relative mt-2 h-4 border-t border-slate-300 dark:border-zinc-700">
          {ticks.map((t, i) => <span key={i} className="absolute -translate-x-1/2 text-[10px] tabular-nums text-slate-400 dark:text-zinc-500 font-mono" style={{ left: `${(t / tmax) * 100}%` }}>{t}</span>)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
        {[['bg-slate-400', 'pending'], ['bg-amber-400', 'considering'], ['bg-green-600', 'chosen (greedy choice)'], ['bg-rose-400', 'rejected (overlaps)']].map(([c, t]) => <span key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{t}</span>)}
      </div>
    </div>
  );
}
