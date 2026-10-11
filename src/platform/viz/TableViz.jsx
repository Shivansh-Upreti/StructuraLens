import { motion } from 'framer-motion';

/* Dynamic programming: the memo table fills cell by cell; the cells the current answer is built from are highlighted. */
const show = (v) => (v === null ? '' : v === Infinity ? '∞' : String(v));
const has = (list, r, c) => list.some((p) => p[0] === r && p[1] === c);

export default function TableViz({ frame }) {
  const { rows, cols, cells, cur, deps, path, formula, answer } = frame;
  return (
    <div>
      <div className="mb-3 flex min-h-[28px] flex-wrap items-center gap-2 text-sm">
        {formula && <span className="rounded-md bg-amber-100 px-3 py-1 font-mono font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{formula}</span>}
        {answer !== null && <span className="rounded-md bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">answer = {answer}</span>}
      </div>
      <div className="max-h-[420px] overflow-auto rounded-md bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
        <table className="mx-auto border-separate border-spacing-1 text-center text-sm" aria-label="Dynamic programming table">
          <thead><tr><th />{cols.map((c, j) => <th key={j} className="px-1 font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">{c}</th>)}</tr></thead>
          <tbody>
            {cells.map((row, i) => (
              <tr key={i}>
                <th className="whitespace-nowrap pr-2 text-right font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">{rows[i]}</th>
                {row.map((v, j) => {
                  const isCur = cur && cur[0] === i && cur[1] === j, isDep = has(deps, i, j), isPath = has(path, i, j);
                  return (
                    <motion.td key={j} animate={{ scale: isCur ? 1.12 : 1 }} transition={{ duration: 0.2 }}
                      className={`h-9 min-w-[36px] rounded-md font-mono font-semibold tabular-nums transition-colors ${isCur ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-600' : isPath ? 'bg-green-600 text-white' : isDep ? 'bg-sky-200 text-slate-900 dark:bg-sky-500/40 dark:text-sky-100' : v === null ? 'border border-dashed border-slate-300 text-transparent dark:border-zinc-700' : 'bg-white text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}>
                      {show(v)}
                    </motion.td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
        {[['bg-amber-400', 'cell being computed'], ['bg-sky-300', 'cells it depends on'], ['bg-green-600', 'traceback path'], ['border border-dashed border-slate-400', 'not computed yet']].map(([c, t]) => <span key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{t}</span>)}
      </div>
    </div>
  );
}
