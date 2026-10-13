/* Tracing of learner-supplied JavaScript. This module is only ever executed inside the
 * sandbox worker (trace.worker.js); the main thread never evals user code.
 * Limits enforced here: call depth, event count, wall-clock budget (soft; the main thread
 * additionally terminates the worker if a loop never reaches a trace point).
 */
import { buildTrace, snap, fmt } from './engine.js';

export const MAX_CODE_CHARS = 8000;
export const MAX_CALL_CHARS = 200;

const DECL = /^\s*(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(|^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/;

function paramNames(fn) {
  const src = Function.prototype.toString.call(fn);
  const m = /^[^(]*\(([^)]*)\)/.exec(src) || /^\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>/.exec(src);
  if (!m) return [];
  const out = []; let d = 0, cur = '';
  for (const ch of m[1]) {
    if ('([{'.includes(ch)) d++;
    if (')]}'.includes(ch)) d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.split('=')[0].replace(/\.\.\./, '').trim());
}

/** opts.runtime(print) -> extra globals injected into the program (the LanguageAdapter's C/C++/Java/Python helpers). */
export function runCustom(code, callExpr, limits, opts = {}) {
  const lines = String(code).split('\n');
  const names = [], defLine = {};
  lines.forEach((ln, i) => {
    const m = DECL.exec(ln);
    if (m) { const nm = m[1] || m[2]; if (!names.includes(nm)) { names.push(nm); defLine[nm] = i + 1; } }
  });
  const trace = buildTrace((T) => {
    if (String(code).length > MAX_CODE_CHARS) throw new Error('Code is longer than ' + MAX_CODE_CHARS + ' characters.');
    if (String(callExpr).length > MAX_CALL_CHARS) throw new Error('Call expression is too long.');
    if (!names.length) throw new Error('No function declaration found. Declare the function you want to trace, e.g. function f(n) { … }');
    const wrap = (name, fn) => {
      const pn = paramNames(fn);
      return function (...args) {
        const a = {};
        args.forEach((v, i) => { a[pn[i] || 'arg' + i] = snap(v); });
        const id = T.enter(name, a, defLine[name], null);
        const r = fn.apply(this, args);
        T.exit(id, snap(r), defLine[name]);
        return r;
      };
    };
    const transformed = String(code).replace(/^(\s*)(const|let)(\s+[A-Za-z_$][\w$]*\s*=)/gm, '$1var$3');
    // typeof guard: a helper declared inside another function is not visible here and simply stays untraced.
    const wrapSrc = names.map((n) => `if (typeof ${n} === 'function') ${n} = __wrap(${JSON.stringify(n)}, ${n});`).join('\n');
    const printFn = (...xs) => {
      const top = T.stack[T.stack.length - 1];
      if (top) T.at(top.id, defLine[top.name], 'print(…)', { out: xs.map((x) => fmt(snap(x), 60)).join(' ') });
    };
    // eslint-disable-next-line no-new-func
    const env = { __wrap: wrap, print: printFn, console: { log: printFn }, ...(opts.runtime ? opts.runtime(printFn) : {}) };
    const keys = Object.keys(env);
    const fn = new Function(...keys, '"use strict";\n' + transformed + '\n' + wrapSrc + '\nreturn (' + callExpr + ');');
    return fn(...keys.map((k) => env[k]));
  }, limits);
  trace.names = names;
  return trace;
}
