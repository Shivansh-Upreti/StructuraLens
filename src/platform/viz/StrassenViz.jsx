import { motion } from 'framer-motion';

/* Strassen on 2×2: the seven products appear one at a time, then the four result entries are assembled from them. */
function Mat({ m, label, hi }) {
  return (
    <div className="text-center">
      <p className="eyebrow mb-1">{label}</p>
      <div className="inline-grid grid-cols-2 gap-1 rounded-md border-x-4 border-slate-400 px-2 py-1 dark:border-zinc-500">
        {m.flat().map((v, k) => (
          <motion.span key={k} animate={{ scale: hi && hi.includes(k) ? 1.15 : 1 }} className={`flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-bold tabular-nums ${v === null ? 'border border-dashed border-slate-300 text-transparent dark:border-zinc-600' : 'bg-white text-slate-900 dark:bg-zinc-800 dark:text-white'}`}>{v === null ? '·' : v}</motion.span>
        ))}
      </div>
    </div>
  );
}

export default function StrassenViz({ frame }) {
  const { A, B, M, formulas, C, cur, mults, check } = frame;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-5">
        <Mat m={A} label="A" /><span className="text-xl text-slate-400">×</span><Mat m={B} label="B" /><span className="text-xl text-slate-400">=</span><Mat m={C} label="C" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-md bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">multiplications used: {mults} / 7</span>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">schoolbook: 8</span>
        {check && <span className="rounded-md bg-violet-100 px-3 py-1 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 font-mono">matches ordinary product ✓</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {M.map((v, k) => (
          <motion.div key={k} animate={{ opacity: v === null ? 0.35 : 1, scale: cur === k ? 1.05 : 1 }} className={`rounded-md border p-2 text-center ${cur === k ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30' : v === null ? 'border-dashed border-slate-300 dark:border-zinc-700' : 'border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'}`}>
            <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">{formulas[k]}</p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">{v === null ? '?' : v}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">Here the "blocks" are single numbers. In the full algorithm each M is a recursive multiplication of n/2 × n/2 blocks, giving T(n) = 7T(n/2) + Θ(n²).</p>
    </div>
  );
}
