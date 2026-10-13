/* Static + dynamic classification of a recursive function.
 * Static (from source text): number of recursive call sites, tail position.
 * Dynamic (from the trace, for the chosen input): branching, depth, base-case lines, redundancy.
 * Everything is a heuristic and is labelled as such in the UI.
 */

  const stripComment = (s) => s.replace(/\/\/.*$/, '');

  function findCallSites(lines, names) {
    const sites = [];
    lines.forEach((raw, li) => {
      let ln = stripComment(raw);
      names.forEach((nm) => {
        const re = new RegExp('(?<![\\w$.])' + nm + '\\s*\\(', 'g');
        const header = new RegExp('function\\s*\\*?\\s+' + nm + '\\s*\\(');
        const hm = header.exec(ln);
        let m;
        while ((m = re.exec(ln))) {
          if (hm && m.index >= hm.index && m.index <= hm.index + hm[0].length) continue; // the declaration itself
          const open = m.index + m[0].length - 1;
          let d = 0, close = -1;
          for (let i = open; i < ln.length; i++) {
            if (ln[i] === '(') d++;
            else if (ln[i] === ')') { d--; if (d === 0) { close = i; break; } }
          }
          const before = ln.slice(0, m.index), after = close >= 0 ? ln.slice(close + 1) : '';
          const tail = /\breturn\s*$/.test(before) && /^\s*;?\s*\}?\s*$/.test(after);
          sites.push({ line: li + 1, name: nm, tail });
        }
      });
    });
    return sites;
  }

export function analyze(trace, lines, meta) {
    const nodes = trace.nodes;
    const names = (trace.names && trace.names.length) ? trace.names : [...new Set(nodes.map((n) => n.name))];
    const sites = findCallSites(lines, names);
    const usedNames = [...new Set(nodes.map((n) => n.name))];
    const calls = nodes.length;
    const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth + 1), 0);
    const leaves = nodes.filter((n) => !n.children.length);
    const maxBranch = nodes.reduce((m, n) => Math.max(m, n.children.length), 0);
    const cached = nodes.filter((n) => n.cached).length;
    const seen = new Map();
    nodes.forEach((n) => { if (!n.cached) { const k = n.name + JSON.stringify(n.args); seen.set(k, (seen.get(k) || 0) + 1); } });
    const redundant = [...seen.values()].reduce((s, c) => s + (c - 1), 0);
    const returned = trace.events.filter((e) => e.k === 'ret');
    const leafRet = returned.filter((e) => !nodes[e.id].children.length);
    const baseLines = [...new Set(leafRet.map((e) => e.line))].sort((a, b) => a - b);
    const recLines = [...new Set(sites.map((s) => s.line))];
    const tailAll = sites.length > 0 && sites.every((s) => s.tail);

    const badges = [];
    if (!calls) badges.push({ label: 'No trace', tone: 'warn', hint: 'Nothing ran.' });
    else if (usedNames.length > 1) badges.push({ label: 'Mutual recursion', tone: 'info', hint: 'Functions ' + usedNames.join(' ⇄ ') + ' call each other in a cycle. A check for "calls itself" alone would miss this.' });
    else if (maxBranch === 0) badges.push({ label: 'No recursion observed', tone: 'warn', hint: 'No call made a further call for this input.' });
    else if (maxBranch === 1) badges.push({ label: 'Linear recursion', tone: 'info', hint: 'Each call makes at most one recursive call, so the call tree is a single chain and equals the stack.' });
    else badges.push({ label: 'Tree recursion (' + maxBranch + ' branches)', tone: 'info', hint: 'Calls spawn several calls. The call tree branches, but the stack only ever holds one root→leaf path.' });
    if (meta && meta.flavor && meta.flavor !== 'User code' && !badges.some((b) => b.label === meta.flavor)) badges.push({ label: meta.flavor, tone: 'accent', hint: 'Design pattern this example illustrates.' });
    if (sites.length) badges.push(tailAll
      ? { label: 'Tail position', tone: 'good', hint: 'Every recursive call is the last thing its function does (nothing is left to combine). Compilers could reuse the frame, but most JavaScript engines do not (only Safari implements proper tail calls).' }
      : { label: 'Not tail-recursive', tone: 'muted', hint: 'Some recursive call is followed by more work (e.g. a multiplication or addition), so the frame must stay on the stack to finish it.' });
    if (cached) badges.push({ label: 'Memoized', tone: 'good', hint: cached + ' call(s) were answered from the cache without recursing.' });

    const warnings = [];
    if (trace.overflow) warnings.push('Stack overflow: the depth limit (' + trace.maxDepth + ') was reached. ' + (leafRet.length === 0 ? 'No call ever reached a base case, so nothing returned. Check that a base case exists and that each call moves toward it.' : 'The recursion is deeper than allowed for this input.'));
    if (trace.timedOut) warnings.push('Time budget exceeded: the run was halted to protect your browser. Look for a loop or a recursion that does too much work per call.');
    if (trace.truncated) warnings.push('Trace truncated at ' + trace.events.length + ' events to keep the page responsive. Use a smaller input.');
    if (trace.error) warnings.push('Your code threw: ' + trace.error);
    if (!trace.overflow && !trace.error && calls > 1 && !cached && redundant / calls >= 0.3) warnings.push(redundant + ' of ' + calls + ' calls (' + Math.round(100 * redundant / calls) + '%) repeat an identical subproblem. Memoization or bottom-up DP would remove this redundancy.');
    if (!trace.overflow && calls && sites.length === 0 && usedNames.length === 1) warnings.push('No self-call was found in the source text. Is this function actually recursive?');

    let complexity = null;
    if (meta && meta.analysis) complexity = { time: meta.analysis.time, space: meta.analysis.space, curated: true, big: meta.big || null };
    else if (calls) {
      complexity = maxBranch <= 1
        ? { big: { time: '~O(n)', space: '~O(n)' }, time: 'Likely O(depth): one call per level (heuristic from the observed chain of ' + calls + ' calls).', space: 'O(depth) = ' + maxDepth + ' frames on this input.' }
          : { big: { time: '~O(' + maxBranch + 'ⁿ)', space: '~O(n)' }, time: 'Branching factor ≥ 2 → time may grow exponentially in depth unless subproblems are shared (heuristic).', space: 'O(depth) = ' + maxDepth + ' frames on this input (one path at a time).' };
    }
    return { stats: { calls, maxDepth, leaves: leaves.length, maxBranch, cached, redundant, baseCalls: leafRet.length }, badges, warnings, baseLines, recLines, sites, tailAll, complexity, names: usedNames };
  }

