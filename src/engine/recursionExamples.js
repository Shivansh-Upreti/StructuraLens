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

/* Examples for the other languages. The entry call is read from main() / the top-level call, so `call` is empty. */
export const LANG_EXAMPLES = {
  cpp: [
    { label: 'Fibonacci (tree recursion)', call: '', code: `#include <iostream>
using namespace std;

int fib(int n) {
    if (n <= 1) return n;               // base case
    return fib(n - 1) + fib(n - 2);     // two recursive calls
}

int main() {
    int n = 6;
    cout << "fib(" << n << ") = " << fib(n) << endl;
    return 0;
}` },
    { label: 'Binary search (integer division)', call: '', code: `#include <iostream>
#include <vector>
using namespace std;

int search(vector<int>& a, int lo, int hi, int x) {
    if (lo > hi) return -1;             // empty range: not found
    int mid = (lo + hi) / 2;            // integer division, as in C++
    if (a[mid] == x) return mid;
    if (a[mid] < x) return search(a, mid + 1, hi, x);
    return search(a, lo, mid - 1, x);
}

int main() {
    vector<int> v = {1, 3, 5, 7, 9, 11, 13};
    cout << search(v, 0, v.size() - 1, 11) << endl;
}` },
    { label: 'Tower of Hanoi (output)', call: '', code: `#include <iostream>
using namespace std;

void hanoi(int n, char from, char to, char via) {
    if (n == 0) return;
    hanoi(n - 1, from, via, to);
    cout << "move disk " << n << ": " << from << " -> " << to << endl;
    hanoi(n - 1, via, to, from);
}

int main() {
    hanoi(3, 'A', 'C', 'B');
    return 0;
}` },
    { label: 'Bug: missing base case', call: '', code: `#include <iostream>
using namespace std;

int countDown(int n) {
    return countDown(n - 1);            // nothing ever stops this
}

int main() {
    cout << countDown(5);
}` },
  ],
  c: [
    { label: 'GCD (Euclid)', call: '', code: `#include <stdio.h>

int gcd(int a, int b) {
    if (b == 0) return a;               // base case
    return gcd(b, a % b);
}

int main(void) {
    printf("gcd = %d\\n", gcd(48, 18));
    return 0;
}` },
    { label: 'Grid paths with a memo table', call: '', code: `#include <stdio.h>
#include <string.h>

int memo[8][8];

int paths(int r, int c) {
    if (r == 0 || c == 0) return 1;     // edge of the grid: one way
    if (memo[r][c] != -1) return memo[r][c];
    return memo[r][c] = paths(r - 1, c) + paths(r, c - 1);
}

int main(void) {
    memset(memo, -1, sizeof(memo));
    printf("%d\\n", paths(3, 3));
    return 0;
}` },
  ],
  java: [
    { label: 'Factorial (long)', call: '', code: `public class Main {
    static long fact(int n) {
        if (n <= 1) return 1;           // base case
        return n * fact(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(fact(10));
    }
}` },
    { label: 'Reverse a string', call: '', code: `public class Main {
    static String reverse(String s) {
        if (s.length() <= 1) return s;
        return reverse(s.substring(1)) + s.charAt(0);
    }

    public static void main(String[] args) {
        System.out.println(reverse("stack"));
    }
}` },
    { label: 'Climbing stairs (memo field)', call: '', code: `public class Main {
    static int[] memo = new int[40];

    static int climb(int n) {
        if (n <= 2) return n;
        if (memo[n] != 0) return memo[n];
        return memo[n] = climb(n - 1) + climb(n - 2);
    }

    public static void main(String[] args) {
        System.out.println(climb(10));
    }
}` },
  ],
  python: [
    { label: 'Fibonacci with a memo dict', call: '', code: `def fib(n, memo):
    if n in memo:
        return memo[n]                  # answered from the cache
    if n <= 1:
        return n
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]

print(fib(10, {}))` },
    { label: 'Sum of a list (slicing)', call: '', code: `def total(xs):
    if not xs:                          # empty list is the base case
        return 0
    return xs[0] + total(xs[1:])

if __name__ == "__main__":
    print(total([3, 1, 4, 1, 5]))` },
    { label: 'Permutations (backtracking)', call: '', code: `def permute(arr, k):
    if k == len(arr):
        print(arr)
        return
    for i in range(k, len(arr)):
        arr[k], arr[i] = arr[i], arr[k]
        permute(arr, k + 1)
        arr[k], arr[i] = arr[i], arr[k]   # undo the swap

permute([1, 2, 3], 0)` },
    { label: 'Bug: step skips the base case', call: '', code: `def down(n):
    if n == 0:
        return 0
    return down(n - 2)                  # odd n jumps over 0

print(down(5))` },
  ],
};
