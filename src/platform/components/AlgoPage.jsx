import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MODULES } from '../algorithms/index.js';
import { VIZ } from '../viz/index.js';
import { defaults, normalize } from '../params.js';
import { useFrames } from '../useFrames.js';
import { useStepper } from '../useStepper.js';
import { KIND_HINTS } from '../explanations.js';
import { CONTRACTS, GENERIC_STARTER } from '../code/contracts.js';
import CodeTracer from './CodeTracer.jsx';
import ParamFields from './ParamFields.jsx';
import VisualizerControls from './VisualizerControls.jsx';
import ExplainPanel, { ModeToggle, useExplainMode } from './ExplainPanel.jsx';
import CustomCodeWorkspace from './CustomCodeWorkspace.jsx';
import MobileTabs from './MobileTabs.jsx';
import Toasts from '../../components/Toasts.jsx';

const KIND = {
  info: ['Info', 'text-slate-500 dark:text-zinc-400', 'border-slate-300 dark:border-zinc-600', 'active'],
  compare: ['Compare', 'text-amber-700 dark:text-amber-300', 'border-amber-400', 'warn'],
  divide: ['Divide', 'text-violet-700 dark:text-violet-300', 'border-violet-500', 'active'],
  merge: ['Merge', 'text-violet-700 dark:text-violet-300', 'border-violet-500', 'active'],
  pivot: ['Pivot', 'text-violet-700 dark:text-violet-300', 'border-violet-500', 'active'],
  swap: ['Swap / move', 'text-rose-700 dark:text-rose-300', 'border-rose-500', 'bad'],
  conflict: ['Conflict', 'text-rose-700 dark:text-rose-300', 'border-rose-500', 'bad'],
  remove: ['Backtrack: remove', 'text-amber-700 dark:text-amber-300', 'border-amber-500', 'warn'],
  deadend: ['Dead end', 'text-rose-700 dark:text-rose-300', 'border-rose-500', 'bad'],
  reject: ['Reject', 'text-rose-700 dark:text-rose-300', 'border-rose-500', 'bad'],
  fail: ['Not found', 'text-rose-700 dark:text-rose-300', 'border-rose-500', 'bad'],
  discard: ['Discard half', 'text-sky-700 dark:text-sky-300', 'border-sky-500', 'done'],
  move: ['Move pointer', 'text-sky-700 dark:text-sky-300', 'border-sky-500', 'done'],
  trace: ['Traceback', 'text-sky-700 dark:text-sky-300', 'border-sky-500', 'done'],
  match: ['Match', 'text-green-700 dark:text-green-400', 'border-green-600', 'active'],
  pick: ['Choose', 'text-green-700 dark:text-green-400', 'border-green-600', 'active'],
  place: ['Place', 'text-green-700 dark:text-green-400', 'border-green-600', 'active'],
  done: ['Done', 'text-green-700 dark:text-green-400', 'border-green-600', 'done'],
};

function Pill({ children, tone = 'green' }) {
  const t = {
    green: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
  };
  return <span className={`pill !px-2.5 !py-0.5 ${t[tone]}`}>{children}</span>;
}

function Seg({ value, onChange, items, layout, label, className = '' }) {
  return (
    <div className={`inline-flex flex-wrap rounded-md bg-slate-100 p-1 dark:bg-zinc-800 ${className}`} role="tablist" aria-label={label}>
      {items.map(([id, text]) => (
        <button key={id} role="tab" type="button" aria-selected={value === id} onClick={() => onChange(id)} className={`relative rounded-md px-3 py-1 text-sm font-semibold transition-colors max-lg:whitespace-nowrap ${value === id ? 'text-green-700 dark:text-green-300' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
          {value === id && <motion.span layoutId={layout} className="absolute inset-0 rounded-md bg-white dark:bg-zinc-950" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span className="relative">{text}</span>
        </button>
      ))}
    </div>
  );
}

export default function AlgoPage({ moduleId }) {
  const mod = MODULES[moduleId];
  const [algoId, setAlgoId] = useState(mod.algos[0].id);
  const algo = mod.algos.find((a) => a.id === algoId) || mod.algos[0];
  const placeholder = !!algo.placeholder;
  const schema = algo.params || mod.params;
  const [rawByAlgo, setRawByAlgo] = useState({});
  const raw = rawByAlgo[algo.id] || defaults(schema);
  const typed = useMemo(() => normalize(schema, raw), [schema, raw]);
  const { frames, loading, error, truncated } = useFrames(moduleId, algo.id, typed, !placeholder);
  const total = frames ? frames.length : 1;
  const st = useStepper(total, JSON.stringify([algo.id, typed]));
  const frame = frames ? frames[Math.min(st.pos, frames.length - 1)] : null;
  const Viz = VIZ[algo.viz || mod.viz];
  const [explainMode, setExplainMode] = useExplainMode();
  const [selLine, setSelLine] = useState(1);
  const [leftTab, setLeftTab] = useState('trace');
  const [codeByAlgo, setCodeByAlgo] = useState({});
  const [correction, setCorrection] = useState(false);
  const [mobileTab, setMobileTab] = useState('code');   // < 1024px only: 'code' | 'viz'
  useEffect(() => { setSelLine(1); }, [algo.id]);

  const contract = CONTRACTS[algo.id];
  const starter = contract ? contract.starter : GENERIC_STARTER;
  const code = codeByAlgo[algo.id] ?? starter;

  const onParam = useCallback((key, val) => setRawByAlgo((m) => ({ ...m, [algo.id]: { ...(m[algo.id] || defaults(schema)), [key]: val } })), [algo.id, schema]);

  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const t = [];
    if (error) t.push({ id: 'e' + error, tone: 'error', title: 'Could not run this input', msg: error });
    if (truncated) t.push({ id: 'tr', tone: 'warn', title: 'Animation truncated', msg: 'This input produces more steps than can be animated. Try a smaller input.' });
    setToasts(t);
  }, [error, truncated, algo.id]);

  useEffect(() => {
    if (placeholder) return undefined;
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); st.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); st.prev(); }
      else if (e.key === ' ') { e.preventDefault(); st.toggle(); }
      else if (e.key === 'Home') st.reset();
      else if (e.key === 'End') st.seek(total - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const kind = KIND[frame ? frame.kind : 'info'] || KIND.info;
  const hint = KIND_HINTS[explainMode === 'beginner' ? 'b' : 'a'][frame ? frame.kind : 'info'];

  return (
    <div className="flex flex-col lg:h-[calc(100vh-3.5rem-1px)] lg:overflow-hidden">
      {/* ---- header: topic, algorithm switch, complexity, explanation level ---- */}
      <div className="flex-none border-b border-slate-200 px-4 py-2 dark:border-zinc-800">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 max-lg:order-1">
            <p className="eyebrow flex items-center gap-2 !text-[10px] text-green-700 dark:text-green-300">{mod.branch}{mod.advanced && <span className="rounded-md bg-amber-100 px-1.5 py-px text-[9px] font-bold tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">ADVANCED</span>}</p>
            <h1 className=" text-2xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">{mod.title}</h1>
          </div>
          {mod.algos.length > 1 && <Seg value={algo.id} onChange={setAlgoId} items={mod.algos.map((a) => [a.id, a.title])} layout={'algo-' + moduleId} label="Algorithm" className="max-lg:order-3 max-lg:w-full max-lg:flex-nowrap max-lg:overflow-x-auto" />}
          <div className="hidden flex-wrap items-center gap-1.5 xl:flex">
            <Pill>⏱ {algo.complexity.time.length > 30 ? algo.complexity.time.split(/[ (,]/)[0] : algo.complexity.time}</Pill>
            <Pill>▥ {algo.complexity.space.length > 24 ? algo.complexity.space.split(/[ (,]/)[0] : algo.complexity.space}</Pill>
            {placeholder && <Pill tone="amber">Preview</Pill>}
          </div>
          <div className="ml-auto flex items-center gap-2 max-lg:order-2"><span className="eyebrow hidden !text-[10px] sm:inline">Explain</span><ModeToggle mode={explainMode} onMode={setExplainMode} /></div>
        </div>
      </div>

      <MobileTabs value={mobileTab} onChange={setMobileTab} items={[['code', 'Code Editor'], ['viz', 'Visualization']]} layout="mobtab-algo" />

      {/* ---- side-by-side split from 1024px: left = code, right = visualizer. Below that only the active tab is shown. ---- */}
      <div className="mx-auto grid min-h-0 w-full max-w-[1700px] flex-1 gap-3 p-3 max-lg:pb-28 lg:grid-cols-2">
        <section className={`card flex min-w-0 flex-col !p-3 max-lg:h-[calc(100dvh-22rem)] max-lg:min-h-[340px] lg:min-h-0 ${mobileTab === 'code' ? '' : 'max-lg:hidden'}`} aria-label="Code">
          <div className="mb-2 flex flex-none items-center justify-between gap-2">
            <Seg value={leftTab} onChange={setLeftTab} items={[['trace', 'Code'], ['code', 'My code'], ['explain', 'Explain']]} layout="lefttab" label="Left pane" />
            <span className="truncate text-xs text-slate-500 dark:text-zinc-400">{leftTab === 'trace' && (placeholder ? 'click a line' : `step ${st.pos + 1} / ${total}`)}</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {leftTab === 'trace' && (
              <>
                <CodeTracer bare title={algo.title} code={algo.code} line={placeholder ? selLine : (frame ? frame.line : 0)} tone={placeholder ? 'active' : kind[3]} onLineClick={placeholder ? setSelLine : undefined} />
                <section aria-live="polite" className={`mt-2 max-h-[34%] min-h-[72px] flex-none overflow-auto rounded-md border-l-4 bg-slate-100/70 p-3 dark:bg-zinc-950/60 ${placeholder ? 'border-green-600' : kind[2]}`}>
                  {placeholder ? (
                    <>
                      <p className="eyebrow text-green-700 dark:text-green-300">Line {selLine}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-zinc-200">{algo.lines[selLine] || 'Select a line to see what it does.'}</p>
                    </>
                  ) : (
                    <motion.div key={st.pos + algo.id} initial={{ opacity: 0.3, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14 }}>
                      <p className={`eyebrow ${kind[1]}`}>{kind[0]}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-zinc-100">{frame ? frame.note : 'Computing…'}</p>
                      {hint && <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-zinc-400"><b className="font-semibold text-slate-600 dark:text-zinc-300">{explainMode === 'beginner' ? 'In plain words: ' : 'Analysis: '}</b>{hint}</p>}
                    </motion.div>
                  )}
                </section>
              </>
            )}
            {leftTab === 'code' && (
              <CustomCodeWorkspace key={algo.id} moduleId={moduleId} algo={algo} code={code} setCode={(v) => setCodeByAlgo((m) => ({ ...m, [algo.id]: v }))}
                resetToStarter={() => setCodeByAlgo((m) => { const n = { ...m }; delete n[algo.id]; return n; })} correction={correction} setCorrection={setCorrection} />
            )}
            {leftTab === 'explain' && <div className="min-h-0 flex-1 overflow-auto pr-1"><ExplainPanel moduleId={moduleId} algo={algo} kind={frame ? frame.kind : 'info'} mode={explainMode} placeholderLine={placeholder ? algo.lines[selLine] : null} /></div>}
          </div>
        </section>

        <section className={`card flex min-w-0 flex-col !p-3 max-lg:h-[calc(100dvh-22rem)] max-lg:min-h-[340px] lg:min-h-0 ${mobileTab === 'viz' ? '' : 'max-lg:hidden'}`} aria-label="Visualization">
          <div className="mb-2 flex flex-none flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Visualizer</h2>
            {schema.length > 0 && <div className="min-w-0 flex-1 basis-[280px]"><ParamFields schema={schema} values={raw} onChange={onParam} /></div>}
          </div>
          <div className={`min-h-0 flex-1 overflow-auto ${loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}`} style={{ '--viz-h': 'calc(100vh - 17rem)' }}>
            {placeholder ? (
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center dark:border-zinc-700">
                <p className="eyebrow text-amber-700 dark:text-amber-300">Planned visualization</p>
                <p className="mx-auto mt-2 max-w-xl text-slate-700 dark:text-zinc-200">{algo.planned}</p>
                <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">The pseudo-code, explanations and complexity are ready now. The animation plugs into the same step engine used by the other topics. Open <b>Explain</b> or click a line of code.</p>
              </div>
            ) : (frame && Viz ? <Viz frame={frame} /> : <p className="py-16 text-center text-slate-400">Preparing animation…</p>)}
          </div>
        </section>
      </div>

      {!placeholder && <VisualizerControls inline pos={st.pos} total={total} playing={st.playing} speed={st.speed} disabled={!frames}
        onReset={st.reset} onPrev={st.prev} onToggle={st.toggle} onNext={st.next} onSeek={st.seek} onSpeed={st.setSpeed} />}
      <Toasts toasts={toasts} onClose={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
