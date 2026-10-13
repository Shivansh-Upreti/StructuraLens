/* Main-thread side of the sandbox: spawn worker, enforce hard timeout, validate the reply. */
import { DEFAULT_LIMITS, layoutTree } from './engine.js';
import { MAX_CODE_CHARS, MAX_CALL_CHARS } from './custom.js';

const EVENT_KINDS = new Set(['call', 'line', 'ret', 'overflow']);

export function emptyTrace(error, halt, maxDepth) {
  return { events: [], nodes: [], halt: halt || null, error: error || null, result: undefined, maxDepth: maxDepth || DEFAULT_LIMITS.maxDepth, overflow: halt === 'depth', truncated: halt === 'events', timedOut: halt === 'time', names: [] };
}

/** The worker is not trusted to hand back well-formed data: re-check shape and bounds. */
function validate(tr, limits) {
  if (!tr || !Array.isArray(tr.events) || !Array.isArray(tr.nodes)) throw new Error('Malformed trace');
  if (tr.events.length > limits.maxEvents + 5 || tr.nodes.length > limits.maxEvents) throw new Error('Trace too large');
  const nodes = tr.nodes.map((n, i) => {
    if (!n || n.id !== i || typeof n.name !== 'string') throw new Error('Malformed node');
    return { id: i, name: n.name.slice(0, 60), args: n.args && typeof n.args === 'object' ? n.args : {}, parent: Number.isInteger(n.parent) ? n.parent : null, children: Array.isArray(n.children) ? n.children.filter(Number.isInteger) : [], depth: n.depth | 0, site: null, line: n.line | 0, hide: [], cached: false, ret: n.ret };
  });
  const events = tr.events.map((e) => {
    if (!e || !EVENT_KINDS.has(e.k) || !Number.isInteger(e.id) || e.id < 0 || e.id >= nodes.length) throw new Error('Malformed event');
    return { k: e.k, id: e.id, line: e.line | 0, note: typeof e.note === 'string' ? e.note.slice(0, 300) : undefined, out: e.out === undefined ? undefined : String(e.out).slice(0, 300), value: e.value, cached: false };
  });
  layoutTree(nodes);
  const halt = ['depth', 'events', 'time'].includes(tr.halt) ? tr.halt : null;
  return { events, nodes, halt, error: typeof tr.error === 'string' ? tr.error.slice(0, 300) : null, result: tr.result, maxDepth: limits.maxDepth, overflow: halt === 'depth', truncated: halt === 'events', timedOut: halt === 'time', names: Array.isArray(tr.names) ? tr.names.filter((s) => typeof s === 'string').slice(0, 20) : [],
    entry: typeof tr.entry === 'string' ? tr.entry.slice(0, MAX_CALL_CHARS) : null, fromMain: tr.fromMain === true,
    js: typeof tr.js === 'string' ? tr.js.slice(0, MAX_CODE_CHARS * 3) : null };
}

/** lang: 'javascript' (default) | 'cpp' | 'c' | 'java' | 'python'. Translation happens inside the worker. */
export function runCustomSandboxed(code, call, limits, lang = 'javascript') {
  const lim = { ...DEFAULT_LIMITS, ...limits };
  if (code.length > MAX_CODE_CHARS) return Promise.resolve(emptyTrace('Code is longer than ' + MAX_CODE_CHARS + ' characters.', null, lim.maxDepth));
  if (call.length > MAX_CALL_CHARS) return Promise.resolve(emptyTrace('Call expression is too long.', null, lim.maxDepth));
  return new Promise((resolve) => {
    let worker;
    try { worker = new Worker(new URL('./trace.worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { resolve(emptyTrace('Sandbox worker could not start in this browser.', null, lim.maxDepth)); return; }
    const done = (tr) => { clearTimeout(hard); worker.terminate(); resolve(tr); };
    // Hard stop: covers loops that never emit a trace event, which the in-worker deadline cannot see.
    const hard = setTimeout(() => done(emptyTrace('Execution stopped after ' + (lim.maxMs + 1000) + ' ms (possible infinite loop).', 'time', lim.maxDepth)), lim.maxMs + 1000);
    worker.onmessage = (e) => {
      try {
        const d = e.data;
        done(d && d.ok ? validate(d.trace, lim) : emptyTrace(d && d.error ? d.error : 'Unknown error', null, lim.maxDepth));
      } catch (err) { done(emptyTrace('Rejected an invalid result from the sandbox.', null, lim.maxDepth)); }
    };
    worker.onerror = (e) => { e.preventDefault && e.preventDefault(); done(emptyTrace('The sandbox crashed while running your code.', null, lim.maxDepth)); };
    worker.postMessage({ code, call, limits: lim, lang });
  });
}
