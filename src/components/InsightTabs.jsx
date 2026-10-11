import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fmt, label, rich } from '../engine/engine.js';
import Parts from './Parts.jsx';

const TABS = [['story', 'Metaphor'], ['analysis', 'Analysis'], ['output', 'Output']];

function liveStory(trace, idx, preset) {
  const m = preset.metaphor;
  for (let i = idx; i >= 0; i--) {
    const e = trace.events[i];
    if (e.k === 'line') continue;
    const n = trace.nodes[e.id], p = n.parent !== null ? trace.nodes[n.parent] : null;
    let tpl;
    if (e.k === 'overflow') tpl = 'The desk is full! The chain was never going to end, so the system gives up (stack overflow).';
    else if (e.k === 'call') tpl = p ? m.call : m.start;
    else tpl = n.children.length ? m.ret : (m.base || m.ret);
    if (e.cached) tpl = '<b>{c}</b> was already in the notebook: answer <b>{v}</b>, no need to ask anyone.';
    return rich(tpl, { c: label(n), p: p ? label(p) : 'the caller', v: fmt(e.value, 30) });
  }
  return null;
}

function Story({ preset, trace, idx }) {
  const m = preset.metaphor, parts = liveStory(trace, idx, preset);
  return (
    <div>
      <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden="true">{m.emoji}</span><h3 className="text-lg font-bold text-slate-900 dark:text-white">{m.title}</h3></div>
      <p className="mt-2 text-slate-600 dark:text-zinc-300">{m.text}</p>
      <div className="my-4 rounded-lg bg-green-50 dark:bg-green-950/50 p-4 ring-1 ring-green-100 dark:ring-green-900">
        <p className="eyebrow text-green-700 dark:text-green-400">In the story, right now</p>
        <p className="mt-1 text-slate-800 dark:text-zinc-100">{parts ? <Parts parts={parts} /> : <span className="text-slate-400 dark:text-zinc-500">Step forward to see the story.</span>}</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead><tr className="eyebrow"><th className="py-1.5 pr-3">In the metaphor</th><th className="py-1.5">In memory</th></tr></thead>
        <tbody>{m.map.map((r) => <tr key={r[0]} className="border-t border-slate-100 dark:border-zinc-800"><td className="py-2 pr-3">{r[0]}</td><td className="py-2 font-medium text-slate-900 dark:text-white">{r[1]}</td></tr>)}</tbody>
      </table>
      <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">Where the metaphor breaks: a real stack frame also stores arguments, locals and a return address; people don&apos;t. The Call stack view is the literal truth.</p>
    </div>
  );
}

function Analysis({ preset, analysis: a, onFlash }) {
  const cur = preset.analysis;
  const Stat = ({ k, v, t }) => <div title={t} className="rounded-lg bg-slate-50 dark:bg-zinc-950 p-3 text-center ring-1 ring-slate-100 dark:ring-zinc-800"><div className="text-2xl font-extrabold text-green-700 dark:text-green-400">{v}</div><div className="text-[11px] text-slate-500 dark:text-zinc-400">{k}</div></div>;
  const chip = (l, extra) => <button key={l + (extra || '')} type="button" onClick={() => onFlash(l)} className="rounded-md bg-green-50 dark:bg-green-950/50 px-2 py-0.5 font-mono text-xs font-semibold text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-200 dark:ring-green-800 hover:bg-green-100 dark:hover:bg-green-900/50" title={extra}>{l}</button>;
  return (
    <div className="space-y-5 text-sm">
      <div>
        <h3 className="eyebrow mb-2">Classification <span className="ml-1 rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-px normal-case tracking-normal">heuristic</span></h3>
        <ul className="space-y-1.5 text-slate-600 dark:text-zinc-300">{a.badges.map((b) => <li key={b.label}><b className="text-slate-900 dark:text-white">{b.label}:</b> {b.hint}</li>)}</ul>
      </div>
      {a.warnings.length > 0 && <div className="space-y-2">{a.warnings.map((w) => <p key={w} className="rounded-md bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-amber-900 dark:text-amber-200 ring-1 ring-amber-200 dark:ring-amber-800">⚠ {w}</p>)}</div>}
      <div>
        <h3 className="eyebrow mb-2">Measured on this input</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat k="total calls" v={a.stats.calls} /><Stat k="max depth" v={a.stats.maxDepth} /><Stat k="base-case hits" v={a.stats.baseCalls} t="Calls that returned without recursing" /><Stat k="max branching" v={a.stats.maxBranch} />
          {a.stats.cached ? <Stat k="cache hits" v={a.stats.cached} /> : <Stat k="repeated calls" v={a.stats.redundant} t="Calls with identical arguments to an earlier call" />}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="eyebrow">Anatomy</h3>
        <p className="flex flex-wrap items-center gap-1.5">Base-case returns observed at: {a.baseLines.length ? a.baseLines.map((l) => chip(l)) : <b>none</b>}</p>
        <p className="flex flex-wrap items-center gap-1.5">Recursive call sites (static): {a.sites.length ? a.sites.map((s) => chip(s.line, s.tail ? 'tail position' : 'not a tail call')) : <b>none found</b>}</p>
      </div>
      {a.complexity && <div><h3 className="eyebrow mb-1">Complexity {!a.complexity.curated && <span className="ml-1 rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-px normal-case tracking-normal">heuristic</span>}</h3><p><b>Time:</b> {a.complexity.time}</p><p><b>Space:</b> {a.complexity.space}</p></div>}
      {cur && <div><p><b>Alternatives:</b> {cur.alt}</p><h3 className="eyebrow mb-1 mt-4">Failure modes</h3><ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-zinc-300">{cur.pitfalls.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      <div className="rounded-lg bg-green-50 dark:bg-green-950/50 p-4 ring-1 ring-green-100 dark:ring-green-900"><h3 className="eyebrow mb-1 text-green-700 dark:text-green-400">Think first</h3><ul className="list-disc space-y-1 pl-5 text-slate-800 dark:text-zinc-100">{preset.think.map((x) => <li key={x}>{x}</li>)}</ul></div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">Measurements describe this input only. Curated complexity claims are standard results; custom-code claims are heuristics. Verify before relying on them.</p>
    </div>
  );
}

function Output({ state, trace }) {
  const done = state.finished && state.stack.length === 0 && trace.events.length && !trace.halt && !trace.error;
  return (
    <div className="text-sm">
      {state.out.length ? <ol className="list-decimal space-y-0.5 pl-6 font-mono text-[13px]">{state.out.map((o, i) => <li key={i}>{o}</li>)}</ol> : <p className="text-slate-400 dark:text-zinc-500">Nothing printed yet. Hanoi, Subsets, Countdown and your own print() calls write here.</p>}
      {done && <p className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/50 px-4 py-3 text-green-900 dark:text-green-200 ring-1 ring-green-200 dark:ring-green-800">{trace.result !== undefined ? <>Result: <b>{fmt(trace.result, 80)}</b></> : 'Finished (no return value).'}</p>}
    </div>
  );
}

export default function InsightTabs({ preset, trace, state, analysis, idx, onFlash }) {
  const [tab, setTab] = useState('story');
  return (
    <section id="insight" className="card" aria-label="Insights">
      <div className="mb-4 flex gap-1 border-b border-slate-100 dark:border-zinc-800" role="tablist">
        {TABS.map(([id, text]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`relative px-4 py-2 text-sm font-semibold ${tab === id ? 'text-green-700 dark:text-green-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100'}`}>
            {text}{tab === id && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-green-600" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === 'story' && <Story preset={preset} trace={trace} idx={idx} />}
          {tab === 'analysis' && <Analysis preset={preset} analysis={analysis} onFlash={onFlash} />}
          {tab === 'output' && <Output state={state} trace={trace} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
