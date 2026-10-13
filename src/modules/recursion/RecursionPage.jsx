import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTrace, describe, fmt, label, replay } from '../../engine/engine.js';
import { PRESETS, byId, parseList, CUSTOM_DEFAULT } from '../../engine/presets.js';
import { analyze } from '../../engine/analysis.js';
import { emptyTrace, runCustomSandboxed } from '../../engine/runner.js';
import Hero from '../../components/Hero.jsx';
import ControlCenter from '../../components/ControlCenter.jsx';
import CodePanel from '../../components/CodePanel.jsx';
import WhyPanel from '../../components/WhyPanel.jsx';
import Visualizer from '../../components/Visualizer.jsx';
import InsightTabs from '../../components/InsightTabs.jsx';
import PlaybackBar from '../../components/PlaybackBar.jsx';
import Toasts from '../../components/Toasts.jsx';
import MobileTabs from '../../platform/components/MobileTabs.jsx';
import CustomCodeWorkspace from '../../platform/components/CustomCodeWorkspace.jsx';
import LogicFeedbackCard from '../../components/LogicFeedbackCard.jsx';
import { validateRecursion } from '../../engine/logicValidator.js';
import { RECURSION_EXAMPLES } from '../../engine/recursionExamples.js';

const defaults = (pr) => Object.fromEntries(pr.params.map((p) => [p.key, p.def]));

/** Turn raw field text into typed, clamped values. Everything the engine receives passes through here. */
function normalize(pr, raw) {
  const v = {};
  pr.params.forEach((p) => {
    const r = raw[p.key];
    if (p.type === 'int') { let n = parseInt(r, 10); if (!Number.isFinite(n)) n = p.def; v[p.key] = Math.max(p.min, Math.min(p.max, n)); }
    else if (p.type === 'numlist') v[p.key] = parseList(r, true).slice(0, p.max || 10);
    else if (p.type === 'list') v[p.key] = parseList(r, false).slice(0, p.max || 10);
    else v[p.key] = String(r).slice(0, 200);
  });
  return v;
}

const HALT_TOASTS = {
  depth: (t) => ({ tone: 'warn', title: 'Stack depth limit reached', msg: `Execution was halted at ${t.maxDepth} nested calls (a real runtime would throw a RangeError). Check for a missing base case, or a call that doesn't move toward it.` }),
  time: () => ({ tone: 'error', title: 'Time limit exceeded', msg: 'The run was stopped to protect your browser. Look for an infinite loop or far too much work per call.' }),
  events: () => ({ tone: 'warn', title: 'Trace truncated', msg: 'The run produced more steps than can be visualized. Try a smaller input.' }),
};

export default function RecursionPage() {
  const [mobileTab, setMobileTab] = useState('code');   // < 1024px only: 'code' | 'viz' (layout wrapper; no effect on the engine)
  const [presetId, setPresetId] = useState('factorial');
  const preset = byId(presetId);
  const [vals, setVals] = useState(() => defaults(preset));
  const [draft, setDraft] = useState(CUSTOM_DEFAULT);
  // Custom code only (re)runs when the learner presses Run, so half-edited code never executes.
  const [committed, setCommitted] = useState({ src: CUSTOM_DEFAULT, call: 'sumTo(4)', depth: 40 });
  const [runNonce, setRunNonce] = useState(0);
  const [editing, setEditing] = useState(false);
  const [customTrace, setCustomTrace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState(false);   // Suggestion & Correction Mode (default OFF)

  const typed = useMemo(() => normalize(preset, vals), [preset, vals]);
  const syncTrace = useMemo(() => (preset.custom ? null : buildTrace((T) => preset.run(T, typed), { maxDepth: preset.maxDepth || 200 })), [preset, typed]);

  useEffect(() => {
    if (!preset.custom) return undefined;
    let cancelled = false;
    setBusy(true);
    runCustomSandboxed(committed.src, committed.call, { maxDepth: committed.depth }).then((tr) => { if (!cancelled) { setCustomTrace(tr); setBusy(false); } });
    return () => { cancelled = true; };
  }, [preset, committed, runNonce]);

  // Must be referentially stable: effects key off `trace`, and a fresh object each render would loop.
  const placeholder = useMemo(() => emptyTrace(null, null, committed.depth), [committed.depth]);
  const trace = preset.custom ? (customTrace || placeholder) : syncTrace;
  const source = preset.custom ? committed.src : preset.code;
  const analysis = useMemo(() => analyze(trace, source.split('\n'), preset), [trace, source, preset]);

  /* ---- stepping ---- */
  const [gran, setGran] = useState('line');
  const [pos, setPos] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [predictOn, setPredictOn] = useState(false);
  const [pending, setPending] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [flash, setFlash] = useState(null);
  const answered = useRef(new Set());

  const steps = useMemo(() => trace.events.map((e, i) => i).filter((i) => gran === 'line' || trace.events[i].k !== 'line'), [trace, gran]);
  // pos can briefly outlive a trace swap (it is reset in an effect), so clamp it against the current steps.
  const idx = pos < 0 || !steps.length ? -1 : steps[Math.min(pos, steps.length - 1)];
  const state = useMemo(() => replay(trace, idx), [trace, idx]);
  const desc = useMemo(() => describe(trace, idx), [trace, idx]);

  useEffect(() => { setPos(-1); setPlaying(false); setPending(null); setFeedback(null); answered.current = new Set(); }, [trace]);

  const forward = useCallback(() => {
    if (pending) return false;
    if (pos >= steps.length - 1) return false;
    const i = steps[pos + 1], e = trace.events[i];
    if (predictOn && e.k === 'ret' && e.value !== undefined && !e.cached && !answered.current.has(i)) { setPending({ idx: i }); return false; }
    setPos(pos + 1); setFeedback(null);
    return true;
  }, [pending, pos, steps, trace, predictOn]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => { if (!forward()) setPlaying(false); }, 1000 / speed);
    return () => clearTimeout(id);
  }, [playing, pos, speed, forward]);

  const goto = (p) => { setPlaying(false); setPending(null); setFeedback(null); setPos(Math.max(-1, Math.min(steps.length - 1, p))); };
  const stepForward = () => { setPlaying(false); forward(); };
  const stepBack = () => { if (pos >= 0) goto(pos - 1); };
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (pos >= steps.length - 1) setPos(-1);
    setPending(null); setPlaying(true);
  };
  const changeGran = (g) => {
    setPlaying(false); setPending(null);
    const ns = trace.events.map((e, i) => i).filter((i) => g === 'line' || trace.events[i].k !== 'line');
    let np = -1; for (let i = 0; i < ns.length; i++) if (ns[i] <= idx) np = i;
    setGran(g); setPos(np);
  };

  const prediction = useMemo(() => {
    if (!pending) return null;
    const e = trace.events[pending.idx], n = trace.nodes[e.id];
    const advance = () => { answered.current.add(pending.idx); setPending(null); setPos(pos + 1); };
    return {
      idx: pending.idx, label: label(n),
      onAnswer: (txt) => {
        const norm = (s) => String(s).replace(/\s+/g, '').replace(/^"|"$/g, '').toLowerCase();
        const ok = norm(txt) === norm(fmt(e.value, 200));
        setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), n: s.n + 1 }));
        advance();
        setFeedback(ok ? { ok, text: `Correct: it returns ${fmt(e.value)}.` } : { ok, text: `You said "${String(txt).slice(0, 40) || '(nothing)'}"; it returns ${fmt(e.value)}. Trace which values the sub-calls handed back.` });
      },
      onSkip: () => { advance(); setFeedback(null); },
    };
  }, [pending, trace, pos]);

  /* ---- notifications for halted runs ---- */
  const [toasts, setToasts] = useState([]);
  const closeToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  useEffect(() => {
    const list = [];
    if (trace.halt && HALT_TOASTS[trace.halt]) list.push({ id: `${trace.halt}-${Date.now()}`, ...HALT_TOASTS[trace.halt](trace) });
    if (trace.error) list.push({ id: `err-${Date.now()}`, tone: 'error', title: 'Your code could not be traced', msg: trace.error });
    setToasts(list.slice(0, 3));
  }, [trace]);

  /* ---- preset / params ---- */
  const onPreset = (id) => {
    const pr = byId(id);
    setPresetId(id); setVals(defaults(pr)); setEditing(!!pr.custom); setCustomTrace(null);
  };
  const onParam = (key, text) => setVals((v) => ({ ...v, [key]: text }));
  const onRun = () => { setCommitted({ src: draft, call: typed.call, depth: typed.depth }); setEditing(false); setRunNonce((n) => n + 1); };

  /* ---- Suggestion & Correction Mode: validate the draft live while editing, the executed code (+ trace) after a run ---- */
  const findings = useMemo(() => {
    if (!preset.custom || !correction) return [];
    return editing ? validateRecursion(draft).findings : validateRecursion(committed.src, { trace: customTrace }).findings;
  }, [preset, correction, editing, draft, committed.src, customTrace]);
  const rerunWith = (src) => { setDraft(src); setCommitted({ src, call: typed.call, depth: typed.depth }); setRunNonce((n) => n + 1); };
  const acceptFix = (f) => {
    const base = editing ? draft : committed.src;
    const lines = base.split('\n'); lines[f.line - 1] = f.fix(lines[f.line - 1]);
    const next = lines.join('\n');
    if (editing) setDraft(next); else rerunWith(next);
  };
  const workspaceHost = {
    examples: RECURSION_EXAMPLES, findings, running: busy, ran: true,
    onRun, onAccept: (next) => setDraft(next),
    onExample: (ex) => { setDraft(ex.code); setVals((v) => ({ ...v, call: ex.call })); },
    summary: customTrace && !editing ? null : (
      <p className="text-xs text-slate-500 dark:text-zinc-400">Write a recursive function, set the call expression (e.g. <code className="font-mono">sumTo(4)</code>) in the card above, then press Run. It is traced in an isolated worker with a depth limit and a time limit, so a missing base case ends in a safe, visible stack overflow.{correction && <> Suggestion mode is <b>on</b>: the validator checks the base case and whether each call moves toward it.</>}</p>
    ),
  };
  const resetCustom = () => { setDraft(CUSTOM_DEFAULT); setVals((v) => ({ ...v, call: 'sumTo(4)' })); };

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stepForward(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepBack(); }
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'Home') goto(-1);
      else if (e.key === 'End') goto(steps.length - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const error = trace.error && idx >= trace.events.length - 1 && trace.events.length ? trace.error : null;
  const emptyErr = !trace.events.length && trace.error;
  const shownDesc = emptyErr ? { kind: 'error', title: 'Error', parts: [{ t: 't', v: trace.error }] } : desc;

  return (
    <div className="pb-24">
      <Hero />
      <main className="mx-auto max-w-[1500px] space-y-5 px-5 pb-32 pt-5">
        <ControlCenter preset={preset} vals={vals} onPreset={onPreset} onParam={onParam} onRun={onRun} analysis={analysis} busy={busy} />
        <MobileTabs value={mobileTab} onChange={setMobileTab} items={[['code', 'Code Editor'], ['viz', 'Visualization']]} layout="mobtab-rec" />
        <div id="workspace" className="grid items-start gap-5 xl:grid-cols-[minmax(400px,.85fr)_minmax(0,1.5fr)]">
          <div className={`flex min-w-0 flex-col gap-5 ${mobileTab === 'code' ? '' : 'max-lg:hidden'}`}>
            {preset.custom && editing ? (
              <section className="card flex min-h-0 flex-col" aria-label="Your code">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Your code</h2>
                  <button type="button" className="btn !px-3 !py-1 text-xs" onClick={() => setEditing(false)}>Preview</button>
                </div>
                <div className="h-[560px]">
                  <CustomCodeWorkspace moduleId="recursion" algo={{ id: 'recursion-custom' }} code={draft} setCode={setDraft} resetToStarter={resetCustom}
                    correction={correction} setCorrection={setCorrection} host={workspaceHost} />
                </div>
              </section>
            ) : (
              <CodePanel title={preset.custom ? 'Your code' : 'Code'} source={source} state={state} flash={flash} custom={!!preset.custom} editing={false}
                draft={draft} onDraft={setDraft} onToggleEdit={() => setEditing((e) => !e)} />
            )}
            {preset.custom && !editing && (
              <section className="card !p-3" aria-label="Logic feedback">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow">Suggestion &amp; Correction Mode</p>
                  <button type="button" role="switch" aria-checked={correction} onClick={() => setCorrection((c) => !c)} className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                    <span className={`mr-2 inline-block h-4 w-8 rounded-md align-middle ${correction ? 'bg-green-600 dark:bg-green-400' : 'bg-slate-300 dark:bg-zinc-700'}`}><span className={`block h-3 w-3 translate-y-0.5 rounded-sm bg-white transition-transform ${correction ? 'translate-x-[1.1rem]' : 'translate-x-0.5'}`} /></span>{correction ? 'On' : 'Off'}
                  </button>
                </div>
                {correction && (
                  <div className="mt-2 space-y-2">
                    {findings.length === 0 && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-900 dark:bg-green-950/40 dark:text-green-200">Base case and convergence checks found nothing wrong.{trace.halt ? '' : ' The trace finished normally.'}</p>}
                    {findings.map((f, i) => <LogicFeedbackCard key={i} finding={f} code={committed.src} onAccept={acceptFix} />)}
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">These checks look for known mistake patterns in your text plus evidence from the run. They are hints, not proofs: the call stack and tree show what really happened.</p>
                  </div>
                )}
              </section>
            )}
            <WhyPanel desc={shownDesc} stepKey={idx} prediction={prediction} feedback={feedback} error={error} />
          </div>
          <div className={`min-w-0 ${mobileTab === 'viz' ? '' : 'max-lg:hidden'}`}><Visualizer trace={trace} state={state} /></div>
        </div>
        <div className={mobileTab === 'viz' ? '' : 'max-lg:hidden'}><InsightTabs preset={preset} trace={trace} state={state} analysis={analysis} idx={idx} onFlash={(line) => setFlash({ line, n: Date.now() })} /></div>
              </main>
      <PlaybackBar pos={pos} total={steps.length} playing={playing} onFirst={() => goto(-1)} onPrev={stepBack} onNext={stepForward} onLast={() => goto(steps.length - 1)} onPlay={togglePlay}
        onSeek={goto} speed={speed} onSpeed={setSpeed} gran={gran} onGran={changeGran} predict={predictOn} onPredict={(v) => { setPredictOn(v); if (!v) { setPending(null); setFeedback(null); } }} score={score} />
      <Toasts toasts={toasts} onClose={closeToast} />
    </div>
  );
}
