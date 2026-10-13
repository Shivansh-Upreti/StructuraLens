/* Renders narration parts as React text nodes. No HTML strings, no dangerouslySetInnerHTML anywhere in this app. */
export default function Parts({ parts }) {
  return parts.map((p, i) => {
    if (p.t === 'c') return <code key={i} className="rounded-md bg-green-50 dark:bg-green-950/50 px-1.5 py-0.5 font-mono text-[0.88em] text-green-800 dark:text-green-300">{p.v}</code>;
    if (p.t === 'b') return <strong key={i} className="font-semibold text-slate-900 dark:text-fg">{p.v}</strong>;
    return <span key={i}>{p.v}</span>;
  });
}
