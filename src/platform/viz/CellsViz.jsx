import { motion } from 'framer-motion';

/* Searching: array cells with lo / mid / hi (or i) pointer badges and eliminated cells faded out. */
const BADGE = { lo: 'bg-sky-600 text-white', mid: 'bg-amber-500 text-white', hi: 'bg-violet-600 text-white', i: 'bg-amber-500 text-white' };

export default function CellsViz({ frame }) {
  const { cells, ptr, gone, found, target } = frame;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-md bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">target = {target}</span>
        {found !== null && found >= 0 && <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-md bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">found at index {found}</motion.span>}
        {found === -1 && <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-md bg-rose-100 px-3 py-1 font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-mono">not found</motion.span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2 rounded-md bg-slate-100/60 p-4 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" role="img" aria-label={`Array: ${cells.join(', ')}`}>
        {cells.map((v, i) => {
          const isFound = found === i, isMid = ptr.mid === i || ptr.i === i;
          const tags = ['lo', 'mid', 'hi'].filter((k) => ptr[k] === i).concat(ptr.i === i ? ['i'] : []);
          return (
            <div key={i} className="flex w-14 flex-col items-center">
              <motion.div animate={{ opacity: gone[i] ? 0.3 : 1, scale: isMid || isFound ? 1.08 : 1 }} transition={{ duration: 0.25 }}
                className={`flex h-14 w-full items-center justify-center rounded-md border-2 text-lg font-semibold tabular-nums ${isFound ? 'border-green-600 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200' : isMid ? 'border-amber-500 bg-amber-50 text-slate-900 dark:bg-amber-900/30 dark:text-fg' : 'border-slate-300 bg-white text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-fg'} ${gone[i] ? 'line-through' : ''}`}>{v}</motion.div>
              <span className="mt-1 text-[10px] tabular-nums text-slate-400 dark:text-zinc-500 font-mono">{i}</span>
              <div className="mt-0.5 flex h-5 gap-0.5">
                {tags.map((t) => <motion.span key={t} layoutId={'ptr-' + t} className={`rounded px-1 text-[10px] font-bold uppercase ${BADGE[t]}`}>{t}</motion.span>)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">Faded cells have been ruled out. Pointer badges glide to their new cell when they move.</p>
    </div>
  );
}
