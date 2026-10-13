import { motion } from 'framer-motion';

/* KMP: the pattern slides along the text. Matched characters turn green, the mismatch red; the lps table sits under the pattern. */
const CELL = 34;

function Cell({ ch, tone, label }) {
  const cls = {
    match: 'border-green-600 bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200',
    bad: 'border-rose-500 bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200',
    cur: 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    none: 'border-slate-300 bg-white text-slate-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-fg',
    found: 'border-accent bg-accent text-canvas',
  }[tone];
  return (
    <div className="flex flex-col items-center" style={{ width: CELL }}>
      <div className={`flex h-9 w-[30px] items-center justify-center rounded-md border-2 font-mono text-sm font-bold ${cls}`}>{ch}</div>
      <span className="mt-0.5 h-3 text-[9px] tabular-nums text-slate-400 dark:text-zinc-500 font-mono">{label}</span>
    </div>
  );
}

export default function StrMatchViz({ frame }) {
  const { text, pat, i, j, offset, lps, phase, lpsAt, found, bad } = frame;
  const inFound = (k) => found && k >= found[0] && k <= found[1];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">phase: {phase === 'lps' ? 'build lps table' : 'search'}</span>
        {phase === 'search' && <span className="rounded-md bg-slate-100 px-3 py-1 tabular-nums text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 font-mono">i = {i}, j = {j}</span>}
        {found && <span className="rounded-md bg-green-100 px-3 py-1 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-mono">found at index {found[0]}</span>}
      </div>
      <div className="overflow-x-auto rounded-md bg-slate-100/60 p-3 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
        {phase === 'search' && (
          <>
            <p className="eyebrow mb-1">Text</p>
            <div className="flex" style={{ width: text.length * CELL }}>
              {text.map((ch, k) => {
                const inWin = k >= offset && k < offset + pat.length;
                let tone = 'none';
                if (inFound(k)) tone = 'found'; else if (inWin && k < i) tone = 'match'; else if (k === i) tone = bad ? 'bad' : 'cur';
                return <Cell key={k} ch={ch} tone={tone} label={k} />;
              })}
            </div>
            <p className="eyebrow mb-1 mt-3">Pattern (slides right; never the text pointer left)</p>
            <motion.div className="flex" animate={{ x: offset * CELL }} transition={{ duration: 0.18, ease: 'easeOut' }} style={{ width: pat.length * CELL }}>
              {pat.map((ch, k) => <Cell key={k} ch={ch} tone={found ? 'found' : k < j ? 'match' : k === j ? (bad ? 'bad' : 'cur') : 'none'} label={k} />)}
            </motion.div>
          </>
        )}
        {phase === 'lps' && (
          <>
            <p className="eyebrow mb-1">Pattern</p>
            <div className="flex" style={{ width: pat.length * CELL }}>{pat.map((ch, k) => <Cell key={k} ch={ch} tone={k === lpsAt ? 'cur' : 'none'} label={k} />)}</div>
          </>
        )}
        <p className="eyebrow mb-1 mt-3">lps table (longest proper prefix that is also a suffix)</p>
        <div className="flex" style={{ width: pat.length * CELL }}>
          {lps.map((v, k) => <Cell key={k} ch={v === null ? '·' : v} tone={phase === 'lps' && k === lpsAt ? 'cur' : phase === 'search' && j > 0 && k === j - 1 ? 'match' : 'none'} label={k} />)}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
        {[['bg-green-500', 'matched'], ['bg-amber-400', 'being compared'], ['bg-rose-500', 'mismatch']].map(([c, t]) => <span key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm ${c}`} />{t}</span>)}
      </div>
    </div>
  );
}
