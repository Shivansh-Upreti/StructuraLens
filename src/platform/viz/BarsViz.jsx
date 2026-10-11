import { motion } from 'framer-motion';

const MARK = {
  cmp: 'bg-amber-400 dark:bg-amber-400',
  swap: 'bg-rose-500 dark:bg-rose-400',
  pivot: 'bg-violet-500 dark:bg-violet-400',
  key: 'bg-sky-500 dark:bg-sky-400',
  sorted: 'bg-green-600 dark:bg-green-500',
};
const LEGEND = [['bg-amber-400', 'comparing'], ['bg-rose-500', 'swapping / moving'], ['bg-violet-500', 'pivot'], ['bg-sky-500', 'key'], ['bg-green-600', 'in final place']];

export default function BarsViz({ frame }) {
  const { items, mark, range, split, depth } = frame;
  const vals = items.map((x) => x.v), max = Math.max(...vals), min = Math.min(...vals);
  const h = (v) => 28 + ((v - min) / (max - min || 1)) * 190;
  return (
    <div>
      <div className="flex h-[270px] items-end justify-center gap-1.5 rounded-md bg-slate-100/60 px-3 pb-3 pt-6 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" role="img" aria-label={`Bars: ${vals.join(', ')}`}>
        {items.map((it, i) => {
          const out = range && (i < range[0] || i > range[1]);
          return (
            <motion.div key={it.id} layout transition={{ type: 'spring', stiffness: 380, damping: 32 }} className={`flex min-w-0 max-w-[56px] flex-1 flex-col items-center justify-end ${split !== null && i === split ? 'mr-4' : ''}`} style={{ opacity: out ? 0.28 : 1 }}>
              <span className="mb-1 text-xs font-semibold tabular-nums text-slate-700 dark:text-zinc-200 font-mono">{it.v}</span>
              <motion.div className={`w-full rounded-t-md ${MARK[mark[it.id]] || 'bg-slate-400 dark:bg-zinc-500'}`} animate={{ height: h(it.v) }} transition={{ duration: 0.25 }} />
              <span className="mt-1 text-[10px] tabular-nums text-slate-400 dark:text-zinc-500 font-mono">{i}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">{LEGEND.map(([c, t]) => <span key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${c}`} />{t}</span>)}</div>
        {range && <span className="tabular-nums font-mono">active range [{range[0]}..{range[1]}] · depth {depth}</span>}
      </div>
    </div>
  );
}
