import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PRESETS } from '../engine/presets.js';

function ParamField({ p, value, onCommit }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (e) => onCommit(p.key, e.currentTarget.value);
  return (
    <label className="flex min-w-[100px] flex-1 flex-col gap-1">
      <span className="eyebrow">{p.label}</span>
      <input className="field" type={p.type === 'int' ? 'number' : 'text'} min={p.min} max={p.max} value={text} spellCheck={false}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { commit(e); e.currentTarget.blur(); } }} />
    </label>
  );
}

const grouped = PRESETS.reduce((m, p) => { (m[p.group] = m[p.group] || []).push(p); return m; }, {});

const TONES = {
  green: 'bg-accent-50 text-accent-800 ring-accent-200 dark:bg-accent/10 dark:text-accent dark:ring-accent/40', slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-panel-2 dark:text-fg-done dark:ring-line',
  amber: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-panel-2 dark:text-fg ring-inset dark:ring-zinc-600', violet: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-panel-2 dark:text-fg-done dark:ring-line',
};
function Pill({ tone = 'green', children, title }) {
  return <motion.span layout title={title} className={`pill ${TONES[tone]}`}>{children}</motion.span>;
}

export default function ControlCenter({ preset, vals, onPreset, onParam, onRun, analysis, busy, entryNote }) {
  const cx = analysis.complexity, big = cx && cx.big;
  const typeBadge = analysis.badges[0];
  const st = analysis.stats;
  return (
    <section id="control-center" className="card" aria-labelledby="cc-title">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Control Center</p>
          <h2 id="cc-title" className="text-xl font-bold text-slate-900 dark:text-fg">{preset.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Static complexity and recursion type">
            {big && <Pill tone="green" title={big.time.startsWith('~') ? 'Estimated from this run (heuristic)' : 'Time complexity'}>Time {big.time}</Pill>}
            {big && <Pill tone="green" title="Space complexity (stack depth)">Space {big.space}</Pill>}
            {typeBadge && <Pill tone="slate" title={typeBadge.hint}>{typeBadge.label}</Pill>}
            {analysis.badges.slice(1).map((b) => <Pill key={b.label} tone={b.tone === 'good' ? 'green' : b.tone === 'accent' ? 'violet' : b.tone === 'warn' ? 'amber' : 'slate'} title={b.hint}>{b.label}</Pill>)}
            {busy && <span className="skeleton inline-block h-6 w-36" role="status" aria-label="Running in sandbox" />}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center" aria-label="Run statistics">
          {[['Calls', st.calls], ['Max depth', st.maxDepth], ['Base cases', st.baseCalls]].map(([k, v]) => (
            <div key={k} className="min-w-[88px] rounded-sm bg-slate-50 px-3 py-2 ring-1 ring-slate-200 dark:bg-canvas dark:ring-line">
              <dd className={`font-mono text-2xl font-semibold text-slate-900 dark:text-fg ${busy ? 'opacity-40' : ''}`}>{v}</dd><dt className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">{k}</dt>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-5 grid gap-4 border-t border-slate-100 dark:border-zinc-800 pt-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Algorithm</span>
          <select className="field" value={preset.id} onChange={(e) => onPreset(e.target.value)} aria-label="Choose an algorithm">
            {Object.entries(grouped).map(([g, list]) => <optgroup key={g} label={g}>{list.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</optgroup>)}
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-3">
          {preset.params.filter((p) => !(entryNote && p.key === 'call')).map((p) => <ParamField key={preset.id + p.key} p={p} value={vals[p.key]} onCommit={onParam} />)}
          {entryNote && <div className="flex min-w-[160px] flex-1 flex-col gap-1"><span className="eyebrow">entry</span><span className="field truncate font-mono text-slate-600 dark:text-fg-done" title="Taken from main(): the first call to one of your functions">{entryNote}</span></div>}
          {preset.custom && <button type="button" className="btn btn-primary" onClick={onRun}>Run &amp; visualize</button>}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-zinc-400">{preset.custom ? 'Custom code runs only when you press Run, in an isolated worker with a depth limit and a time limit. C, C++, Java and Python are translated to JavaScript first; the entry call is read from main() (or the top-level call in Python). Printed output appears in Output.' : 'Changing an input re-traces the whole run instantly.'}</p>
    </section>
  );
}
