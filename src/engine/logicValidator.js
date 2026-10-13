/* Logic validator for custom RECURSIVE code ("Suggestion & Correction Mode").
 *
 * Inspects the learner's source text (static) and, when available, the trace produced by the sandbox worker (dynamic),
 * against the invariants every terminating recursion needs:
 *   1. a BASE CASE: a guarded `return` that does not call the function again;
 *   2. CONVERGENCE: at least one argument of each recursive call actually changes, towards the base case.
 *
 * Findings: { sev: 'major' | 'minor' | 'opt', line (1-based), title, msg, fix?: (lineText) => newLineText }
 *   major = the recursion cannot work as written; minor = a fixable slip (a one-line fix is offered); opt = still correct but wasteful.
 * These are heuristics on text, not a proof of correctness: they say so in the UI, and the trace is the ground truth.
 */

const IDENT = '[A-Za-z_$][\\w$]*';

/** Replace string / template literals and comments with spaces (same length) so braces and parens inside them are ignored. */
function mask(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && n === '*') { while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; } out += '  '; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') { out += '  '; i += 2; continue; } out += src[i] === '\n' ? '\n' : ' '; i++; }
      out += q; i++; continue;
    }
    out += c; i++;
  }
  return out;
}

/** Index of the bracket that closes the one at `open` (same type), or -1. */
function matchClose(s, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' }, o = s[open], cl = pairs[o];
  let d = 0;
  for (let i = open; i < s.length; i++) { if (s[i] === o) d++; else if (s[i] === cl) { d--; if (d === 0) return i; } }
  return -1;
}

function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim() || out.length) out.push(cur);
  return out.map((x) => x.trim());
}

/** Locate declared functions with their parameter names and body range [start, end) in the masked source. */
function findFunctions(S) {
  const fns = [];
  const push = (name, nameIdx, parenOpen, arrowParam) => {
    let params = [], afterParams;
    if (parenOpen >= 0) {
      const close = matchClose(S, parenOpen); if (close < 0) return;
      params = splitTop(S.slice(parenOpen + 1, close)).map((p) => p.split('=')[0].replace(/\.\.\./, '').trim()).filter(Boolean);
      afterParams = close + 1;
    } else { params = [arrowParam]; afterParams = nameIdx; }
    let j = afterParams; while (/\s/.test(S[j] || '')) j++;
    if (S.slice(j, j + 2) === '=>') { j += 2; while (/\s/.test(S[j] || '')) j++; }
    let start, end;
    if (S[j] === '{') { const c = matchClose(S, j); if (c < 0) return; start = j + 1; end = c; }
    else { start = j; let k = j, d = 0; for (; k < S.length; k++) { const ch = S[k]; if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) { if (d === 0) break; d--; } else if ((ch === ';' || ch === '\n') && d === 0) break; } end = k; }
    fns.push({ name, nameIdx, params, start, end, expr: S[j] !== '{' });
  };
  let m;
  const reDecl = new RegExp('function\\s*\\*?\\s+(' + IDENT + ')\\s*\\(', 'g');
  while ((m = reDecl.exec(S))) push(m[1], m.index, m.index + m[0].length - 1);
  const reVar = new RegExp('(?:const|let|var)\\s+(' + IDENT + ')\\s*=\\s*(?:async\\s*)?(?:function\\b[^(]*\\(|\\()', 'g');
  while ((m = reVar.exec(S))) { if (!/function/.test(m[0])) { const open = m.index + m[0].length - 1; if (!fns.some((f) => f.name === m[1])) push(m[1], m.index, open); } else if (!fns.some((f) => f.name === m[1])) push(m[1], m.index, m.index + m[0].length - 1); }
  const reArrow1 = new RegExp('(?:const|let|var)\\s+(' + IDENT + ')\\s*=\\s*(?:async\\s*)?(' + IDENT + ')\\s*=>', 'g');
  while ((m = reArrow1.exec(S))) { if (!fns.some((f) => f.name === m[1])) push(m[1], m.index + m[0].length - 2, -1, m[2]); }
  return fns;
}

export function validateRecursion(code, opts = {}) {
  const src = String(code || '');
  const S = mask(src);
  const lineStarts = [0]; for (let i = 0; i < S.length; i++) if (S[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (off) => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; } return lo + 1; };
  const findings = [];
  const fns = findFunctions(S);
  const trace = opts.trace || null;
  const recursive = [];
  let staticMajor = false;

  for (const f of fns) {
    const body = S.slice(f.start, f.end);
    const callRe = new RegExp('(?<![\\w$.])' + f.name.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
    const sites = []; let m;
    while ((m = callRe.exec(body))) {
      const open = m.index + m[0].length - 1, close = matchClose(body, open); if (close < 0) continue;
      const abs = f.start + m.index, before = body.slice(0, m.index);
      sites.push({ off: abs, line: lineOf(abs), args: splitTop(body.slice(open + 1, close)), returned: /\breturn\s*$/.test(before) || /(=>|\?|:|\|\||&&|[-+*/%<>=(,])\s*$/.test(before.trimEnd().slice(-2) || '') , stmt: /(^|[;{}\n])\s*$/.test(before), end: f.start + close + 1 });
    }
    if (!sites.length) continue;
    recursive.push(f);
    const headerLine = lineOf(f.nameIdx);

    /* ---- invariant 1: base case ---- */
    let hasBase = false;
    const ifRe = /\bif\s*\(/g;
    while ((m = ifRe.exec(body))) {
      const open = m.index + m[0].length - 1, close = matchClose(body, open); if (close < 0) continue;
      let j = close + 1; while (/\s/.test(body[j] || '')) j++;
      let cons;
      if (body[j] === '{') { const c = matchClose(body, j); cons = body.slice(j + 1, c < 0 ? body.length : c); }
      else { let k = j; while (k < body.length && body[k] !== ';' && body[k] !== '\n') k++; cons = body.slice(j, k); }
      if (/\breturn\b/.test(cons) && !callRe.test(cons)) hasBase = true;
      callRe.lastIndex = 0;
    }
    if (!hasBase && body.includes('?')) { // cond ? base : recursive   (or the mirror image)
      const q = body.indexOf('?'), c = body.indexOf(':', q);
      if (c > q) { const a = body.slice(q + 1, c), b = body.slice(c + 1); const ca = new RegExp(callRe.source).test(a), cb = new RegExp(callRe.source).test(b); if (ca !== cb) hasBase = true; }
    }
    if (!hasBase && /\|\||&&/.test(body) && /return/.test(body) === false && f.expr) { /* short-circuit one-liners (n <= 1 || ...) are too ambiguous to judge */ hasBase = true; }
    if (!hasBase) {
      staticMajor = true;
      findings.push({ sev: 'major', line: headerLine, title: 'Missing Base Case (will cause Stack Overflow)', msg: `${f.name} calls itself on every path. A recursion needs a guarded stop: an \`if\` that returns a value WITHOUT calling ${f.name} again (for example \`if (n === 0) return 0;\`). Without it the call stack grows until the engine throws "Maximum call stack size exceeded".` });
    }

    /* ---- invariant 2: state convergence ---- */
    const ARG_SAME = (a, p) => a === p || a === '(' + p + ')';
    const postRe = (p) => new RegExp('^' + p.replace(/\$/g, '\\$') + '\\s*(--|\\+\\+)$');
    const allUnchanged = [];
    for (const s of sites) {
      if (!s.args.length) continue;
      const per = s.args.map((a, i) => {
        const p = f.params[i]; if (!p) return 'changed';
        if (ARG_SAME(a, p)) return 'same';
        if (postRe(p).test(a)) return 'post';
        return 'changed';
      });
      const line = s.line;
      per.forEach((kind, i) => {
        if (kind !== 'post') return;
        const p = f.params[i], op = postRe(p).exec(s.args[i])[1];
        staticMajor = true;
        findings.push({ sev: 'minor', line, title: 'Post-increment passes the OLD value', msg: `\`${p}${op}\` hands the recursive call the unchanged value of ${p} (the change only happens afterwards), so every call sees the same argument and the recursion never makes progress. Pass the new value: ${p} ${op === '--' ? '-' : '+'} 1.`, fix: (x) => x.replace(new RegExp(p.replace(/\$/g, '\\$') + '\\s*' + (op === '--' ? '--' : '\\+\\+')), p + (op === '--' ? ' - 1' : ' + 1')) });
      });
      if (per.every((k) => k === 'same' || k === 'post')) allUnchanged.push(s);
    }
    const postSites = sites.filter((s) => s.args.some((a, i) => f.params[i] && postRe(f.params[i]).test(a)));
    const trulySame = allUnchanged.filter((s) => !postSites.includes(s));
    if (trulySame.length && trulySame.length === sites.filter((s) => s.args.length).length) {
      staticMajor = true;
      const s = trulySame[0];
      findings.push({ sev: 'major', line: s.line, title: 'Infinite Recursion: State is not changing', msg: `Every recursive call passes ${f.params.length ? f.params.map((p) => '`' + p + '`').join(', ') : 'the same arguments'} unchanged, so each call is identical to the one before it and the base case can never be reached. Change at least one argument so it moves towards the base case, for example \`${f.params[0] || 'n'} - 1\`.` });
    }

    /* ---- direction / overshoot of the base case (only when every call moves the same parameter the same way) ---- */
    const baseConds = []; const condRe = /\bif\s*\(/g;
    while ((m = condRe.exec(body))) { const open = m.index + m[0].length - 1, close = matchClose(body, open); if (close > 0) baseConds.push(body.slice(open + 1, close)); }
    f.params.forEach((p, pi) => {
      const pe = p.replace(/\$/g, '\\$');
      const steps = sites.map((s) => { const a = s.args[pi]; if (!a) return null; const mm = new RegExp('^' + pe + '\\s*([-+])\\s*(\\d+)$').exec(a); return mm ? (mm[1] === '-' ? -1 : 1) * Number(mm[2]) : null; });
      if (!steps.length || steps.some((x) => x === null)) return;
      const eqBase = baseConds.some((c) => new RegExp('\\b' + pe + '\\s*(===|==)\\s*-?\\d+').test(c) || new RegExp('-?\\d+\\s*(===|==)\\s*' + pe + '\\b').test(c));
      const downBase = baseConds.some((c) => new RegExp('\\b' + pe + '\\s*(<=|<|===|==)\\s*-?\\d+').test(c));
      if (downBase && steps.every((x) => x > 0)) {
        const s = sites[0]; staticMajor = true;
        findings.push({ sev: 'major', line: s.line, title: 'Moving away from the base case', msg: `The base case tests whether ${p} has fallen to a small number (${p} <= … or ${p} === …), but every recursive call makes ${p} BIGGER (${s.args[pi]}). The recursion moves away from its stopping point and will overflow the stack. Count down instead: ${p} - 1.`, fix: (x) => x.replace(new RegExp('\\b' + pe + '\\s*\\+\\s*(\\d+)'), p + ' - $1') });
      } else if (eqBase && steps.every((x) => x < -1)) {
        const s = sites[0]; staticMajor = true; // explains a run-time overflow, so the generic overflow card is not repeated
        findings.push({ sev: 'minor', line: s.line, title: 'Off-by-one: the step may jump over the base case', msg: `The base case checks ${p} with an exact comparison, but every call shrinks ${p} by more than 1 (${s.args[pi]}). Depending on the input the value can skip past the base case (e.g. 5, 3, 1, -1, …) and never stop. Step by 1, or test with <=.`, fix: (x) => x.replace(new RegExp('(\\b' + pe + '\\s*-\\s*)\\d+'), '$11') });
      }
    });

    /* ---- the result of a recursive call must be used when the function returns values ---- */
    const returnsValue = /\breturn\s+[^;\s]/.test(body) || f.expr;
    if (returnsValue) {
      for (const s of sites) {
        if (s.stmt && !f.expr) {
          findings.push({ sev: 'minor', line: s.line, title: 'Recursive result is thrown away', msg: `This call to ${f.name} is a bare statement, but ${f.name} returns values elsewhere. The answer computed by the deeper call is discarded, so the caller returns the wrong thing (usually undefined). Use \`return ${f.name}(…)\` or combine the result into your own return value.`, fix: (x) => x.replace(new RegExp('(^\\s*)(' + f.name.replace(/\$/g, '\\$') + '\\s*\\()'), '$1return $2') });
        }
      }
    }

    /* ---- assignment used as a condition: if (n = 0) ---- */
    condRe.lastIndex = 0;
    while ((m = condRe.exec(body))) {
      const open = m.index + m[0].length - 1, close = matchClose(body, open); if (close < 0) continue;
      const cond = body.slice(open + 1, close);
      const mm = /(^|[^=!<>])=(?![=>])/.exec(cond);
      if (mm) { const at = f.start + open + 1 + mm.index + mm[1].length, line = lineOf(at); findings.push({ sev: 'minor', line, title: 'Assignment inside a condition', msg: 'A single `=` assigns a value instead of comparing, so this `if` is always true or false regardless of the input and the base case never behaves as intended. Use `===` to compare.', fix: (x) => x.replace(/(^|[^=!<>])=(?![=>])/, '$1===') }); break; }
    }
  }

  if (fns.length && !recursive.length) {
    const first = fns[0];
    findings.push({ sev: 'minor', line: lineOf(first.nameIdx), title: 'No recursion found', msg: `${first.name} never calls itself, so the call stack and recursion tree will show a single frame. Call ${first.name} from inside its own body to recurse.` });
  }

  /* ---- dynamic evidence from the sandbox trace ---- */
  if (trace && trace.nodes) {
    const key = (n) => n.name + JSON.stringify(n.args);
    const stuck = trace.nodes.find((n) => n.children.some((c) => key(trace.nodes[c]) === key(n)));
    const defLine = (name) => { const f = fns.find((x) => x.name === name); return f ? lineOf(f.nameIdx) : 1; };
    if (stuck && !staticMajor) findings.push({ sev: 'major', line: defLine(stuck.name), title: 'Infinite Recursion: State is not changing', msg: `${stuck.name} was called with the same arguments as its own recursive call (${stuck.name}(${Object.values(stuck.args).map((v) => JSON.stringify(v)).join(', ')})). Identical input gives identical behaviour, so it will repeat forever. Make the argument move towards the base case.` });
    if (trace.overflow && !staticMajor && !stuck) findings.push({ sev: 'major', line: fns[0] ? lineOf(fns[0].nameIdx) : 1, title: 'Stack overflow at run time', msg: `The depth limit (${trace.maxDepth}) was reached without any call hitting a base case for this input. Check that the base case is reachable from your starting value and that each call moves towards it.` });
    if (trace.timedOut && !staticMajor) findings.push({ sev: 'major', line: fns[0] ? lineOf(fns[0].nameIdx) : 1, title: 'Time limit exceeded', msg: 'The run was stopped by the time limit. Look for an infinite loop or a recursion that does far too much work per call.' });
    const calls = trace.nodes.length;
    if (!trace.halt && !trace.error && calls > 8) {
      const seen = new Map(); trace.nodes.forEach((n) => { const k = key(n); seen.set(k, (seen.get(k) || 0) + 1); });
      const dup = [...seen.values()].reduce((s, c) => s + (c - 1), 0);
      if (dup / calls >= 0.3) findings.push({ sev: 'opt', line: fns[0] ? lineOf(fns[0].nameIdx) : 1, title: 'Overlapping subproblems: memoize', msg: `${dup} of ${calls} calls repeat an input that was already solved. Store each answer the first time (a memo object or Map keyed by the arguments) and return it on later calls: the call tree collapses from exponential to linear.` });
    }
  }

  const rank = { major: 0, minor: 1, opt: 2 };
  findings.sort((a, b) => rank[a.sev] - rank[b.sev] || a.line - b.line);
  return { findings, recursiveFns: recursive.map((f) => f.name) };
}
