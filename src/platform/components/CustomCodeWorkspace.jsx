import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CONTRACTS } from '../code/contracts.js';
import { validate } from '../code/rules.js';
import { runUserCode, MAX_CODE_CHARS } from '../code/runUserCode.js';
import LogicFeedbackCard, { SEV } from '../../components/LogicFeedbackCard.jsx';
import { tokenize } from '../tokenize.js';
import { LinesSkeleton } from './Skeleton.jsx';

const LH = 21;
/* Textarea editor: line-number gutter, severity bars and a syntax-highlight layer drawn behind
   transparent text (all three follow the textarea's scroll position). */
export function Editor({ value, onChange, marks, heightClass = 'min-h-[150px] flex-1', lang = 'javascript' }) {
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const lines = value.split('\n');
  return (
    <div className={`relative ${heightClass} overflow-hidden rounded-sm bg-slate-50 ring-1 ring-slate-200 dark:bg-canvas dark:ring-line`}>
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-10 select-none overflow-hidden border-r border-slate-200 text-right font-mono text-[12px] text-slate-400 dark:border-line dark:text-fg-muted">
        <div style={{ transform: `translateY(${8 - scroll.top}px)` }}>
          {lines.map((_, i) => <div key={i} style={{ height: LH }} className="flex items-center justify-end gap-1 pr-1.5">{marks[i + 1] && <i className={`inline-block h-1.5 w-1.5 ${SEV[marks[i + 1]].dot}`} />}{i + 1}</div>)}
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-10 right-0 overflow-hidden">
        <div style={{ transform: `translateY(${8 - scroll.top}px)` }}>
          {lines.map((_, i) => <div key={i} style={{ height: LH }} className={marks[i + 1] ? SEV[marks[i + 1]].bar : ''} />)}
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-10 right-0 overflow-hidden">
        <pre className="m-0 px-3 py-2 font-mono text-[13px] leading-[21px] text-slate-900 dark:text-fg" style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}>
          {lines.map((ln, i) => <div key={i} style={{ height: LH }}>{ln ? tokenize(ln, lang).map(([w, c], j) => <span key={j} className={c}>{w}</span>) : ' '}</div>)}
        </pre>
      </div>
      <textarea
        className="absolute inset-y-0 left-10 right-0 block w-[calc(100%-2.5rem)] resize-none overflow-auto whitespace-pre bg-transparent px-3 py-2 font-mono text-[13px] leading-[21px] text-transparent caret-slate-900 outline-none selection:bg-accent/30 dark:caret-accent"
        value={value} wrap="off" spellCheck={false} maxLength={MAX_CODE_CHARS} aria-label="Your code" onChange={(e) => onChange(e.target.value)} onScroll={(e) => setScroll({ top: e.target.scrollTop, left: e.target.scrollLeft })}
        onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; t.setRangeText(lang === 'javascript' ? '  ' : '    ', s, t.selectionEnd, 'end'); onChange(t.value); } }} />
    </div>
  );
}

export function Switch({ on, onChange, children }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="group inline-flex items-center gap-2 text-left text-xs font-semibold text-slate-700 dark:text-zinc-200">
      <span className={`relative h-5 w-9 flex-none rounded-sm border transition-colors ${on ? 'border-accent-600 bg-accent-600 dark:border-accent dark:bg-accent' : 'border-slate-300 bg-slate-200 dark:border-line dark:bg-panel-2'}`}>
        <motion.span layout transition={{ duration: 0.18, ease: 'easeOut' }} className={`absolute top-[1px] h-4 w-4 rounded-sm ${on ? 'right-[1px] bg-white dark:bg-canvas' : 'left-[1px] bg-white dark:bg-zinc-500'}`} />
      </span>
      {children}
    </button>
  );
}

/* `host` (optional) replaces the test-contract flow with a host-driven one. The Recursion page uses it: Run feeds the
   learner's code to the tracing worker and `host.summary` / `host.findings` carry the outcome. */
export default function CustomCodeWorkspace({ moduleId, algo, code, setCode, resetToStarter, correction, setCorrection, host, editorHeightClass }) {
  const contract = host ? null : (CONTRACTS[algo.id] || null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);   // { findings, hasRules } (only when correction mode was ON for the run)
  const [stale, setStale] = useState(false);
  const runId = useRef(0);

  const marks = useMemo(() => {
    const m = {};
    const src = host ? { findings: host.findings || [] } : report;
    if (src) src.findings.forEach((f) => { const rank = { major: 3, minor: 2, opt: 1 }; if (!m[f.line] || rank[f.sev] > rank[m[f.line]]) m[f.line] = f.sev; });
    return m;
  }, [report, host]);

  const onChange = (v) => { setCode(v); setStale(true); };

  const run = async () => {
    if (host) { host.onRun(); return; }
    const id = ++runId.current;
    setRunning(true); setStale(false);
    const rep = correction ? validate(algo.id, code) : null;
    setReport(rep);
    const r = await runUserCode(code, contract, { withStress: !!correction });
    if (id !== runId.current) return;
    setResult(r); setRunning(false);
  };

  const accept = (f) => {
    const lines = code.split('\n');
    lines[f.line - 1] = f.fix(lines[f.line - 1]);
    const next = lines.join('\n');
    setCode(next); setStale(true);
    setReport(validate(algo.id, next));
  };

  const examples = host ? host.examples : (contract ? contract.examples : []);
  const passCount = result && result.tests ? result.tests.filter((t) => t.pass).length : 0;
  const slowFinding = result && result.slow ? { sev: 'opt', line: 1, msg: `Timing hint: ${result.slow.ms} ms for the speed check (${result.slow.hint}). Your version looks slower than it should be for this algorithm.` } : null;
  const findings = host ? (host.findings || []) : (report ? [...report.findings, ...(slowFinding ? [slowFinding] : [])] : []);
  const isRunning = host ? !!host.running : running;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Switch on={correction} onChange={setCorrection}>Suggestion &amp; Correction Mode</Switch>
        <div className="ml-auto flex items-center gap-2">
          {host && host.langs && (
            <select className="field !w-auto !py-1 font-mono text-xs hover:border-accent-600 dark:hover:border-accent" aria-label="Language" value={host.lang} onChange={(e) => host.onLang(e.target.value)}>
              {host.langs.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          )}
          {examples.length > 0 && (
            <select className="field !w-auto !py-1 text-xs" aria-label="Load an example" value="" onChange={(e) => { const ex = examples[+e.target.value]; if (ex) { if (host) { host.onExample(ex); return; } setCode(ex.code); setStale(true); setResult(null); setReport(null); } }}>
              <option value="">Try an example…</option>
              {examples.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}
            </select>
          )}
          <button type="button" className="btn !py-1 text-xs" onClick={() => { resetToStarter(); setResult(null); setReport(null); setStale(false); }}>Reset</button>
          <button type="button" className="btn btn-primary !py-1 text-xs" onClick={run} disabled={isRunning}>{isRunning ? 'Running…' : 'Run'}</button>
        </div>
      </div>

      <Editor value={code} onChange={onChange} marks={marks} heightClass={editorHeightClass} lang={host && host.lang ? host.lang : 'javascript'} />

      <div className="max-h-[48%] min-h-[110px] flex-none space-y-2 overflow-auto pr-1" aria-live="polite">
        {isRunning && <div role="status" aria-label="Running" className="space-y-2 py-1"><p className="font-mono text-xs text-slate-500 dark:text-fg-muted">&gt;_ running in sandbox</p><LinesSkeleton rows={4} /></div>}
        {!isRunning && host && host.summary}
        {!host && !result && !running && <p className="text-xs text-slate-500 dark:text-zinc-400">{contract ? <>Write <code className="font-mono">{contract.fn}(…)</code> and press Run. It is tested in an isolated worker with a 3 s limit, so infinite loops and crashes cannot freeze this page.</> : 'No automatic tests exist for this algorithm yet. Your code still runs in the isolated worker; print(…) shows output.'}{correction && <> Suggestion mode is <b>on</b>: you also get logic checks.</>}</p>}
        {!host && result && !running && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={`rounded-md px-3 py-1 ${result.status === 'pass' || result.status === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                {result.status === 'pass' && `PASS  all ${result.tests.length} tests`}
                {result.status === 'ok' && 'OK  ran without errors'}
                {result.status === 'fail' && `FAIL  ${passCount} of ${result.tests.length} tests pass`}
                {result.status === 'timeout' && 'TIMEOUT'}
                {result.status === 'error' && 'ERROR'}
                {result.status === 'missing' && 'ERROR  function not found'}
              </span>
              {stale && <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono">code changed since this run</span>}
            </div>
            {result.message && <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{result.message}</p>}
            {result.tests.length > 0 && (
              <ul className="space-y-1 text-xs">
                {result.tests.map((t) => (
                  <li key={t.label} className={`rounded-md px-2.5 py-1.5 ${t.pass ? 'bg-slate-100/70 text-slate-700 dark:bg-zinc-800/50 dark:text-zinc-300' : 'bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                    <span className="mr-1.5">{t.pass ? 'PASS' : 'FAIL'}</span><span className="font-mono">{t.label.length > 64 ? t.label.slice(0, 63) + '…' : t.label}</span>
                    {!t.pass && <div className="mt-0.5 pl-5 font-mono">{t.error ? `threw: ${t.error}` : <>expected {t.expected}, got {t.got}</>}</div>}
                  </li>
                ))}
              </ul>
            )}
            {result.logs && result.logs.length > 0 && <pre className="overflow-auto rounded-md bg-slate-100 p-2 font-mono text-[11px] text-slate-700 dark:bg-zinc-800/60 dark:text-zinc-200">{result.logs.join('\n')}</pre>}
          </>
        )}

        {correction && (host ? host.ran : (result || report)) && (
          <div className="space-y-2 border-t border-slate-200 pt-2 dark:border-zinc-800">
            <p className="eyebrow">Suggestions</p>
            {findings.length === 0 && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-900 dark:bg-green-950/40 dark:text-green-200">{report && !report.hasRules ? 'No logic validator exists for this algorithm yet; only generic checks (such as endless loops) ran.' : 'No logic problems found by the pattern checks.'}{result && result.status === 'pass' ? ' Together with the passing tests, your solution looks sound.' : ''}</p>}
            {findings.map((f, i) => <LogicFeedbackCard key={i} finding={f} code={code} onAccept={accept} />)}
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">These checks look for known mistake patterns in your text. They are hints, not proofs: the {host ? 'trace and call stack' : 'tests above'} decide whether your code is correct.</p>
          </div>
        )}
      </div>
    </div>
  );
}
