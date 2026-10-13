import { motion } from 'framer-motion';

/* Two pointers: distinct Left / Right arrows that glide between cells (layoutId), as cells or as bars with water. */
function Arrow({ id, label, cls }) {
  return (
    <motion.div layoutId={id} transition={{ duration: 0.18, ease: 'easeOut' }} className={`flex flex-col items-center ${cls}`}>
      <span className="text-[11px] font-bold">{label}</span>
      <span className="-mt-0.5 text-sm leading-none">▼</span>
    </motion.div>
  );
}

const LC = 'text-sky-600 dark:text-sky-400', RC = 'text-violet-600 dark:text-violet-400';

export default function PointersViz({ frame }) {
  const { cells, L, R, mode, verdict, info, water, best } = frame;
  const max = Math.max(...cells.map((x) => (typeof x === 'number' ? x : 1)), 1);
  return (
    <div>
      <div className="mb-3 flex min-h-[28px] flex-wrap items-center gap-3 text-sm">
        {info && <span className="rounded-md bg-slate-100 px-3 py-1 font-semibold tabular-nums text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">{info}</span>}
        {mode === 'bars' && <span className="rounded-md bg-slate-100 px-3 py-1 font-semibold tabular-nums text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">best area = {best}</span>}
        {verdict === 'match' && <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-md bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">result found</motion.span>}
        {verdict === 'miss' && <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-md bg-rose-100 px-3 py-1 font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-mono">no match</motion.span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2 rounded-md bg-slate-100/60 p-4 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" role="img" aria-label={`Left pointer ${L}, right pointer ${R}`}>
        {cells.map((v, i) => {
          const active = i === L || i === R, between = i > L && i < R;
          return (
            <div key={i} className={`flex flex-col items-center ${mode === 'bars' ? 'w-10' : 'w-14'}`}>
              <div className="flex h-9 items-end">
                {i === L && <Arrow id="ptr-L" label={L === R ? 'L=R' : 'L'} cls={LC} />}
                {i === R && L !== R && <Arrow id="ptr-R" label="R" cls={RC} />}
              </div>
              {mode === 'bars' ? (
                <div className="flex h-44 w-full flex-col justify-end">
                  {water && between && v < water.h && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-sky-300/60 dark:bg-sky-500/30" style={{ height: ((water.h - v) / max) * 150 }} />}
                  <motion.div animate={{ height: (v / max) * 150 + 6 }} className={`w-full rounded-t-md ${active ? (i === L ? 'bg-sky-600 dark:bg-sky-500' : 'bg-violet-600 dark:bg-violet-500') : 'bg-slate-400 dark:bg-zinc-600'}`} />
                </div>
              ) : (
                <div className={`flex h-14 w-full items-center justify-center rounded-md border-2 text-lg font-semibold ${i === L ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30' : i === R ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30' : 'border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-900'} text-slate-900 dark:text-fg ${i < L || i > R ? 'opacity-40' : ''}`}>{v}</div>
              )}
              <span className="mt-1 text-[10px] tabular-nums text-slate-500 dark:text-zinc-400 font-mono">{mode === 'bars' ? v : i}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400"><span className={LC}>■ L</span> moves right · <span className={RC}>■ R</span> moves left · faded cells are already ruled out.</p>
    </div>
  );
}
