/* LanguageAdapter: C, C++, Java and Python -> JavaScript for the tracing worker.
 *
 * What it is: a light, LINE-PRESERVING source-to-source translator (regex rules plus a small
 * indentation pass for Python and brace matching for main()). Line N of the output is line N of
 * the learner's code, so the trace engine's line numbers, the call stack and the tree map back
 * to the original source with no extra bookkeeping.
 *
 * What it is not: a compiler. It covers the subset that recursion exercises use: functions,
 * int/long/double/bool/char/string locals, arrays and vectors/lists, if/else, for/while
 * (including range-for and Python range()), recursion, cout/printf/System.out/print, min/max/abs,
 * integer division. It does NOT model pointers, references to scalars, structs/classes, templates,
 * overflow of fixed-width integers, char arithmetic, or Python generators/closures. Unsupported
 * code usually fails with a JavaScript syntax/reference error, which is reported to the learner.
 *
 * Pure functions, no eval: safe to import on the main thread (static analysis) and in the worker.
 */

export const LANGS = {
  javascript: {
    label: 'JavaScript', ext: 'js',
    boiler: `function sumTo(n) {
  if (n === 0) return 0;      // base case
  return n + sumTo(n - 1);    // recursive case
}`,
  },
  cpp: {
    label: 'C++', ext: 'cpp',
    boiler: `#include <iostream>
using namespace std;

int sumTo(int n) {
    if (n == 0) return 0;       // base case
    return n + sumTo(n - 1);    // recursive case
}

int main() {
    cout << sumTo(4) << endl;
    return 0;
}`,
  },
  c: {
    label: 'C', ext: 'c',
    boiler: `#include <stdio.h>

int sumTo(int n) {
    if (n == 0) return 0;       // base case
    return n + sumTo(n - 1);    // recursive case
}

int main(void) {
    printf("%d\\n", sumTo(4));
    return 0;
}`,
  },
  java: {
    label: 'Java', ext: 'java',
    boiler: `public class Main {
    static int sumTo(int n) {
        if (n == 0) return 0;       // base case
        return n + sumTo(n - 1);    // recursive case
    }

    public static void main(String[] args) {
        System.out.println(sumTo(4));
    }
}`,
  },
  python: {
    label: 'Python', ext: 'py',
    boiler: `def sum_to(n):
    if n == 0:
        return 0                # base case
    return n + sum_to(n - 1)    # recursive case

if __name__ == "__main__":
    print(sum_to(4))`,
  },
};
export const LANG_IDS = Object.keys(LANGS);
export const isLang = (l) => Object.prototype.hasOwnProperty.call(LANGS, l);

/* ------------------------------------------------------------------ helpers */

const ID = '[A-Za-z_]\\w*';

/** Replace string/char literals with opaque tokens so rules never touch their contents. */
function mask(code, python) {
  const lits = [];
  let out = '', i = 0;
  while (i < code.length) {
    const ch = code[i];
    const fpre = python && (ch === 'f' || ch === 'F') && (code[i + 1] === '"' || code[i + 1] === "'") && !/\w/.test(code[i - 1] || '');
    if (ch === '"' || ch === "'" || fpre) {
      const start = i; const q = fpre ? code[i + 1] : ch; i += fpre ? 2 : 1;
      while (i < code.length && code[i] !== q) i += code[i] === '\\' ? 2 : 1;
      i++;
      let lit = code.slice(start, i);
      if (fpre) lit = '`' + lit.slice(2, -1).replace(/`/g, '\\`').replace(/\{([^{}]+)\}/g, '${$1}') + '`';
      out += '\u0000' + lits.length + '\u0001'; lits.push(lit);
    } else { out += ch; i++; }
  }
  return { code: out, restore: (s) => s.replace(/\u0000(\d+)\u0001/g, (_, n) => lits[+n]) };
}

/** Split a (masked) line into code and trailing comment. */
function splitComment(code, marker) {
  const i = code.indexOf(marker);
  return i < 0 ? [code, ''] : [code.slice(0, i), code.slice(i)];
}

function matchClose(s, i, open, close) {
  let d = 0;
  for (let k = i; k < s.length; k++) { if (s[k] === open) d++; else if (s[k] === close && --d === 0) return k; }
  return -1;
}
function matchOpen(s, i, open, close) {
  let d = 0;
  for (let k = i; k >= 0; k--) { if (s[k] === close) d++; else if (s[k] === open && --d === 0) return k; }
  return -1;
}
function splitTop(s, sep) {
  const out = []; let d = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    if (d === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Rewrite every `name(args)` call (balanced parentheses) with fn(argsArray, fullMatch). */
function mapCalls(code, name, fn) {
  const re = new RegExp(`(?<![\\w.])${name}\\s*\\(`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    const open = m.index + m[0].length - 1, close = matchClose(code, open, '(', ')');
    if (close < 0) break;
    out += code.slice(last, m.index) + fn(splitTop(code.slice(open + 1, close), ',').map((a) => a.trim()).filter((a, i, all) => a || all.length > 1));
    last = close + 1; re.lastIndex = close + 1;
  }
  return out + code.slice(last);
}

/* Operand scanning for integer / floor division. */
function leftOperand(s, i) {
  let k = i;
  while (k >= 0 && s[k] === ' ') k--;
  const end = k + 1;
  for (;;) {
    if (s[k] === ')' || s[k] === ']') { k = matchOpen(s, k, s[k] === ')' ? '(' : '[', s[k]) - 1; if (k < -1) return null; }
    else if (k >= 0 && /[\w.$\u0000\u0001]/.test(s[k])) { while (k >= 0 && /[\w.$\u0000\u0001]/.test(s[k])) k--; }
    else break;
    if (!(k >= 0 && (/[\w.$\]\)\u0001]/.test(s[k])))) break;
  }
  return end - (k + 1) > 0 ? { start: k + 1, text: s.slice(k + 1, end) } : null;
}
function rightOperand(s, i) {
  let k = i;
  while (s[k] === ' ') k++;
  const start = k;
  if (s[k] === '-' || s[k] === '+') k++;
  if (s[k] === '(') k = matchClose(s, k, '(', ')') + 1;
  else { while (k < s.length && /[\w.$\u0000\u0001]/.test(s[k])) k++; }
  while (s[k] === '(' || s[k] === '[') k = matchClose(s, k, s[k], s[k] === '(' ? ')' : ']') + 1;
  return k > start && k > 0 ? { end: k, text: s.slice(start, k) } : null;
}
/** Rewrite `L op R` as build(L, R) unless skip(L, R). op is '/' (C-like) or '//' (Python). */
function rewriteDivision(s, op, build, skip) {
  let i = 0;
  while ((i = s.indexOf(op, i)) >= 0) {
    const after = s[i + op.length], before = s[i - 1];
    if (after === '=' || after === '/' || after === '*' || before === '/' || before === '*') { i += op.length + 1; continue; }
    const L = leftOperand(s, i - 1), R = rightOperand(s, i + op.length);
    if (!L || !R || skip(L.text, R.text)) { i += op.length; continue; }
    const rep = build(L.text, R.text);
    s = s.slice(0, L.start) + rep + s.slice(R.end);
    i = L.start + rep.length;
  }
  return s;
}

/* ------------------------------------------------------------------ C / C++ / Java */

const PTR = '(?:\\s*[*&]+\\s*|\\s+)';   // `int *p`, `int* p`, `int & r`, `int x`
const MODS = '(?:(?:public|private|protected|static|final|inline|constexpr|extern|virtual|synchronized|register|volatile|const|unsigned|signed)\\s+)*';
const NOT_TYPE = new Set(['return', 'else', 'new', 'delete', 'throw', 'case', 'goto', 'typedef', 'using', 'do', 'if', 'while', 'for', 'switch', 'sizeof', 'catch']);
const BASE_TYPES = ['long\\s+long', 'long\\s+double', 'unsigned\\s+(?:int|long|char|short)', 'unsigned', 'long', 'short', 'int', 'double', 'float', 'bool', 'boolean', 'char', 'byte', 'auto', 'size_t', 'string', 'String', 'Integer', 'Long', 'Double', 'Boolean', 'Character', 'var'];
const GENERIC = '(?:vector|List|ArrayList|LinkedList|map|unordered_map|HashMap|Map|TreeMap|set|unordered_set|HashSet|Set|deque|Deque|ArrayDeque|stack|Stack|queue|Queue|pair|array)\\s*<[^;=()]*>';
const FLOAT_TYPES = /^(?:long\s+double|double|float|Double)$/;
const DEFAULTS = { int: '0', long: '0', short: '0', byte: '0', double: '0', float: '0', char: "''", boolean: 'false', bool: 'false', String: 'null', string: "''" };

function cParams(list) {
  if (!list.trim() || list.trim() === 'void') return [];
  return splitTop(list, ',').map((p) => {
    const m = /([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)*(?:=.*)?$/.exec(p.trim());
    return m ? m[1] : p.trim();
  });
}

function preScanC(lines, lang) {
  const aliases = [], fnNames = [], floatNames = new Set();
  const typeAlt = () => `(?:${[...aliases, ...BASE_TYPES].join('|')})`;
  lines.forEach((ln) => {
    let m;
    if ((m = /^\s*typedef\s+.+?\s+(\w+)\s*;/.exec(ln)) || (m = /^\s*using\s+(\w+)\s*=/.exec(ln)) || (m = /^\s*#\s*define\s+(\w+)\s+(?:long|int|unsigned|double)\b/.exec(ln))) aliases.push(m[1]);
  });
  const fnRe = new RegExp(`^\\s*${MODS}(${typeAlt()}|(?:std::)?${GENERIC}|${ID})((?:\\s*\\[\\s*\\])*)${PTR}(${ID})\\s*\\(([^()]*)\\)`);
  lines.forEach((ln) => {
    const m = fnRe.exec(ln.replace(/std::/g, ''));
    if (m && !NOT_TYPE.has(m[1].split(/\s/)[0]) && !NOT_TYPE.has(m[3]) && m[3] !== 'main') {
      if (!fnNames.includes(m[3])) fnNames.push(m[3]);
      if (FLOAT_TYPES.test(m[1].trim())) floatNames.add(m[3]);
      splitTop(m[4], ',').forEach((p) => { const pm = /^\s*(?:const\s+)?(long\s+double|double|float)\s*[&*]?\s*(\w+)/.exec(p); if (pm) floatNames.add(pm[2]); });
    }
    const dre = /\b(long\s+double|double|float)\s+([^;()]+)/g; let d;
    while ((d = dre.exec(ln))) d[2].split(',').forEach((v) => { const vm = /^\s*(\w+)/.exec(v); if (vm) floatNames.add(vm[1]); });
  });
  return { aliases, fnNames, floatNames, typeAlt: typeAlt(), lang };
}

function newArray(dims, fill) {
  if (dims.length === 1) return `new Array(${dims[0]}).fill(${fill})`;
  return `Array.from({ length: ${dims[0]} }, () => ${newArray(dims.slice(1), fill)})`;
}

function cStatement(code, ctx) {
  let s = code;
  s = s.replace(/\bstd::/g, '');
  // function header (declarations become `function`, prototypes disappear)
  const fnRe = new RegExp(`^(\\s*)${MODS}(${ctx.typeAlt}|${GENERIC}|${ID})((?:\\s*\\[\\s*\\])*)${PTR}(${ID})\\s*\\(([^()]*)\\)\\s*(?:const\\s*)?(?:throws\\s+[\\w.,\\s]+?)?\\s*(\\{|;|$)`);
  const fm = ctx.top ? fnRe.exec(s) : null;
  if (fm && !NOT_TYPE.has(fm[2].split(/\s/)[0]) && !NOT_TYPE.has(fm[4])) {
    // `int f(int, char*);` is a prototype (drop it); `vector<int> memo(100, -1);` is a constructor call (a declaration).
    const typeStart = new RegExp(`^(?:(?:const|struct|unsigned|signed)\\s+)*(?:${ctx.typeAlt}|${GENERIC}|[A-Z]\\w*)\\b`);
    const proto = fm[6] === ';' && splitTop(fm[5], ',').every((p) => !p.trim() || p.trim() === 'void' || typeStart.test(p.trim()));
    if (proto) return fm[1];
  }
  if (fm && fm[6] !== ';' && !NOT_TYPE.has(fm[2].split(/\s/)[0]) && !NOT_TYPE.has(fm[4])) {
    s = `${fm[1]}function ${fm[4]}(${cParams(fm[5]).join(', ')}) ${fm[6]}` + s.slice(fm[0].length);
  }

  // declarations -> let (C arrays and vector constructors get real JS arrays)
  const declRe = new RegExp(`(^\\s*|[;{(]\\s*|\\bfor\\s*\\(\\s*)(?:(?:public|private|protected|static|final|const|constexpr|register|volatile|unsigned|signed)\\s+)*(${ctx.typeAlt}|${GENERIC})((?:\\s*\\[\\s*\\])*)${PTR}(?=${ID}\\s*(?:[=;,\\[():]|$))`, 'g');
  let declType = null;
  s = s.replace(declRe, (_, pre, type) => { declType = type; return pre + 'let '; });
  if (declType) {
    const base = declType.replace(/\s*<.*/, '').trim();
    const fill = DEFAULTS[base] || '0';
    // int a[n][m];  ->  nested Array
    s = s.replace(new RegExp(`let\\s+(${ID})((?:\\s*\\[[^\\]]+\\])+)\\s*;`), (_, nm, dims) => `let ${nm} = ${newArray(dims.match(/\[([^\]]+)\]/g).map((d) => d.slice(1, -1).trim()), fill)};`);
    // int a[] = {...};  /  char s[] = "abc";
    s = s.replace(new RegExp(`let\\s+(${ID})(?:\\s*\\[[^\\]]*\\])+\\s*=`), 'let $1 =');
    // vector<int> v(n, x);  vector<vector<int>> g(n, vector<int>(m, -1));
    s = s.replace(new RegExp(`let\\s+(${ID})\\s*\\((.+)\\)\\s*;`), (_, nm, args) => {
      const a = splitTop(args, ',').map((x) => x.trim());
      return a.length === 2 ? `let ${nm} = Array.from({ length: ${a[0]} }, () => ${a[1]});` : `let ${nm} = new Array(${a[0]}).fill(${fill});`;
    });
    s = s.replace(new RegExp(`let\\s+(${ID})\\s*;`), (m0, nm) => (/^(?:vector|List|ArrayList|LinkedList|deque|Deque|ArrayDeque|stack|Stack|queue|Queue)/.test(declType) ? `let ${nm} = [];` : /^(?:map|unordered_map|HashMap|Map|TreeMap)/.test(declType) ? `let ${nm} = new Map();` : /^(?:set|unordered_set|HashSet|Set)/.test(declType) ? `let ${nm} = new Set();` : m0));
  }
  // vector<T>(n, x) as an expression (nested vector constructor)
  s = s.replace(new RegExp(`\\bvector\\s*<[^;=()]*>\\s*\\(([^()]*)\\)`, 'g'), (_, a) => { const p = splitTop(a, ',').map((x) => x.trim()); return `new Array(${p[0]}).fill(${p[1] || 0})`; });
  // brace initialisers: = {1, 2, {3}}  ->  = [1, 2, [3]]
  s = s.replace(/=\s*\{([^;]*)\}\s*;/, (_, inner) => `= [${inner.replace(/\{/g, '[').replace(/\}/g, ']')}];`);
  // range-for:  for (let x : v)  ->  for (let x of v)
  s = s.replace(new RegExp(`for\\s*\\(\\s*let\\s+(${ID})\\s*:`, 'g'), 'for (let $1 of');

  // Java allocations
  s = s.replace(/\bnew\s+(int|long|short|byte|double|float|boolean|char|String|Integer|Long)\s*((?:\[[^\]]+\])+)/g, (_, t, dims) => newArray(dims.match(/\[([^\]]+)\]/g).map((d) => d.slice(1, -1).trim()), DEFAULTS[t] || 'null'));
  s = s.replace(/\bnew\s+(?:int|long|short|byte|double|float|boolean|char|String|Integer|Long)\s*(?:\[\s*\])+\s*\{([^;]*)\}/g, (_, inner) => `[${inner.replace(/\{/g, '[').replace(/\}/g, ']')}]`);
  s = s.replace(/\bnew\s+(?:ArrayList|LinkedList|ArrayDeque|Stack)\s*<[^>]*>\s*\(\s*\)/g, '[]');
  s = s.replace(/\bnew\s+(?:HashMap|TreeMap)\s*<[^>]*>\s*\(\s*\)/g, 'new Map()');
  s = s.replace(/\bnew\s+(?:HashSet|TreeSet)\s*<[^>]*>\s*\(\s*\)/g, 'new Set()');

  // casts
  s = s.replace(/\(\s*(?:int|long(?:\s+long)?|short|size_t)\s*\)\s*(\(([^()]*)\)|[\w.]+(?:\[[^\]]*\])*)/g, (_, op) => `Math.trunc(${op})`);
  s = s.replace(/\(\s*(?:double|float|long\s+double|char|unsigned)\s*\)\s*/g, '');

  // output
  s = s.replace(/\bcout\s*<<(.*?);/g, (_, body) => {
    const parts = splitTop(body, '<<').map((x) => x.trim()).filter((x) => x && x !== 'endl');
    return `__cout(${parts.join(', ')});`;
  });
  s = s.replace(/\bcin\s*>>[^;]*;/g, '/* cin: input is not supported */');
  s = s.replace(/\bscanf\s*\([^;]*\)\s*;/g, '/* scanf: input is not supported */');
  s = s.replace(/\bSystem\.out\.println\s*\(\s*\)/g, "print('')");
  s = s.replace(/\bSystem\.out\.print(?:ln)?\s*\(/g, '__out(');
  s = s.replace(/\bSystem\.out\.printf\s*\(|\bSystem\.out\.format\s*\(|(?<![\w.])printf\s*\(/g, '__printf(');
  s = s.replace(/\bString\.format\s*\(/g, '__format(');
  s = s.replace(/(?<![\w.])puts\s*\(/g, '__out(');

  // library
  s = s.replace(/\b(?:nullptr|NULL)\b/g, 'null');
  s = s.replace(/\b(?:INT_MAX|Integer\.MAX_VALUE)\b/g, '2147483647').replace(/\b(?:INT_MIN|Integer\.MIN_VALUE)\b/g, '(-2147483648)');
  s = s.replace(/\b(?:LLONG_MAX|LONG_MAX|Long\.MAX_VALUE)\b/g, 'Number.MAX_SAFE_INTEGER').replace(/\b(?:LLONG_MIN|LONG_MIN|Long\.MIN_VALUE)\b/g, 'Number.MIN_SAFE_INTEGER');
  s = s.replace(/(?<![\w.])(max|min|abs|sqrt|pow|floor|ceil|log|log2|log10|exp|round)\s*\(/g, 'Math.$1(').replace(/(?<![\w.])fabs\s*\(/g, 'Math.abs(');
  s = mapCalls(s, 'swap', (a) => (a.length === 2 ? `[${a[0]}, ${a[1]}] = [${a[1]}, ${a[0]}]` : `swap(${a.join(', ')})`));
  s = mapCalls(s, 'memset', (a) => `__memset(${a[0]}, ${a[1]})`);
  s = mapCalls(s, 'strlen', (a) => `(${a[0]}).length`);
  s = mapCalls(s, 'to_string', (a) => `String(${a[0]})`);
  s = mapCalls(s, 'Arrays\\.toString', (a) => `__str(${a[0]})`);
  s = mapCalls(s, 'Arrays\\.fill', (a) => `${a[0]}.fill(${a[1]})`);
  s = s.replace(/\.(?:size|length)\s*\(\s*\)/g, '.length');
  s = s.replace(/\.(?:push_back|emplace_back|add|push)\s*\(/g, '.push(').replace(/\.pop_back\s*\(\s*\)/g, '.pop()');
  s = s.replace(/\.back\s*\(\s*\)/g, '.at(-1)').replace(/\.front\s*\(\s*\)/g, '[0]');
  s = s.replace(/([\w\]\)]+)\.(?:empty|isEmpty)\s*\(\s*\)/g, '($1.length === 0)');
  s = s.replace(/\.put\s*\(/g, '.set(').replace(/\.containsKey\s*\(/g, '.has(').replace(/\.count\s*\(/g, '.has(');
  s = s.replace(/([\w\]\)]+)\.getOrDefault\s*\(/g, '__getOr($1, ');
  s = s.replace(/([\w\]\)]+)\.equals\s*\(([^()]*)\)/g, '($1 === $2)');
  s = s.replace(/([\w\]\)]+)\.toCharArray\s*\(\s*\)/g, '[...$1]');
  s = s.replace(/\bMath\.floorDiv\s*\(/g, '__floordiv(');

  // integer division:  a / b  ->  Math.trunc(a / b)  unless an operand is floating point
  const isFloat = (t) => /\d\.\d*|\.\d|\d[eE]\d|\d[fF]\b/.test(t) || /Math\.(sqrt|pow|log|exp)/.test(t) || [...ctx.floatNames].some((n) => new RegExp(`\\b${n}\\b`).test(t));
  s = s.replace(new RegExp(`(${ID}(?:\\[[^\\]]*\\])*)\\s*\\/=\\s*([^;]+);`, 'g'), (m0, l, r) => (isFloat(l) || isFloat(r) ? m0 : `${l} = Math.trunc(${l} / (${r}));`));
  s = rewriteDivision(s, '/', (L, R) => `Math.trunc(${L} / ${R})`, (L, R) => isFloat(L) || isFloat(R));
  return s;
}

function transpileC(src, lang) {
  const raw = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const masks = raw.map((l) => mask(l, false));
  const lines = masks.map((m) => m.code);
  const ctx = preScanC(lines, lang);
  const out = lines.slice();
  const drop = new Array(lines.length).fill(false), keep = [];

  // Block comments: leave the lines untouched.
  const inBlock = new Array(lines.length).fill(false);
  let open = false;
  lines.forEach((l, i) => {
    if (open) inBlock[i] = true;
    const a = l.lastIndexOf('/*'), b = l.lastIndexOf('*/');
    if (a >= 0 && a > b) open = true; else if (b >= 0) open = false;
  });

  // Java: drop the class wrapper (header line + its closing brace) so methods become top-level functions.
  const joined = lines.map((l) => splitComment(l, '//')[0]).join('\n');
  const lineAt = (pos) => joined.slice(0, pos).split('\n').length - 1;
  const blankChar = (pos) => { const li = lineAt(pos), col = pos - (joined.lastIndexOf('\n', pos - 1) + 1); out[li] = out[li].slice(0, col) + ' ' + out[li].slice(col + 1); };
  const classRe = /^[ \t]*(?:(?:public|final|abstract)\s+)*class\s+\w+[^{\n]*\{/gm; let cm;
  while ((cm = classRe.exec(joined))) {
    const o = cm.index + cm[0].length - 1, c = matchClose(joined, o, '{', '}');
    out[lineAt(cm.index)] = '';
    if (c > 0) blankChar(c);
  }

  // main(): setup lines stay (as top-level code); the first call to a user function becomes the entry; the rest is dropped.
  let entry = null;
  const mainRe = lang === 'java' ? /\bstatic\s+void\s+main\s*\([^)]*\)\s*(?:throws\s+[\w.,\s]+)?\{/ : /^[ \t]*(?:int|void)\s+main\s*\([^)]*\)\s*\{/m;
  const mm = mainRe.exec(joined);
  if (mm) {
    const o = mm.index + mm[0].length - 1, c = matchClose(joined, o, '{', '}');
    const l0 = lineAt(mm.index), l1 = c > 0 ? lineAt(c) : lines.length - 1;
    const callRe = ctx.fnNames.length ? new RegExp(`(?<![\\w.])(${ctx.fnNames.join('|')})\\s*\\(`) : null;
    let entryLine = -1;
    for (let i = l0; i <= l1 && callRe; i++) {
      const code = i === l0 ? joined.split('\n')[i].slice(joined.split('\n')[i].indexOf('{') + 1) : splitComment(lines[i], '//')[0];
      const m = callRe.exec(code);
      if (m) {
        const op = m.index + m[0].length - 1, cl = matchClose(code, op, '(', ')');
        if (cl > 0) {
          entry = masks[i].restore(cStatement(code.slice(m.index, cl + 1), ctx).trim()); entryLine = i;
          // statements earlier on the same line (`int n = 5; cout << f(n);`) are setup and must still run
          let at = 0; const before = [];
          for (const st of splitTop(code, ';')) { if (at + st.length >= m.index) break; before.push(st); at += st.length + 1; }
          if (before.join('').trim()) keep[i] = before.map((x) => x.trim()).join('; ') + ';';
          break;
        }
      }
    }
    for (let i = l0; i <= l1; i++) {
      if (i === l0 || i === l1 || (entryLine >= 0 && i >= entryLine)) drop[i] = true;
      else if (/^\s*return\b/.test(lines[i])) drop[i] = true;      // `return 0;` must not end the program before the entry call
    }
  }

  // Brace depth at the start of each line: function headers only exist at file level (C/C++) or class level (Java).
  const depthAt = []; let d = 0;
  lines.forEach((l, i) => { depthAt[i] = d; for (const ch of splitComment(l, '//')[0]) { if (ch === '{') d++; else if (ch === '}') d--; } });
  const topDepth = lang === 'java' ? 1 : 0;

  const js = out.map((l, i) => {
    if (drop[i]) return keep[i] ? masks[i].restore(cStatement(keep[i], ctx)) : '';
    if (inBlock[i]) return masks[i].restore(raw[i]);
    if (/^\s*#/.test(l) || /^\s*using\s+namespace\b/.test(l) || /^\s*(?:typedef|using)\s+\w/.test(l) || /^\s*(?:package|import)\s/.test(l)) return '';
    const [code, comment] = splitComment(l, '//');
    return masks[i].restore(cStatement(code, { ...ctx, top: depthAt[i] <= topDepth }) + comment);
  });
  return { js: js.join('\n'), entry, fnNames: ctx.fnNames };
}

/* ------------------------------------------------------------------ Python */

const JS_RESERVED = /\b(new|function|var|let|class|this|default|switch|case|delete|typeof|void|with|yield|static|const|enum|export|extends|super|catch|finally|throw|try|instanceof|do|interface|package|private|protected|public|implements|arguments|eval|null|true|false|undefined|NaN|Infinity)\b(?!\s*:)/g;
const PY_KEEP = new Set(['null', 'true', 'false', 'Infinity']);
const pyIdent = (s) => s.replace(JS_RESERVED, (w) => (PY_KEEP.has(w) ? w : w + '_'));
const OPND = '[\\w.\\u0000\\u0001]+(?:\\[[^\\[\\]]*\\]|\\([^()]*\\))*';

function pyExpr(e) {
  let s = pyIdent(e);
  s = s.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
  s = s.replace(/\bmath\.inf\b/g, 'Infinity').replace(/\bmath\.(floor|ceil|sqrt|log|log2|log10|exp|pow|gcd)\b/g, (_, f) => (f === 'gcd' ? '__gcd' : 'Math.' + f));
  // simple list comprehension: [expr for x in it if cond]
  s = s.replace(/\[\s*(.+?)\s+for\s+(\w+)\s+in\s+(.+?)(?:\s+if\s+(.+?))?\s*\]/g, (_, ex, v, it, cond) => `__iter(${it})${cond ? `.filter((${v}) => ${cond})` : ''}.map((${v}) => ${ex})`);
  s = s.replace(/\bis\s+not\b/g, '!==').replace(/\bis\b/g, '===');
  s = s.replace(new RegExp(`(${OPND})\\s+not\\s+in\\s+(${OPND})`, 'g'), '!__in($1, $2)');
  s = s.replace(new RegExp(`(?<!\\bfor\\s+\\w+\\s+)(${OPND})\\s+in\\s+(${OPND})`, 'g'), '__in($1, $2)');
  s = s.replace(new RegExp(`\\bnot\\s+(${OPND})`, 'g'), '!__t($1)').replace(/\bnot\s+/g, '!');
  s = s.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');
  // chained comparison  a < b <= c  ->  (a < b && b <= c)
  s = s.replace(new RegExp(`(${OPND})\\s*(<=|>=|<|>)\\s*(${OPND})\\s*(<=|>=|<|>)\\s*(${OPND})`, 'g'), '($1 $2 $3 && $3 $4 $5)');
  // slices and negative indices
  s = s.replace(/(\w|\]|\))\[([^\[\]:]*):([^\[\]:]*)\]/g, (_, p, a, b) => `${p}.slice(${a.trim() || 0}${b.trim() ? ', ' + b.trim() : ''})`);
  s = s.replace(/(\w|\]|\))\[\s*-\s*(\d+)\s*\]/g, '$1.at(-$2)');
  s = s.replace(/\.append\s*\(/g, '.push(').replace(/\.pop\s*\(\s*0\s*\)/g, '.shift()');
  s = s.replace(/([\w\]\)]+)\.get\s*\(/g, '__get($1, ').replace(/([\w\]\)]+)\.(keys|values|items)\s*\(\s*\)/g, '__$2($1)');
  s = mapCalls(s, 'print', (a) => `print(${a.filter((x) => !/^(end|sep|flush|file)\s*=/.test(x)).join(', ')})`);
  s = rewriteDivision(s, '//', (L, R) => `__floordiv(${L}, ${R})`, () => false);
  return ternary(s);
}

/** `A if C else B` -> `(C ? A : B)`, applied inside every bracket group and at top level (nesting works). */
function ternary(s) {
  let out = '';
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (c === '(' || c === '[') {
      const close = matchClose(s, i, c, c === '(' ? ')' : ']');
      if (close < 0) { out += s.slice(i); break; }
      out += c + ternary(s.slice(i + 1, close)) + s[close]; i = close + 1;
    } else { out += c; i++; }
  }
  const at = (str, word, from) => { let d = 0; for (let i = from; i < str.length; i++) { if ('([{'.includes(str[i])) d++; else if (')]}'.includes(str[i])) d--; else if (d === 0 && str.startsWith(word, i)) return i; } return -1; };
  const a = at(out, ' if ', 0); if (a < 0) return out;
  const b = at(out, ' else ', a + 4); if (b < 0) return out;
  return `(${out.slice(a + 4, b).trim()} ? ${out.slice(0, a).trim()} : ${ternary(out.slice(b + 6).trim())})`;
}

function pyStmt(src, scope) {
  let m;
  const s = src.trim();
  if (s === 'pass') return ';';
  if (s === 'break' || s === 'continue') return s + ';';
  if ((m = /^(global|nonlocal)\s+(.+)$/.exec(s))) { m[2].split(',').forEach((x) => scope.globals.add(x.trim())); return ''; }
  if ((m = /^return\b\s*(.*)$/.exec(s))) {
    const v = m[1].trim();
    if (!v) return 'return;';
    const parts = splitTop(v, ',');
    return `return ${parts.length > 1 ? `[${parts.map((p) => pyExpr(p.trim())).join(', ')}]` : pyExpr(v)};`;
  }
  if ((m = /^(.+?)\s*\/\/=\s*(.+)$/.exec(s))) return `${pyExpr(m[1])} = __floordiv(${pyExpr(m[1])}, ${pyExpr(m[2])});`;
  // plain assignment (excludes ==, <=, >=, !=, augmented ops and keyword arguments inside calls)
  const asg = /^([^=]+?)\s*=(?!=)\s*(.+)$/.exec(s);
  if (asg && !/[<>!+\-*/%&|^@:]$/.test(asg[1].trim()) && !/[([]/.test(asg[1].replace(/\[[^\]]*\]/g, '').replace(/\.\w+/g, ''))) {
    const names = splitTop(asg[1], ',').map((x) => x.trim()).filter(Boolean);
    const rhs = splitTop(asg[2], ',');
    const simple = names.every((n) => /^\w+$/.test(n));
    const fresh = simple && names.some((n) => !scope.vars.has(n) && !scope.globals.has(n));
    names.forEach((n) => { if (/^\w+$/.test(n)) scope.vars.add(n); });
    const L = names.length > 1 ? `[${names.map(pyExpr).join(', ')}]` : pyExpr(names[0]);
    const R = rhs.length > 1 ? `[${rhs.map((x) => pyExpr(x.trim())).join(', ')}]` : pyExpr(asg[2]);
    return `${fresh ? 'var ' : ''}${L} = ${R};`;
  }
  return pyExpr(s) + ';';
}

function transpilePython(src) {
  const raw = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const masks = raw.map((l) => mask(l, true));
  const lines = masks.map((m) => m.code);
  const fnNames = [];
  lines.forEach((l) => { const m = /^\s*def\s+(\w+)\s*\(/.exec(l); if (m && !fnNames.includes(m[1])) fnNames.push(m[1]); });
  const indentOf = (l) => /^ */.exec(l)[0].length;
  const isBlank = (l) => !splitComment(l, '#')[0].trim();
  const isTriple = (i) => /^\s*("""|''')/.test(raw[i]);

  // Lines inside a def; everything else at top level is the "main" region.
  const inDef = new Array(lines.length).fill(false);
  let defIndent = -1;
  lines.forEach((l, i) => {
    if (isBlank(l)) { inDef[i] = defIndent >= 0; return; }
    const ind = indentOf(l);
    if (defIndent >= 0 && ind <= defIndent && !isTriple(i)) defIndent = -1;
    if (defIndent >= 0) inDef[i] = true;
    if (defIndent < 0 && /^\s*def\s/.test(l)) { defIndent = ind; inDef[i] = true; }
  });

  // Entry: the first top-level line that calls a user function. It and every later top-level line are dropped.
  let entry = null;
  const drop = new Array(lines.length).fill(false), keep = [];
  const callRe = fnNames.length ? new RegExp(`(?<![\\w.])(${fnNames.join('|')})\\s*\\(`) : null;
  for (let i = 0; i < lines.length && callRe; i++) {
    if (inDef[i] || isBlank(lines[i])) continue;
    const code = splitComment(lines[i], '#')[0], m = callRe.exec(code);
    if (m) {
      const op = m.index + m[0].length - 1, cl = matchClose(code, op, '(', ')');
      if (cl > 0) {
        entry = masks[i].restore(pyExpr(code.slice(m.index, cl + 1)));
        for (let k = i; k < lines.length; k++) if (!inDef[k]) drop[k] = true;
        break;
      }
    }
  }

  const out = raw.map(() => ''), notes = raw.map(() => '');   // code / trailing comment (closing braces go between them)
  const stack = [];                 // open blocks: { indent, close, fn }
  const scopes = [{ vars: new Set(), globals: new Set() }];
  let lastCode = -1, depth = 0, docstring = false;
  const closeTo = (ind) => {
    while (stack.length && ind <= stack[stack.length - 1].indent) {
      const b = stack.pop();
      if (b.close && lastCode >= 0) out[lastCode] += ' ' + b.close;
      if (b.fn) scopes.pop();
    }
  };
  const block = (head, rest, ind, scope, fn) => {
    if (rest) return `${head} ${pyStmt(rest, scope)} }`;
    stack.push({ indent: ind, close: '}', fn });
    return head;
  };

  lines.forEach((l, i) => {
    // docstrings / triple-quoted blocks become line comments (line count preserved)
    if (docstring || isTriple(i)) {
      if (!drop[i]) out[i] = raw[i].replace(/^(\s*)/, '$1// ');
      if ((raw[i].match(/"""|'''/g) || []).length % 2 === 1) docstring = !docstring;
      return;
    }
    if (drop[i]) return;
    const [code, cmt] = splitComment(l, '#');
    const comment = cmt ? '//' + cmt.slice(1) : '';
    const trimmed = code.trim();
    if (!trimmed) { out[i] = masks[i].restore(code + comment); return; }
    const ind = indentOf(code);
    if (depth === 0) closeTo(ind);
    const scope = scopes[scopes.length - 1];
    let s, m;

    if (depth > 0) s = pyExpr(trimmed);                          // continuation of a bracketed expression
    else if (/^@/.test(trimmed) || /^(?:import|from)\s/.test(trimmed) || /^sys\.setrecursionlimit/.test(trimmed)) s = '';
    else if ((m = /^def\s+(\w+)\s*\((.*)\)\s*(?:->\s*[^:]+)?:\s*(.*)$/.exec(trimmed))) {
      const params = splitTop(m[2], ',').map((p) => p.trim()).filter(Boolean).map((p) => p.replace(/^(\*{0,2}\w+)\s*:\s*[^=]+/, '$1').replace(/^\*+/, '...'));
      const fnScope = { vars: new Set(params.map((p) => p.split('=')[0].replace('...', '').trim())), globals: new Set() };
      scopes.push(fnScope);
      s = `function ${pyIdent(m[1])}(${params.map((p) => (p.includes('=') ? pyIdent(p.split('=')[0].trim()) + ' = ' + pyExpr(p.split('=').slice(1).join('=').trim()) : pyIdent(p))).join(', ')}) {`;
      if (m[3]) { s += ` ${pyStmt(m[3], fnScope)} }`; scopes.pop(); } else stack.push({ indent: ind, close: '}', fn: true });
    } else if (/^if\s+__name__\s*==/.test(trimmed)) { s = ''; stack.push({ indent: ind, close: '' }); }
    else if ((m = /^(if|elif|while)\s+(.+?)\s*:\s*(.*)$/.exec(trimmed))) s = block(`${m[1] === 'elif' ? 'else if' : m[1]} (__t(${pyExpr(m[2])})) {`, m[3], ind, scope);
    else if ((m = /^else\s*:\s*(.*)$/.exec(trimmed))) s = block('else {', m[1], ind, scope);
    else if ((m = /^for\s+(.+?)\s+in\s+(.+?)\s*:\s*(.*)$/.exec(trimmed))) {
      const v = pyIdent(m[1].trim()), it = m[2].trim();
      v.split(',').forEach((x) => scope.vars.add(x.trim()));
      const r = /^range\s*\((.*)\)$/.exec(it);
      let head;
      if (r && !v.includes(',')) {
        const a = splitTop(r[1], ',').map((x) => pyExpr(x.trim()));
        const [lo, hi, st] = a.length === 1 ? ['0', a[0], '1'] : [a[0], a[1], a[2] || '1'];
        head = `for (var ${v} = ${lo}; ${v} ${/^-/.test(st.trim()) ? '>' : '<'} ${hi}; ${v} += ${st}) {`;
      } else {
        const en = /^enumerate\s*\((.*)\)$/.exec(it);
        head = `for (var ${v.includes(',') ? `[${v}]` : v} of ${en ? `__enumerate(${pyExpr(en[1])})` : `__iter(${pyExpr(it)})`}) {`;
      }
      s = block(head, m[3], ind, scope);
    } else s = pyStmt(trimmed, scope);

    for (const ch of trimmed) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; }
    if (depth < 0) depth = 0;
    if (depth > 0 && s.endsWith(';')) s = s.slice(0, -1);
    out[i] = masks[i].restore(code.slice(0, ind) + s);
    notes[i] = comment ? ' ' + masks[i].restore(comment) : '';
    if (s) lastCode = i;
  });
  closeTo(-1);
  return { js: out.map((c, i) => c + notes[i]).join('\n'), entry, fnNames };
}

/* ------------------------------------------------------------------ entry point */

/** Translate learner code. Returns { js, entry } where `entry` is the call found in main() (or null). */
export function transpile(lang, src) {
  const code = String(src);
  if (lang === 'python') return transpilePython(code);
  if (lang === 'c' || lang === 'cpp' || lang === 'java') return transpileC(code, lang);
  return { js: code, entry: null, fnNames: [] };
}

/* ------------------------------------------------------------------ runtime helpers (worker only) */

/** Helper functions injected into the translated program. `print` is the tracer's output hook. */
export function makeRuntime(lang, print) {
  const pyStr = (x) => (x === true ? 'True' : x === false ? 'False' : x === null || x === undefined ? 'None' : Array.isArray(x) ? '[' + x.map((y) => (typeof y === 'string' ? `'${y}'` : pyStr(y))).join(', ') + ']' : String(x));
  const cStr = (x) => (Array.isArray(x) ? '[' + x.map(cStr).join(', ') + ']' : x === true ? (lang === 'java' ? 'true' : '1') : x === false ? (lang === 'java' ? 'false' : '0') : String(x));
  const format = (f, ...args) => {
    let k = 0;
    return String(f).replace(/%([-+ 0#]*)(\d*)(?:\.(\d+))?(?:hh|h|ll|l|L|z)?([diufFeEgGxXcsbn%])/g, (m0, flags, width, prec, conv) => {
      if (conv === '%') return '%';
      if (conv === 'n') return '\n';
      const a = args[k++];
      let s;
      if ('diu'.includes(conv)) s = String(Math.trunc(Number(a)));
      else if ('fF'.includes(conv)) s = Number(a).toFixed(prec === undefined ? 6 : +prec);
      else if ('eE'.includes(conv)) s = Number(a).toExponential(prec === undefined ? 6 : +prec);
      else if ('gG'.includes(conv)) s = String(+Number(a).toPrecision(prec === undefined ? 6 : +prec || 1));
      else if ('xX'.includes(conv)) s = (Math.trunc(Number(a)) >>> 0).toString(16);
      else if (conv === 'c') s = typeof a === 'number' ? String.fromCharCode(a) : String(a);
      else if (conv === 'b') s = String(!!a);
      else s = cStr(a);
      if (conv === 'X') s = s.toUpperCase();
      if (width && s.length < +width) s = flags.includes('-') ? s.padEnd(+width) : s.padStart(+width, flags.includes('0') && !'sc'.includes(conv) ? '0' : ' ');
      return s;
    });
  };
  const emit = (s) => { const t = String(s).replace(/\n+$/, ''); if (t.length) print(t); };
  const len = (x) => (x instanceof Map || x instanceof Set ? x.size : typeof x === 'object' && x !== null && !Array.isArray(x) ? Object.keys(x).length : x.length);
  const seq = (args) => (args.length === 1 && typeof args[0] === 'object' && args[0] !== null ? [...__iter(args[0])] : args);
  function __iter(x) { return typeof x === 'number' ? [] : x instanceof Map ? [...x.keys()] : typeof x === 'object' && x !== null && !Array.isArray(x) && !(x instanceof Set) ? Object.keys(x) : x; }
  const common = {
    __memset: (a, v) => { const f = (x) => { for (let i = 0; i < x.length; i++) if (Array.isArray(x[i])) f(x[i]); else x[i] = v; }; f(a); return a; },
    __getOr: (m, k, d) => (m instanceof Map ? (m.has(k) ? m.get(k) : d) : k in m ? m[k] : d),
    __floordiv: (a, b) => Math.floor(a / b),
    __str: cStr,
    __gcd: (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
  };
  if (lang === 'python') {
    return {
      ...common,
      print: (...xs) => emit(xs.map(pyStr).join(' ')),
      len, range: (a, b, c) => { const [lo, hi, st] = b === undefined ? [0, a, 1] : [a, b, c || 1]; const r = []; for (let i = lo; st > 0 ? i < hi : i > hi; i += st) r.push(i); return r; },
      min: (...a) => Math.min(...seq(a)), max: (...a) => Math.max(...seq(a)), sum: (x, s = 0) => [...__iter(x)].reduce((p, q) => p + q, s), abs: Math.abs,
      str: pyStr, int: (x) => (typeof x === 'string' ? parseInt(x, 10) : Math.trunc(x)), float: (x) => (/^-?inf/i.test(String(x)) ? (String(x)[0] === '-' ? -Infinity : Infinity) : Number(x)),
      bool: (x) => !!x && !(Array.isArray(x) && !x.length), list: (x = []) => [...__iter(x)], sorted: (x) => [...__iter(x)].sort((p, q) => (p < q ? -1 : p > q ? 1 : 0)), reversed: (x) => [...__iter(x)].reverse(),
      __t: (x) => (Array.isArray(x) || typeof x === 'string' ? x.length > 0 : x instanceof Map || x instanceof Set ? x.size > 0 : typeof x === 'object' && x !== null ? Object.keys(x).length > 0 : !!x),
      __in: (x, c) => (Array.isArray(c) || typeof c === 'string' ? c.includes(x) : c instanceof Map || c instanceof Set ? c.has(x) : x in c),
      __iter, __enumerate: (x) => [...__iter(x)].map((v, i) => [i, v]),
      __get: (c, k, d = null) => (c instanceof Map ? (c.has(k) ? c.get(k) : d) : k in c ? c[k] : d),
      __keys: (c) => (c instanceof Map ? [...c.keys()] : Object.keys(c)), __values: (c) => (c instanceof Map ? [...c.values()] : Object.values(c)),
      __items: (c) => (c instanceof Map ? [...c.entries()] : Object.entries(c)),
    };
  }
  return {
    ...common,
    __cout: (...xs) => emit(xs.map(cStr).join('')),
    __out: (x = '') => emit(cStr(x)),
    __printf: (f, ...a) => emit(format(f, ...a)),
    __format: format,
  };
}
