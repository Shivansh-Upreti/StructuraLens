import { AnimatePresence, motion } from 'framer-motion';

/* Backtracking board: queens pop in on PLACE, shake on CONFLICT (with a line to the attacker), shrink away on REMOVE. */
const KIND_RING = { place: 'ring-green-500', conflict: 'ring-rose-500', remove: 'ring-amber-500' };

export default function BoardViz({ frame }) {
  const { n, queens, trying, attacker, placed, backtracks, solutions, status, kind } = frame;
  const solved = status === 'solved';
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">placements: {placed}</span>
        <span className="rounded-md bg-amber-100 px-3 py-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">backtracks: {backtracks}</span>
        <span className="rounded-md bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">solutions: {solutions.length}</span>
      </div>
      <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: 'min(460px, calc(var(--viz-h, 520px) - 100px))' }}>
        <div className={`grid h-full w-full overflow-hidden rounded-md ring-2 ${solved ? 'ring-green-500' : 'ring-slate-300 dark:ring-zinc-700'}`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} role="img" aria-label={`${n} by ${n} board`}>
          {Array.from({ length: n * n }, (_, k) => {
            const r = Math.floor(k / n), c = k % n, dark = (r + c) % 2 === 1;
            const isTry = trying && trying.r === r && trying.c === c;
            return (
              <div key={k} className={`relative flex items-center justify-center ${dark ? 'bg-slate-300/70 dark:bg-zinc-700/70' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                {isTry && <motion.div key={kind + r + c} initial={{ opacity: 0.2 }} animate={{ opacity: 1, x: kind === 'conflict' ? [0, -4, 4, -3, 0] : 0 }} transition={{ duration: 0.35 }} className={`absolute inset-1 rounded-md ring-4 ${KIND_RING[kind] || 'ring-amber-500'}`} />}
                <AnimatePresence>
                  {queens[r] === c && (
                    <motion.span key="q" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}
                      className={`select-none text-[clamp(20px,6vw,40px)] leading-none ${attacker && attacker.r === r && attacker.c === c ? 'text-rose-600 dark:text-rose-400' : solved ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-fg'}`}>♛</motion.span>
                  )}
                </AnimatePresence>
                {isTry && queens[r] !== c && kind === 'conflict' && <span className="absolute text-2xl font-bold text-rose-600 dark:text-rose-400">×</span>}
              </div>
            );
          })}
        </div>
        {attacker && trying && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${n} ${n}`} aria-hidden="true">
            <line x1={attacker.c + 0.5} y1={attacker.r + 0.5} x2={trying.c + 0.5} y2={trying.r + 0.5} className="stroke-rose-500" strokeWidth="0.08" strokeDasharray="0.2 0.15" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-green-500" />place (choose)</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-rose-500" />conflict detected</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-amber-500" />remove (backtrack)</span>
      </div>
    </div>
  );
}
