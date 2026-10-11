import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const ROW = 26;
const KW = new Set(['function', 'return', 'if', 'else', 'const', 'let', 'var', 'for', 'while', 'new', 'in', 'of', 'true', 'false', 'null', 'undefined', 'print', 'Math']);

function tokenize(line) {
  const ci = line.indexOf('//');
  const code = ci >= 0 ? line.slice(0, ci) : line, comment = ci >= 0 ? line.slice(ci) : '';
  const out = []; const re = /([A-Za-z_$][\w$]*)(?=\s*\()|[A-Za-z_$][\w$]*|\d+|\s+|./g; let m;
  while ((m = re.exec(code))) {
    const w = m[0]; let cls = '';
    if (KW.has(w)) cls = 'text-purple-600 dark:text-purple-400'; else if (/^\d+$/.test(w)) cls = 'text-orange-600 dark:text-orange-400'; else if (m[1]) cls = 'text-blue-700 dark:text-blue-400';
    out.push([w, cls]);
  }
  if (comment) out.push([comment, 'italic text-slate-400 dark:text-zinc-500']);
  return out;
}

const BAR = { active: 'border-green-600 bg-green-100/80 dark:bg-green-900/40', ret: 'border-sky-500 bg-sky-100/80 dark:bg-sky-900/40', overflow: 'border-red-500 bg-red-100/80 dark:bg-red-900/40' };

export default function CodePanel({ title, source, state, flash, editing, draft, onDraft, onToggleEdit, custom }) {
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
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        {custom && <button type="button" className="btn !px-3 !py-1 text-xs" onClick={onToggleEdit}>{editing ? 'Preview' : 'Edit code'}</button>}
      </div>
      {editing ? (
        <textarea className="field h-[300px] resize-y font-mono text-[13px] leading-relaxed" value={draft} spellCheck={false} maxLength={8000} aria-label="Your JavaScript code"
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); onDraft(t.value); } }} />
      ) : (
        <div ref={box} className="max-h-[340px] overflow-auto rounded-md bg-slate-50 dark:bg-zinc-950 py-2 font-mono text-[13px] ring-1 ring-slate-100 dark:ring-zinc-800" tabIndex={0} aria-label="Code with current line highlighted">
          <div className="relative min-w-max">
            {kind && <motion.div aria-hidden="true" className={`absolute inset-x-0 top-0 z-0 border-l-4 ${BAR[kind]}`} style={{ height: ROW }} initial={false} animate={{ y: (line - 1) * ROW }} transition={{ type: 'spring', stiffness: 420, damping: 38 }} />}
            {flash && <motion.div key={flash.n} aria-hidden="true" className="absolute inset-x-0 top-0 z-0 bg-green-300/60 dark:bg-green-500/40" style={{ height: ROW, y: (flash.line - 1) * ROW }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.1 }} />}
            {lines.map((ln, i) => {
              const n = i + 1, paused = state && state.waitCounts[n];
              return (
                <div key={i} style={{ height: ROW }} className={`relative z-10 flex items-center whitespace-pre border-l-4 pr-3 ${paused ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/40' : 'border-transparent'}`}>
                  <span className="w-10 flex-none select-none pr-3 text-right text-slate-400 dark:text-zinc-500">{n}</span>
                  <span className="flex-1">{ln ? tokenize(ln).map(([w, c], j) => <span key={j} className={c}>{w}</span>) : ' '}</span>
                  {paused ? <span className="ml-3 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2 py-px font-sans text-[11px] font-semibold text-amber-800 dark:text-amber-300 font-mono" title={`${paused} frame(s) are paused on this line`}>⏸ ×{paused}</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-zinc-400">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-600" />executing</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />paused (⏸ ×n frames)</span>
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />returning</span>
      </div>
    </section>
  );
}
