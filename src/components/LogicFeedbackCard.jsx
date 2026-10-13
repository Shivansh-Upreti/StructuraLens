/* One validator finding: severity chip, line number, explanation and (for fixable slips) a before/after diff with an
   "Accept suggestion" button that rewrites exactly that line. Shared by every "My code" workspace. */
export const SEV = {
  major: { label: 'Incorrect logic', chip: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', bar: 'bg-rose-500/20', dot: 'bg-rose-500' },
  minor: { label: 'Minor mistake', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', bar: 'bg-slate-400/20 dark:bg-zinc-500/20', dot: 'bg-slate-500 dark:bg-zinc-300' },
  opt: { label: 'Optimization', chip: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300', bar: 'bg-sky-400/15', dot: 'bg-sky-400' },
};

export default function LogicFeedbackCard({ finding: f, code, onAccept }) {
  const before = f.fix ? (code.split('\n')[f.line - 1] || '') : null;
  const after = f.fix ? f.fix(before) : null;
  return (
    <div className="rounded-md bg-white p-2.5 text-xs ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-700">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-px font-bold ${SEV[f.sev].chip}`}>{SEV[f.sev].label}</span>
        <span className="font-mono text-slate-500 dark:text-zinc-400">line {f.line}</span>
      </div>
      {f.title && <p className="mb-0.5 text-[13px] font-semibold text-slate-900 dark:text-fg">{f.title}</p>}
      <p className="leading-relaxed text-slate-700 dark:text-zinc-200">{f.msg}</p>
      {f.fix && before !== after && (
        <div className="mt-1.5">
          <pre className="overflow-auto rounded-md bg-rose-50 px-2 py-1 font-mono text-[11px] text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">- {before.trim()}</pre>
          <pre className="mt-0.5 overflow-auto rounded-md bg-green-50 px-2 py-1 font-mono text-[11px] text-green-900 dark:bg-green-950/40 dark:text-green-200">+ {after.trim()}</pre>
          <button type="button" className="btn btn-primary mt-1.5 !px-3 !py-1 text-xs" onClick={() => onAccept(f)}>Accept suggestion</button>
        </div>
      )}
    </div>
  );
}
