import { AnimatePresence, motion } from 'framer-motion';

/* A* grid: every discovered node shows g (cost so far), h (heuristic estimate) and f = g + h. The open list is the priority queue. */
const key = (r, c) => r + ',' + c;

export default function GridViz({ frame }) {
  const { rows, cols, walls, start, goal, info, cur, openList, path, expanded, heuristic } = frame;
  const wallSet = new Set(walls.map(([r, c]) => key(r, c))), pathSet = new Set(path.map(([r, c]) => key(r, c)));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_210px]">
      <div>
        <div className="grid gap-1 rounded-md bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label="Search grid">
          {Array.from({ length: rows * cols }, (_, k) => {
            const r = Math.floor(k / cols), c = k % cols, kk = key(r, c), n = info[kk];
            const isS = start[0] === r && start[1] === c, isG = goal[0] === r && goal[1] === c;
            const isCur = cur && cur[0] === r && cur[1] === c;
            let cls = 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800';
            if (wallSet.has(kk)) cls = 'bg-slate-700 dark:bg-zinc-600 border-transparent';
            else if (pathSet.has(kk)) cls = 'bg-accent-600 text-white border-accent-700 dark:bg-accent dark:text-canvas dark:border-accent';
            else if (isCur) cls = 'bg-green-100 dark:bg-green-900/50 border-green-600';
            else if (n && n.s === 'open') cls = 'bg-amber-100 dark:bg-amber-900/40 border-amber-500';
            else if (n && n.s === 'closed') cls = 'bg-slate-100 text-slate-500 dark:bg-panel dark:text-fg-done border-slate-300 dark:border-line';
            return (
              <motion.div key={k} layout animate={{ scale: isCur ? 1.06 : 1 }} className={`relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border text-slate-800 dark:text-fg ${cls}`}>
                {(isS || isG) && <span className={`absolute left-0.5 top-0 text-[10px] font-extrabold ${pathSet.has(kk) ? 'text-white' : isS ? 'text-green-700 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}`}>{isS ? 'S' : 'G'}</span>}
                {n && !wallSet.has(kk) && (
                  <>
                    <span className="text-[clamp(10px,1.6vw,17px)] font-bold leading-none tabular-nums font-mono">{n.f}</span>
                    <span className={`mt-0.5 text-[clamp(7px,1vw,10px)] leading-none tabular-nums ${pathSet.has(kk) ? 'text-white/90' : 'text-slate-500 dark:text-zinc-400'}`}>g{n.g} h{n.h}</span>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          {[['bg-amber-300', 'open (in the priority queue)'], ['border border-slate-300 bg-slate-100 dark:border-line dark:bg-panel', 'closed (expanded)'], ['bg-green-200', 'current'], ['bg-green-600', 'final path'], ['bg-slate-700', 'wall']].map(([c, t]) => <span key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{t}</span>)}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Each cell: <b className="text-slate-800 dark:text-fg">f</b> large, with g (cost so far) and h (estimate to goal) beneath. f = g + h.</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">expanded: {expanded}</span>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">{heuristic === 'zero' ? 'h = 0 (Dijkstra)' : 'h = Manhattan'}</span>
        </div>
        <div>
          <p className="eyebrow mb-1.5">Open list (priority queue, best first)</p>
          <div className="flex max-h-[300px] flex-col gap-1 overflow-auto rounded-md bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <AnimatePresence initial={false}>
              {openList.map((o, i) => (
                <motion.div layout key={o.r + ',' + o.c} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className={`flex items-center justify-between rounded-md px-2 py-1 font-mono text-xs ${i === 0 ? 'bg-green-100 text-green-900 ring-1 ring-green-600 dark:bg-green-900/40 dark:text-green-200' : 'bg-white text-slate-700 dark:bg-zinc-900 dark:text-zinc-200'}`}>
                  <span>({o.r},{o.c})</span><span><b>f={o.f}</b> <span className="opacity-70">g{o.g}+h{o.h}</span></span>
                </motion.div>
              ))}
            </AnimatePresence>
            {!openList.length && <span className="px-1 py-2 text-xs text-slate-400 dark:text-zinc-500">empty</span>}
          </div>
          {openList.length > 0 && <p className="mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400">The top entry is popped next.</p>}
        </div>
      </div>
    </div>
  );
}
