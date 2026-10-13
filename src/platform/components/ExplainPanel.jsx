import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { KIND_HINTS, explainFor } from '../explanations.js';

const KEY = 'structuralens-explain-mode';
const readMode = () => { try { const v = localStorage.getItem(KEY); return v === 'advanced' ? 'advanced' : 'beginner'; } catch (e) { return 'beginner'; } };

/** Remembers the learner's chosen depth across topics and visits. */
export function useExplainMode() {
  const [mode, setModeState] = useState(readMode);
  const setMode = useCallback((m) => { setModeState(m); try { localStorage.setItem(KEY, m); } catch (e) { /* storage blocked */ } }, []);
  return [mode, setMode];
}

const MODES = [['beginner', 'Beginner'], ['advanced', 'Advanced']];

/* Compact segmented control. Intentionally NOT rendered on the legacy Recursion page. */
export function ModeToggle({ mode, onMode }) {
  return (
    <div className="inline-flex rounded-md bg-slate-100 p-0.5 ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-zinc-700" role="radiogroup" aria-label="Explanation level">
      {MODES.map(([id, text]) => (
        <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => onMode(id)} title={id === 'beginner' ? 'Analogies and plain language' : 'Complexity, proofs and trade-offs'}
          className={`relative rounded-md px-3 py-1 text-xs font-semibold transition-colors ${mode === id ? 'text-green-700 dark:text-green-300' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
          {mode === id && <motion.span layoutId="explain-pill" className="absolute inset-0 rounded-md bg-white dark:bg-zinc-950" transition={{ duration: 0.18, ease: 'easeOut' }} />}
          <span className="relative">{text}</span>
        </button>
      ))}
    </div>
  );
}

/** The explanation body for the chosen level (plus the hint for the current step / selected line). */
export default function ExplainPanel({ moduleId, algo, kind, mode, placeholderLine }) {
  const ex = explainFor(moduleId, algo.id);
  const beginner = mode === 'beginner';
  const hint = KIND_HINTS[beginner ? 'b' : 'a'][kind] || null;
  return (
    <motion.div key={mode + algo.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }} className="space-y-4 text-sm leading-relaxed text-slate-700 dark:text-zinc-200" aria-label="Explanation">
      {!ex && <p className="text-slate-500 dark:text-zinc-400">No written explanation for this algorithm yet.</p>}
      {ex && beginner && (
        <>
          <div className="rounded-lg bg-green-50 p-4 ring-1 ring-green-100 dark:bg-green-950/50 dark:ring-green-900">
            <p className="eyebrow mb-1 text-green-700 dark:text-green-400">Think of it like this</p>
            <p className="text-[15px]">{ex.b.analogy}</p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Step by step</p>
            <ol className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-green-700 dark:marker:text-green-400">{ex.b.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        </>
      )}
      {ex && !beginner && (
        <>
          <p className="text-[15px]">{ex.a.summary}</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-green-700 dark:marker:text-green-400">{ex.a.points.map((s) => <li key={s}>{s}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            {[['Time', algo.complexity.time], ['Space', algo.complexity.space]].map(([k, v]) => <span key={k} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs dark:bg-zinc-800 font-mono"><b className="mr-1 text-slate-900 dark:text-fg">{k}</b>{v}</span>)}
          </div>
        </>
      )}
      {(placeholderLine || hint) && (
        <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-zinc-700">
          <p className="eyebrow mb-1">{placeholderLine ? 'This line' : 'This step'}</p>
          <p>{placeholderLine || hint}</p>
        </div>
      )}
      <div className="grid gap-3 border-t border-slate-200 pt-3 dark:border-zinc-800 sm:grid-cols-2">
        <div><p className="eyebrow mb-1">Think first</p><ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-zinc-300">{algo.think.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div><p className="eyebrow mb-1">Watch out for</p><ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-zinc-300">{algo.pitfalls.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
    </motion.div>
  );
}
