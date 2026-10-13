/* Tiny per-language tokenizer -> [text, className] pairs (rendered as React text, never HTML).
   Palette: keywords in the accent, calls in bright text, literals in the "done" grey, comments muted. */
const COMMON = ['return', 'if', 'else', 'for', 'while', 'break', 'continue', 'true', 'false', 'do', 'switch', 'case', 'default', 'new'];
const KW = {
  javascript: new Set([...COMMON, 'function', 'const', 'let', 'var', 'of', 'in', 'null', 'undefined', 'Math', 'Infinity', 'print']),
  cpp: new Set([...COMMON, 'int', 'long', 'short', 'double', 'float', 'bool', 'char', 'void', 'auto', 'const', 'unsigned', 'signed', 'static', 'string', 'vector', 'using', 'namespace', 'std', 'nullptr', 'struct', 'include', 'cout', 'endl', 'typedef', 'size_t']),
  c: new Set([...COMMON, 'int', 'long', 'short', 'double', 'float', 'char', 'void', 'const', 'unsigned', 'signed', 'static', 'struct', 'include', 'NULL', 'printf', 'sizeof', 'typedef', 'bool']),
  java: new Set([...COMMON, 'int', 'long', 'short', 'double', 'float', 'boolean', 'char', 'byte', 'void', 'public', 'private', 'protected', 'static', 'final', 'class', 'String', 'null', 'import', 'package', 'System', 'this']),
  python: new Set(['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'True', 'False', 'None', 'break', 'continue', 'pass', 'global', 'nonlocal', 'import', 'from', 'lambda', 'print', 'range', 'len']),
};
const CLS = {
  kw: 'text-accent-700 dark:text-accent',
  call: 'font-semibold text-slate-900 dark:text-fg',
  lit: 'text-slate-500 dark:text-fg-done',
  comment: 'italic text-slate-400 dark:text-fg-muted',
};

export function tokenize(line, lang = 'javascript') {
  const kw = KW[lang] || KW.javascript;
  const marker = lang === 'python' ? '#' : '//';
  // find the comment start outside string literals
  let ci = -1, q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '\\') i++; else if (ch === q) q = null; }
    else if (ch === '"' || ch === "'" || ch === '`') q = ch;
    else if (line.startsWith(marker, i)) { ci = i; break; }
  }
  if (lang !== 'python' && /^\s*#/.test(line)) return [[line, CLS.kw]];   // preprocessor directive
  const code = ci >= 0 ? line.slice(0, ci) : line, comment = ci >= 0 ? line.slice(ci) : '';
  const out = [];
  const re = /("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|`[^`]*`?)|([A-Za-z_$][\w$]*)(?=\s*\()|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\s+|./g;
  let m;
  while ((m = re.exec(code))) {
    const w = m[0];
    let cls = '';
    if (m[1]) cls = CLS.lit;
    else if (kw.has(w)) cls = CLS.kw;
    else if (/^\d/.test(w)) cls = CLS.lit;
    else if (m[2]) cls = CLS.call;
    out.push([w, cls]);
  }
  if (comment) out.push([comment, CLS.comment]);
  return out;
}
