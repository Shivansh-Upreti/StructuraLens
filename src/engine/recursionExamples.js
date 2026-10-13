/* Starter programs for the Recursion "My code" workspace (loaded into the editor together with a matching call expression). */
export const RECURSION_EXAMPLES = [
  { label: 'String reverse', call: 'rev("stack")', code: `function rev(s) {
  if (s.length <= 1) return s;        // base case: nothing left to reverse
  return rev(s.slice(1)) + s[0];      // reverse the rest, then append the first letter
}` },
  { label: 'Powers of two', call: 'pow2(6)', code: `function pow2(n) {
  if (n === 0) return 1;              // base case: 2^0
  return 2 * pow2(n - 1);             // 2^n = 2 * 2^(n-1)
}` },
  { label: 'Bug: missing base case', call: 'fact(4)', code: `function fact(n) {
  return n * fact(n - 1);             // nothing ever stops this
}` },
  { label: 'Bug: state never changes', call: 'count(3)', code: `function count(n) {
  if (n === 0) return 0;
  return 1 + count(n);                // same argument forever
}` },
  { label: 'Bug: n-- passes the old value', call: 'sumTo(4)', code: `function sumTo(n) {
  if (n === 0) return 0;
  return n + sumTo(n--);              // post-decrement
}` },
  { label: 'Bug: step skips the base case', call: 'sumTo(5)', code: `function sumTo(n) {
  if (n === 0) return 0;
  return n + sumTo(n - 2);            // 5, 3, 1, -1, ... never 0
}` },
  { label: 'Bug: result thrown away', call: 'sumTo(4)', code: `function sumTo(n) {
  if (n === 0) return 0;
  sumTo(n - 1);                       // answer is discarded
  return n;
}` },
  { label: 'Slow: repeated work (fib)', call: 'fib(8)', code: `function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);     // recomputes the same subproblems
}` },
];
