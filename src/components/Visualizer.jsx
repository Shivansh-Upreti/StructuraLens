import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StackView from './StackView.jsx';
import TreeView from './TreeView.jsx';

const VIEWS = [['stack', 'Call stack'], ['split', 'Split'], ['tree', 'Recursion tree']];

export default function Visualizer({ trace, state }) {
  const [view, setView] = useState('split');
  const showStack = view !== 'tree', showTree = view !== 'stack';
  return (
    <section className="card flex min-h-[560px] min-w-0 flex-col" aria-label="Visualizer">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-fg">Visualizer</h2>
        <div className="inline-flex rounded-md bg-slate-100 dark:bg-zinc-800 p-1" role="group" aria-label="Visualization view">
          {VIEWS.map(([id, text]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === id ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'}`}>
              {view === id && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-md bg-white dark:bg-zinc-900" transition={{ duration: 0.18, ease: 'easeOut' }} />}
              <span className="relative">{text}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`grid min-h-0 flex-1 gap-4 ${showStack && showTree ? 'lg:grid-cols-[minmax(240px,.85fr)_minmax(0,1.6fr)]' : 'grid-cols-1'}`}>
        <AnimatePresence initial={false} mode="popLayout">
          {showStack && <motion.div key="stack" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-0 min-w-0"><StackView trace={trace} state={state} /></motion.div>}
          {showTree && <motion.div key="tree" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-0 min-w-0"><TreeView trace={trace} state={state} /></motion.div>}
        </AnimatePresence>
      </div>
    </section>
  );
}
