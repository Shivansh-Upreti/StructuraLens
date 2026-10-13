import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { tokenize } from '../platform/tokenize.js';

const ROW = 26;
// executing = accent; returning = completed grey; overflow = error red
const BAR = { active: 'border-accent-600 bg-accent-100/80 dark:border-accent dark:bg-accent/10', ret: 'border-slate-400 bg-slate-100 dark:border-fg-done dark:bg-panel-2', overflow: 'border-red-500 bg-red-100/80 dark:bg-red-500/15' };

export default function CodePanel({ title, source, state, flash, editing, draft, onDraft, onToggleEdit, custom, lang = 'javascript', langLabel }) {
  const lines = source.split('\n');
  const box = useRef(null);
  const last = state && state.last;
  const line = last ? last.line : 0;
  useEffect(() => {
    const el = box.current; if (!el || !line) return;
    const top = (line - 1) * ROW + 8;
    if (top < el.scrollTop + 8 || top + ROW > el.scrollTop + el.clientHeight - 8) el.scrollTo({ top: Math.max(0, top - el.clientHeight / 2), behavior: 'smooth' });
  }, [line, source]);
  const kind = !last ? null : last.k === 'ret' ? 'ret' : last.k === 'overflow' ? 'overflow' : 'active';
  return (
    <section className="card flex min-h-0 flex-col" aria-label="Source code">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-fg">{title}{langLabel && <span className="ml-2 font-mono text-xs font-normal text-slate-500 dark:text-fg-muted">{langLabel}</span>}</h2>
        {custom && <button type="button" className="btn !px-3 !py-1 text-xs" onClick={onToggleEdit}>{editing ? 'Preview' : 'Edit code'}</button>}
      </div>
      {editing ? (
        <textarea className="field h-[300px] resize-y font-mono text-[13px] leading-relaxed" value={draft} spellCheck={false} maxLength={8000} aria-label="Your code"
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); onDraft(t.value); } }} />
      ) : (
        <div ref={box} className="max-h-[340px] overflow-auto rounded-md bg-slate-50 py-2 font-mono text-[13px] ring-1 ring-slate-200 dark:bg-canvas dark:ring-line" tabIndex={0} aria-label="Code with current line highlighted">
          <div className="relative min-w-max">
            {kind && <motion.div aria-hidden="true" className={`absolute inset-x-0 top-0 z-0 border-l-4 ${BAR[kind]}`} style={{ height: ROW }} initial={false} animate={{ y: (line - 1) * ROW }} transition={{ duration: 0.18, ease: 'easeOut' }} />}
            {flash && <motion.div key={flash.n} aria-hidden="true" className="absolute inset-x-0 top-0 z-0 bg-accent-300/60 dark:bg-accent/25" style={{ height: ROW, y: (flash.line - 1) * ROW }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.1 }} />}
            {lines.map((ln, i) => {
              const n = i + 1, paused = state && state.waitCounts[n];
              return (
                <div key={i} style={{ height: ROW }} className={`relative z-10 flex items-center whitespace-pre border-l-4 pr-3 ${paused ? 'border-slate-400 bg-slate-100 dark:border-zinc-600 dark:bg-panel-2' : 'border-transparent'}`}>
                  <span className="w-10 flex-none select-none pr-3 text-right text-slate-400 dark:text-zinc-500">{n}</span>
                  <span className="flex-1">{ln ? tokenize(ln, lang).map(([w, c], j) => <span key={j} className={c}>{w}</span>) : ' '}</span>
                  {paused ? <span className="ml-3 rounded-sm bg-slate-200 px-2 py-px font-mono text-[11px] font-semibold text-slate-700 dark:bg-line dark:text-fg-done" title={`${paused} frame(s) are paused on this line`}>wait ×{paused}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-zinc-400">
        <span className="font-mono"><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-accent-600 dark:bg-accent" />executing</span>
        <span className="font-mono"><i className="mr-1.5 inline-block h-2.5 w-2.5 border border-slate-400 dark:border-zinc-600" />paused (wait ×n = frames)</span>
        <span className="font-mono"><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-slate-300 dark:bg-fg-done" />returning</span>
        <span className="font-mono"><i className="mr-1.5 inline-block h-2.5 w-2.5 bg-red-500" />depth limit</span>
      </div>
    </section>
  );
}
