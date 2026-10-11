import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { tokenize } from '../tokenize.js';

const ROW = 22;
const BAR = {
  active: 'border-green-600 bg-green-100/80 dark:bg-green-900/40',
  warn: 'border-amber-500 bg-amber-100/80 dark:bg-amber-900/40',
  bad: 'border-rose-500 bg-rose-100/80 dark:bg-rose-900/40',
  done: 'border-sky-500 bg-sky-100/80 dark:bg-sky-900/40',
};

/** Shows source code and slides a highlight to `line` (1-based) in lock-step with the animation. */
export default function CodeTracer({ title = 'Code', code, line, tone = 'active', onLineClick, bare = false }) {
  const lines = code.split('\n');
  const box = useRef(null);
  useEffect(() => {
    const el = box.current; if (!el || !line) return;
    const top = (line - 1) * ROW + 8;
    if (top < el.scrollTop + 8 || top + ROW > el.scrollTop + el.clientHeight - 8) el.scrollTo({ top: Math.max(0, top - el.clientHeight / 2), behavior: 'smooth' });
  }, [line, code]);
  return (
    <section className={bare ? 'flex min-h-0 flex-1 flex-col' : 'card flex min-h-0 flex-col'} aria-label="Source code">
      {!bare && <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-white">{title}</h2>}
      <div ref={box} className={`${bare ? 'min-h-0 flex-1' : 'max-h-[380px]'} overflow-auto rounded-md bg-slate-100/70 py-2 font-mono text-[12.5px] ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800`} tabIndex={0} aria-label="Code with the executing line highlighted">
        <div className="relative min-w-max">
          {line > 0 && <motion.div aria-hidden="true" className={`absolute inset-x-0 top-0 z-0 border-l-4 ${BAR[tone] || BAR.active}`} style={{ height: ROW }} initial={false} animate={{ y: (line - 1) * ROW }} transition={{ type: 'spring', stiffness: 420, damping: 38 }} />}
          {lines.map((ln, i) => (
            <div key={i} style={{ height: ROW }} onClick={onLineClick ? () => onLineClick(i + 1) : undefined} role={onLineClick ? 'button' : undefined} tabIndex={onLineClick ? 0 : undefined}
              onKeyDown={onLineClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLineClick(i + 1); } } : undefined}
              className={`relative z-10 flex items-center whitespace-pre border-l-4 border-transparent pr-3 ${i + 1 === line ? 'font-semibold' : ''} ${onLineClick ? 'cursor-pointer hover:bg-green-50/70 dark:hover:bg-green-900/20' : ''}`}>
              <span className="w-10 flex-none select-none pr-3 text-right text-slate-400 dark:text-zinc-600">{i + 1}</span>
              <span>{ln ? tokenize(ln).map(([w, c], j) => <span key={j} className={c}>{w}</span>) : ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
