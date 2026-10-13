/* Curated algorithms. Each preset ships:
 *   code      – the source shown to the learner (line numbers below refer to it)
 *   run(T,p)  – a hand-instrumented twin that emits trace events at the matching lines
 *   metaphor  – a real-world story + a mapping from story elements to memory concepts
 *   analysis  – curated notes (complexity, pitfalls); structure is also measured from the trace
 *   think     – Socratic prompts: predict first, then verify by stepping
 */
import { fmt } from './engine.js';

  const parseList = (s, numeric) => {
    const parts = String(s).split(/[\s,]+/).filter(Boolean);
    return numeric ? parts.map(Number).filter((x) => Number.isFinite(x)) : parts;
  };

  const P = [];

  P.push({
    id: 'factorial', group: 'Linear recursion', title: 'Factorial  n!',
    flavor: 'Decrease & conquer',
    params: [{ key: 'n', label: 'n', type: 'int', def: 4, min: 0, max: 12 }],
    code: `function factorial(n) {
  if (n <= 1) {
    return 1;                      // base case
  }
  return n * factorial(n - 1);     // recursive case
}`,
    run(T, { n }) {
      const f = (n, site) => {
        const id = T.enter('factorial', { n }, 1, site);
        T.at(id, 2, `Check the guard: n <= 1 → ${n} <= 1 is ${n <= 1}.`);
        if (n <= 1) {
          T.at(id, 3, 'Guard is true: this is the base case, so we can answer immediately with no further recursion.');
          return T.exit(id, 1, 3);
        }
        T.at(id, 5, `Guard is false. To compute ${n}! we need factorial(${n - 1}) first, then multiply by ${n}.`);
        const r = f(n - 1, `${n} * ▢`);
        return T.exit(id, n * r, 5);
      };
      return f(n, null);
    },
    metaphor: {
      emoji: '🪆', title: 'Nesting dolls',
      text: 'You open a doll to find a smaller doll inside. You cannot finish "opening" the big one until the smallest doll is reached and everything is closed again, in reverse order.',
      map: [['Opening the next doll', 'A recursive call (push frame)'], ['Smallest, solid doll', 'Base case'], ['Dolls left open on the table', 'Paused frames on the stack'], ['Closing dolls one by one', 'Returns unwinding the stack']],
      start: 'You pick up the outermost doll: <b>{c}</b>.',
      call: '{p} is half-open and cannot be closed yet. You open the next doll inside: <b>{c}</b>.',
      base: 'The smallest doll <b>{c}</b> is solid. It hands you the number <b>{v}</b> and you can start closing dolls.',
      ret: 'Doll {c} is closed and passes <b>{v}</b> to the doll around it ({p}).',
    },
    analysis: { time: 'O(n): one call per value of n, constant work in each.', space: 'O(n): the stack holds n frames at the deepest point.', alt: 'A loop with an accumulator uses O(1) space. Recursion here is for learning the stack, not for speed.', pitfalls: ['Negative n never reaches the base case → stack overflow.', 'n! overflows 2⁵³ for n > 18 in JavaScript numbers.'] },
    think: ['Before stepping: how many frames are on the stack at the deepest moment for n = 4?', 'The multiplication happens only after a return. Which direction does the stack grow, and which direction do the answers travel?'],
  });

  P.push({
    id: 'fib', group: 'Tree recursion', title: 'Fibonacci (naive)',
    flavor: 'Overlapping subproblems',
    params: [{ key: 'n', label: 'n', type: 'int', def: 5, min: 0, max: 10 }],
    code: `function fib(n) {
  if (n <= 1) return n;                // base cases: fib(0)=0, fib(1)=1
  return fib(n - 1) + fib(n - 2);      // two recursive calls
}`,
    run(T, { n }) {
      const f = (n, site) => {
        const id = T.enter('fib', { n }, 1, site);
        T.at(id, 2, `Is n <= 1? ${n} <= 1 is ${n <= 1}.`);
        if (n <= 1) return T.exit(id, n, 2);
        T.at(id, 3, `Need fib(${n - 1}) + fib(${n - 2}). Evaluate the left call fib(${n - 1}) first.`);
        const a = f(n - 1, `▢ + fib(${n - 2})`);
        T.at(id, 3, `Left result = ${a}. Now evaluate the right call fib(${n - 2}).`);
        const b = f(n - 2, `${a} + ▢`);
        return T.exit(id, a + b, 3);
      };
      return f(n, null);
    },
    metaphor: {
      emoji: '🗣️', title: 'Asking two assistants',
      text: 'To answer a question you ask two assistants, who each ask two more. Many of them end up being asked the very same question and redo the work from scratch.',
      map: [['Each assistant', 'A stack frame'], ['The two questions asked', 'Two recursive calls (branches)'], ['Same question asked twice', 'Overlapping subproblems'], ['Only one chain waiting at a time', 'The stack holds one root→leaf path']],
      start: 'The manager asks: <b>{c}</b>?',
      call: '{p} cannot answer alone and delegates a question to a new assistant: <b>{c}</b>.',
      base: 'Assistant <b>{c}</b> knows this by heart: <b>{v}</b>.',
      ret: '{c} reports <b>{v}</b> back to {p}.',
    },
    analysis: { time: 'O(φⁿ) ≈ O(1.618ⁿ): the call tree roughly doubles every level.', space: 'O(n): only one root→leaf path is on the stack at once, even though the tree is huge.', alt: 'Memoization (see the next example) or a bottom-up loop gives O(n) time.', pitfalls: ['fib(40) with this code makes over 300 million calls.', 'The tree has far more nodes than the stack ever has frames: compare both views.'] },
    think: ['How many calls does fib(5) make? Predict, then read the call count in Analysis.', 'Which subproblem appears most often in the tree? How could you avoid recomputing it?'],
  });

  P.push({
    id: 'fibmemo', group: 'Tree recursion', title: 'Fibonacci (memoized)',
    flavor: 'Dynamic programming (top-down)',
    params: [{ key: 'n', label: 'n', type: 'int', def: 6, min: 0, max: 20 }],
    code: `function fib(n, memo = {}) {
  if (n in memo) return memo[n];       // cache hit: skip the subtree
  if (n <= 1) return n;                // base cases
  memo[n] = fib(n - 1, memo) + fib(n - 2, memo);
  return memo[n];
}`,
    run(T, { n }) {
      const memo = {};
      const f = (n, site) => {
        const id = T.enter('fib', { n }, 1, site, { g: { memo: { ...memo } } });
        T.at(id, 2, `Is ${n} already in memo? ${n in memo}.`);
        if (n in memo) return T.exit(id, memo[n], 2, { cached: true });
        T.at(id, 3, `Is n <= 1? ${n} <= 1 is ${n <= 1}.`);
        if (n <= 1) return T.exit(id, n, 3);
        T.at(id, 4, `Not cached. Compute the left call fib(${n - 1}) first.`);
        const a = f(n - 1, `memo[${n}] = ▢ + fib(${n - 2}, memo)`);
        T.at(id, 4, `Left result = ${a}. Now the right call fib(${n - 2}); it may already be cached.`);
        const b = f(n - 2, `memo[${n}] = ${a} + ▢`);
        memo[n] = a + b;
        T.at(id, 5, `Store memo[${n}] = ${a + b} so nobody recomputes it, then return it.`, { g: { memo: { ...memo } } });
        return T.exit(id, memo[n], 5);
      };
      return f(n, null);
    },
    metaphor: {
      emoji: '📒', title: 'The notebook',
      text: 'Same assistants as before, but now each writes the answer in a shared notebook. A later assistant checks the notebook first and answers instantly.',
      map: [['Shared notebook', 'memo object (shared state)'], ['Reading an existing answer', 'Cache hit: leaf instead of subtree'], ['Writing the answer down', 'memo[n] = …']],
      start: 'The manager asks: <b>{c}</b>? The notebook is empty.',
      call: '{p} delegates <b>{c}</b> to an assistant who first checks the notebook.',
      base: '<b>{c}</b> is answered immediately: <b>{v}</b>.',
      ret: '{c} reports <b>{v}</b> to {p}.',
    },
    analysis: { time: 'O(n): each distinct n is computed once; other calls are O(1) cache hits.', space: 'O(n): memo table plus a stack at most n deep.', alt: 'Bottom-up DP (a loop) keeps two variables → O(1) space.', pitfalls: ['A shared mutable memo is hidden state: it must be reset between unrelated problems.', 'Memoization only helps when subproblems actually repeat.'] },
    think: ['Compare the tree with the naive version for the same n. Where did the subtrees go?', 'Which calls become cache hits, and why do they all appear on the right side?'],
  });

  P.push({
    id: 'sumarray', group: 'Linear recursion', title: 'Sum of an array',
    flavor: 'Head + rest',
    params: [{ key: 'arr', label: 'array', type: 'numlist', def: '3, 1, 4, 1, 5', max: 8 }],
    code: `function sumArray(arr, i = 0) {
  if (i === arr.length) return 0;        // base case: nothing left
  return arr[i] + sumArray(arr, i + 1);  // current + sum of the rest
}`,
    run(T, { arr }) {
      const f = (i, site) => {
        const id = T.enter('sumArray', { arr, i }, 1, site, { hide: ['arr'] });
        T.at(id, 2, `i = ${i}, arr.length = ${arr.length}. i === arr.length is ${i === arr.length}.`);
        if (i === arr.length) return T.exit(id, 0, 2);
        T.at(id, 3, `Add arr[${i}] = ${arr[i]} to the sum of everything after it: sumArray(arr, ${i + 1}).`);
        const r = f(i + 1, `${arr[i]} + ▢`);
        return T.exit(id, arr[i] + r, 3);
      };
      return f(0, null);
    },
    metaphor: {
      emoji: '🧾', title: 'Receipt pile',
      text: 'You hand the pile to a clerk: "I take the top receipt; you total the rest." Each clerk repeats this until the pile is empty (total 0), then every clerk adds their receipt and reports upward.',
      map: [['Pile with one fewer receipt', 'Smaller input (i + 1)'], ['Empty pile = 0', 'Base case'], ['Clerk holding one receipt', 'Paused frame with arr[i]']],
      start: 'You give the whole pile to a clerk: <b>{c}</b>.',
      call: '{p} keeps the top receipt and passes the rest to a new clerk: <b>{c}</b>.',
      base: 'The pile is empty at <b>{c}</b>: total <b>{v}</b>.',
      ret: '{c} reports a subtotal of <b>{v}</b> to {p}, who adds their own receipt.',
    },
    analysis: { time: 'O(n)', space: 'O(n) frames. A plain loop is O(1).', alt: 'for…of or reduce. Recursion shines when the structure itself is recursive (trees, nested lists).', pitfalls: ['Copying slices (arr.slice(1)) in each call would make this O(n²); using an index avoids that.'] },
    think: ['The additions all happen on the way back. What is each frame holding while it waits?', 'What changes if you reorder the line to sumArray(arr, i+1) + arr[i]?'],
  });

  P.push({
    id: 'gcd', group: 'Linear recursion', title: 'GCD (Euclid) – tail recursion',
    flavor: 'Tail recursion',
    params: [{ key: 'a', label: 'a', type: 'int', def: 48, min: 0, max: 999 }, { key: 'b', label: 'b', type: 'int', def: 18, min: 0, max: 999 }],
    code: `function gcd(a, b) {
  if (b === 0) return a;          // base case
  return gcd(b, a % b);           // tail call: nothing left to do after it
}`,
    run(T, { a, b }) {
      const f = (a, b, site) => {
        const id = T.enter('gcd', { a, b }, 1, site);
        T.at(id, 2, `b === 0? b = ${b}, so ${b === 0}.`);
        if (b === 0) return T.exit(id, a, 2);
        T.at(id, 3, `Reduce the problem: gcd(${b}, ${a} % ${b}) = gcd(${b}, ${a % b}).`);
        const r = f(b, a % b, 'return ▢');
        return T.exit(id, r, 3);
      };
      return f(a, b, null);
    },
    metaphor: {
      emoji: '🟦', title: 'Tiling a floor',
      text: 'Cover an a×b floor with the largest square tiles that fit exactly. Cut off as many big squares as possible and repeat on the leftover strip. The last tile size that fits is the GCD.',
      map: [['Leftover strip', 'Next call gcd(b, a % b)'], ['No leftover (b = 0)', 'Base case'], ['Answer passes through unchanged', 'Tail call: frames carry no pending work']],
      start: 'You measure the floor: <b>{c}</b>.',
      call: 'The leftover strip from {p} is smaller, so you measure it: <b>{c}</b>.',
      base: 'There is no leftover at <b>{c}</b>. The tile size is <b>{v}</b>.',
      ret: 'The tile size <b>{v}</b> is passed through {c} → {p} unchanged.',
    },
    analysis: { time: 'O(log min(a, b)): remainders shrink at least by half every two steps.', space: 'O(depth) here; O(1) if the engine eliminates tail calls (ES2015 specifies it, but only Safari implements it).', alt: 'Trivially rewritten as a while loop because the frame carries no pending work.', pitfalls: ['Tail-call optimisation is a property of the engine, not of your code.'] },
    think: ['Every frame returns exactly the value it receives. Why does that make the frames "disposable"?', 'Try a = 17, b = 5 and then a = 5, b = 17. What does the first call do?'],
  });

  P.push({
    id: 'power', group: 'Divide & conquer', title: 'Fast exponentiation',
    flavor: 'Divide & conquer',
    params: [{ key: 'x', label: 'x', type: 'int', def: 2, min: 1, max: 9 }, { key: 'n', label: 'n', type: 'int', def: 10, min: 0, max: 15 }],
    code: `function power(x, n) {
  if (n === 0) return 1;                       // base case
  const half = power(x, Math.floor(n / 2));    // solve a problem half the size
  if (n % 2 === 0) return half * half;
  return x * half * half;
}`,
    run(T, { x, n }) {
      const f = (x, n, site) => {
        const id = T.enter('power', { x, n }, 1, site);
        T.at(id, 2, `n === 0? n = ${n}, so ${n === 0}.`);
        if (n === 0) return T.exit(id, 1, 2);
        T.at(id, 3, `Halve the problem: need power(${x}, ${Math.floor(n / 2)}).`);
        const half = f(x, Math.floor(n / 2), 'const half = ▢');
        T.at(id, 4, `half = ${half}. n = ${n} is ${n % 2 === 0 ? 'even → half * half' : 'odd → one extra factor of x'}.`, { vars: { half } });
        if (n % 2 === 0) return T.exit(id, half * half, 4);
        T.at(id, 5, `n is odd: x * half * half = ${x} * ${half} * ${half}.`);
        return T.exit(id, x * half * half, 5);
      };
      return f(x, n, null);
    },
    metaphor: {
      emoji: '📄', title: 'Folding paper',
      text: 'To know how thick a pile of 2ⁿ sheets is, fold it in half: you only need the thickness of half the pile, then double it. The work shrinks by half each time.',
      map: [['Folding in half', 'n → floor(n/2)'], ['Unfolded sheet', 'Base case n = 0'], ['Doubling back up', 'half * half on return']],
      start: 'You need <b>{c}</b>.',
      call: '{p} asks a colleague to solve the half-size problem: <b>{c}</b>.',
      base: 'Zero sheets at <b>{c}</b>: the answer is <b>{v}</b>.',
      ret: '{c} reports <b>{v}</b>; {p} squares it (and maybe multiplies once more by x).',
    },
    analysis: { time: 'O(log n) multiplications, versus O(n) for repeated multiplication.', space: 'O(log n) frames.', alt: 'Iterative square-and-multiply, same time, O(1) space.', pitfalls: ['The result of the recursive call is stored in a variable and used twice. Calling power(...) twice would silently destroy the speed-up (back to O(n)).'] },
    think: ['The result of the recursive call is reused twice. What happens to the call tree if you write power(...) * power(...) instead?', 'How many frames for n = 15 versus n = 1000?'],
  });

  P.push({
    id: 'hanoi', group: 'Divide & conquer', title: 'Tower of Hanoi',
    flavor: 'Divide & conquer',
    params: [{ key: 'n', label: 'disks', type: 'int', def: 3, min: 1, max: 5 }],
    code: `function hanoi(n, from, to, via) {
  if (n === 0) return;
  hanoi(n - 1, from, via, to);     // park n-1 disks out of the way
  move(n, from, to);               // move the biggest disk
  hanoi(n - 1, via, to, from);     // bring the n-1 disks back on top
}`,
    run(T, { n }) {
      const pegs = { A: [], B: [], C: [] };
      for (let d = n; d >= 1; d--) pegs.A.push(d);
      const snap = () => ({ A: [...pegs.A], B: [...pegs.B], C: [...pegs.C] });
      const f = (n, from, to, via, site) => {
        const id = T.enter('hanoi', { n, from, to, via }, 1, site, { g: snap() });
        T.at(id, 2, `n === 0? n = ${n}, so ${n === 0}.`);
        if (n === 0) return T.exit(id, undefined, 2);
        T.at(id, 3, `First park the top ${n - 1} disk(s) on ${via}: hanoi(${n - 1}, ${from}, ${via}, ${to}).`);
        f(n - 1, from, via, to, '▢');
        pegs[from].pop(); pegs[to].push(n);
        T.at(id, 4, `Move disk ${n} from ${from} → ${to}.`, { out: `Move disk ${n}: ${from} → ${to}`, g: snap() });
        T.at(id, 5, `Now bring the ${n - 1} parked disk(s) from ${via} onto ${to}.`);
        f(n - 1, via, to, from, '▢');
        return T.exit(id, undefined, 5);
      };
      return f(n, 'A', 'C', 'B', null);
    },
    metaphor: {
      emoji: '🗼', title: 'Delegating to a helper',
      text: 'You are only allowed to move one disk. So you hire a helper to clear the top n-1 disks, move the big one yourself, then hire the helper again to rebuild the tower on top. The helper uses the same trick.',
      map: [['Helper with a smaller tower', 'Recursive call hanoi(n-1, …)'], ['Your single move', 'The work done between the two calls'], ['Roles of pegs swap', 'Arguments from / to / via rotate']],
      start: 'You are asked to solve <b>{c}</b>.',
      call: '{p} delegates a smaller tower to a helper: <b>{c}</b>.',
      base: 'No disks left at <b>{c}</b>: nothing to do.',
      ret: 'Helper {c} is done. {p} continues with its own next step.',
    },
    analysis: { time: 'O(2ⁿ): exactly 2ⁿ − 1 moves, which is provably the minimum.', space: 'O(n): depth is n even though the tree has 2ⁿ⁺¹ − 1 calls.', alt: 'An iterative solution exists but is far less obvious. This is a problem where recursion is the clearest tool.', pitfalls: ['No return value: this is recursion for side effects. Watch the output panel instead of the return values.'] },
    think: ['Predict the number of moves for 4 disks, then check the Output tab.', 'The same function appears twice per frame. Which of the two calls is "on the stack" when disk n is moved?'],
  });

  P.push({
    id: 'bsearch', group: 'Divide & conquer', title: 'Binary search',
    flavor: 'Divide & conquer',
    params: [{ key: 'arr', label: 'sorted array', type: 'numlist', def: '2, 5, 8, 12, 16, 23, 38, 56', max: 16 }, { key: 'target', label: 'target', type: 'int', def: 23, min: -999, max: 999 }],
    code: `function binarySearch(arr, target, lo = 0, hi = arr.length - 1) {
  if (lo > hi) return -1;                 // empty range → not found
  const mid = Math.floor((lo + hi) / 2);
  if (arr[mid] === target) return mid;    // found it
  if (arr[mid] < target)
    return binarySearch(arr, target, mid + 1, hi);   // search right half
  return binarySearch(arr, target, lo, mid - 1);     // search left half
}`,
    run(T, { arr, target }) {
      const a = [...arr].sort((x, y) => x - y);
      const f = (lo, hi, site) => {
        const id = T.enter('binarySearch', { arr: a, target, lo, hi }, 1, site, { hide: ['arr', 'target'] });
        T.at(id, 2, `Range [${lo}, ${hi}]: lo > hi is ${lo > hi}.`);
        if (lo > hi) return T.exit(id, -1, 2);
        const mid = Math.floor((lo + hi) / 2);
        T.at(id, 3, `mid = floor((${lo} + ${hi}) / 2) = ${mid}; arr[${mid}] = ${a[mid]}.`, { vars: { mid } });
        T.at(id, 4, `Is arr[${mid}] = ${a[mid]} equal to target ${target}? ${a[mid] === target}.`);
        if (a[mid] === target) return T.exit(id, mid, 4);
        T.at(id, 5, `${a[mid]} ${a[mid] < target ? '<' : '>'} ${target}, so the target can only be in the ${a[mid] < target ? 'right' : 'left'} half.`);
        let r;
        if (a[mid] < target) { T.at(id, 6, `Search the right half: [${mid + 1}, ${hi}].`); r = f(mid + 1, hi, 'return ▢'); return T.exit(id, r, 6); }
        T.at(id, 7, `Search the left half: [${lo}, ${mid - 1}].`);
        r = f(lo, mid - 1, 'return ▢');
        return T.exit(id, r, 7);
      };
      return f(0, a.length - 1, null);
    },
    metaphor: {
      emoji: '📖', title: 'Looking up a word in a dictionary',
      text: 'You open the dictionary in the middle, see you are too early or too late alphabetically, and throw away half of it. Repeat on the remaining half.',
      map: [['Half the dictionary thrown away', 'Range [lo, hi] shrinks'], ['Empty range', 'Base case: -1 (not found)'], ['Page matches', 'Base case: return mid']],
      start: 'You open the dictionary: <b>{c}</b>.',
      call: 'From {p} you narrow the pages and look again: <b>{c}</b>.',
      base: 'Search ends at <b>{c}</b> with <b>{v}</b>.',
      ret: 'The answer <b>{v}</b> is passed back unchanged from {c} to {p}.',
    },
    analysis: { time: 'O(log n): the range halves each call.', space: 'O(log n) frames (O(1) as a loop).', alt: 'A while loop with lo/hi is idiomatic and uses O(1) space.', pitfalls: ['Requires sorted input; the preset sorts it for you. Unsorted data gives wrong answers silently.', 'Off-by-one errors in mid ± 1 can loop forever.'] },
    think: ['Only one of the two recursive calls runs per frame. How does that show up in the tree?', 'What input gives the worst-case depth?'],
  });

  P.push({
    id: 'subsets', group: 'Backtracking', title: 'All subsets (include / exclude)',
    flavor: 'Backtracking / decision tree',
    params: [{ key: 'items', label: 'items', type: 'list', def: 'a, b, c', max: 4 }],
    code: `function subsets(items, i = 0, chosen = []) {
  if (i === items.length) {
    print(chosen);                          // one complete subset
    return;
  }
  subsets(items, i + 1, chosen);                 // exclude items[i]
  subsets(items, i + 1, [...chosen, items[i]]);  // include items[i]
}`,
    run(T, { items }) {
      const f = (i, chosen, site) => {
        const id = T.enter('subsets', { items, i, chosen }, 1, site, { hide: ['items'] });
        T.at(id, 2, `i = ${i}, items.length = ${items.length}. i === items.length is ${i === items.length}.`);
        if (i === items.length) {
          T.at(id, 3, `Every item has been decided. Emit the subset ${fmt(chosen)}.`, { out: '{ ' + chosen.join(', ') + ' }' });
          return T.exit(id, undefined, 4);
        }
        T.at(id, 6, `Decision for "${items[i]}": first EXCLUDE it.`);
        f(i + 1, chosen, '▢');
        T.at(id, 7, `Back from the exclude branch. Now INCLUDE "${items[i]}".`);
        f(i + 1, [...chosen, items[i]], '▢');
        return T.exit(id, undefined, 7);
      };
      return f(0, [], null);
    },
    metaphor: {
      emoji: '🍕', title: 'Choosing pizza toppings',
      text: 'For each topping you decide "no" or "yes", then move on to the next topping. Walking every yes/no path enumerates every possible pizza. Backing up to flip an earlier choice is backtracking.',
      map: [['One topping decision', 'One recursion level (i)'], ['Both choices explored', 'Two recursive calls'], ['A finished pizza', 'Leaf at i === items.length'], ['Backing up one decision', 'A return to the paused parent']],
      start: 'You start with no toppings decided: <b>{c}</b>.',
      call: 'At {p} you branch the decision. Now exploring <b>{c}</b>.',
      base: 'All toppings decided at <b>{c}</b>: write the pizza on the menu.',
      ret: 'Branch {c} is exhausted; you back up to {p} and try the other choice.',
    },
    analysis: { time: 'O(2ⁿ · n): 2ⁿ subsets, each of size up to n.', space: 'O(n) depth (plus the output).', alt: 'Bitmask enumeration, same count.', pitfalls: ['If you mutate one shared array (push/pop) instead of copying, you must undo the change on return, which is the core of backtracking.'] },
    think: ['The tree has 2ⁿ leaves. Which part of each frame encodes the choices made so far?', 'What does the stack look like when the 5th subset is printed?'],
  });

  P.push({
    id: 'evenodd', group: 'Mutual recursion', title: 'isEven / isOdd',
    flavor: 'Mutual recursion',
    params: [{ key: 'n', label: 'n', type: 'int', def: 5, min: 0, max: 14 }],
    code: `function isEven(n) {
  if (n === 0) return true;
  return isOdd(n - 1);
}

function isOdd(n) {
  if (n === 0) return false;
  return isEven(n - 1);
}`,
    run(T, { n }) {
      const ev = (n, site) => {
        const id = T.enter('isEven', { n }, 1, site);
        T.at(id, 2, `n === 0? ${n === 0}.`);
        if (n === 0) return T.exit(id, true, 2);
        T.at(id, 3, `${n} is even iff ${n - 1} is odd. Delegate to isOdd(${n - 1}).`);
        return T.exit(id, od(n - 1, 'return ▢'), 3);
      };
      const od = (n, site) => {
        const id = T.enter('isOdd', { n }, 6, site);
        T.at(id, 7, `n === 0? ${n === 0}.`);
        if (n === 0) return T.exit(id, false, 7);
        T.at(id, 8, `${n} is odd iff ${n - 1} is even. Delegate to isEven(${n - 1}).`);
        return T.exit(id, ev(n - 1, 'return ▢'), 8);
      };
      return ev(n, null);
    },
    metaphor: {
      emoji: '🏓', title: 'Ping-pong',
      text: 'Two players hit the ball back and forth, each decrementing a counter. Neither calls itself, but together they form a cycle, which is mutual recursion.',
      map: [['Each player', 'A function'], ['Ball crossing the net', 'A call to the other function'], ['Ball dead at 0', 'Both base cases']],
      start: 'Serve: <b>{c}</b>.',
      call: '{p} hits it back to the other player: <b>{c}</b>.',
      base: 'The ball dies at <b>{c}</b>: <b>{v}</b>.',
      ret: 'The verdict <b>{v}</b> is passed back from {c} to {p}.',
    },
    analysis: { time: 'O(n)', space: 'O(n) frames.', alt: 'n % 2 === 0. Use this example to learn the shape, not the algorithm.', pitfalls: ['A static check that only looks for a function calling itself misses cycles like this. Notice the analysis reports two functions in the trace.'] },
    think: ['No function calls itself directly. How do you know it still terminates?', 'What would happen if isOdd(0) returned true by mistake?'],
  });

  P.push({
    id: 'overflow', group: 'Failure modes', title: 'Missing base case → stack overflow',
    flavor: 'Bug demonstration',
    maxDepth: 14,
    params: [{ key: 'n', label: 'n', type: 'int', def: 3, min: -5, max: 9 }],
    code: `function countdown(n) {
  print(n);
  // BUG: nothing ever stops this call chain
  return countdown(n - 1);
}`,
    run(T, { n }) {
      const f = (n, site) => {
        const id = T.enter('countdown', { n }, 1, site);
        T.at(id, 2, `print(${n}).`, { out: String(n) });
        T.at(id, 4, `There is no guard, so we ALWAYS recurse: countdown(${n - 1}).`);
        const r = f(n - 1, 'return ▢');
        return T.exit(id, r, 4);
      };
      return f(n, null);
    },
    metaphor: {
      emoji: '📝', title: 'A to-do list that adds to itself',
      text: 'Every task on your list says "first do the next task". You never finish one, so the list (the stack) just keeps growing until the desk is full.',
      map: [['Each task waiting', 'Paused frame'], ['Desk full', 'Stack limit → RangeError'], ['A task that says "stop"', 'The missing base case']],
      start: 'You begin: <b>{c}</b>.',
      call: '{p} says "first do the next task": <b>{c}</b>.',
      base: '',
      ret: '',
    },
    analysis: { time: 'Never terminates.', space: 'Grows without bound until the runtime kills it (the depth limit here is deliberately small: 14).', alt: 'Add a base case, for example if (n < 0) return; before the recursive call.', pitfalls: ['A base case must exist AND every recursive call must move toward it.', 'The Analysis tab reports that no call ever returned.'] },
    think: ['Which line should hold the base case? Write it, then switch to Factorial and compare the structure.', 'Even with a base case, what input could still make this loop forever?'],
  });

  /* ---- custom code ---- */
  const CUSTOM_DEFAULT = `function sumTo(n) {
  if (n === 0) return 0;
  return n + sumTo(n - 1);
}`;

  const CUSTOM = {
    id: 'custom', group: 'Your own code', title: 'Custom Code',
    flavor: 'User code', custom: true,
    params: [{ key: 'call', label: 'call', type: 'text', def: 'sumTo(4)' }, { key: 'depth', label: 'depth limit', type: 'int', def: 40, min: 5, max: 200 }],
    code: CUSTOM_DEFAULT,
    metaphor: {
      emoji: '📨', title: 'A chain of delegation',
      text: 'Each call is a person who cannot finish their job until the person they delegate to reports back. The people waiting form the call stack; the answers travel back up the chain.',
      map: [['Delegating a task', 'A recursive call (push)'], ['A person who can answer alone', 'Base case'], ['People waiting', 'Paused frames'], ['Reporting back', 'Return values bubbling up']],
      start: 'The first request is made: <b>{c}</b>.',
      call: '{p} cannot finish alone and delegates: <b>{c}</b>.',
      base: '<b>{c}</b> can answer without help: <b>{v}</b>.',
      ret: '{c} reports <b>{v}</b> to {p}.',
    },
    analysis: null,
    think: ['Where is your base case? Does every recursive call move closer to it?', 'Predict the deepest stack size and the number of calls, then compare with the Analysis tab.'],
  };

  const BIG = {
    factorial: ['O(n)', 'O(n)'], fib: ['O(2ⁿ)', 'O(n)'], fibmemo: ['O(n)', 'O(n)'], sumarray: ['O(n)', 'O(n)'],
    gcd: ['O(log n)', 'O(log n)'], power: ['O(log n)', 'O(log n)'], hanoi: ['O(2ⁿ)', 'O(n)'], bsearch: ['O(log n)', 'O(log n)'],
    subsets: ['O(2ⁿ·n)', 'O(n)'], evenodd: ['O(n)', 'O(n)'], overflow: ['O(∞)', 'unbounded'],
  };
  P.forEach((p) => { if (BIG[p.id]) p.big = { time: BIG[p.id][0], space: BIG[p.id][1] }; });

export const PRESETS = P.concat([CUSTOM]);
export const byId = (id) => PRESETS.find((p) => p.id === id);
export { parseList, CUSTOM_DEFAULT };
