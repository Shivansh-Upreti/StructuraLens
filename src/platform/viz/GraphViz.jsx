import { AnimatePresence, motion } from 'framer-motion';

/* Graph traversal: nodes change colour as they are discovered / visited, with the queue or stack shown beside the graph. */
const NODE = {
  unseen: 'fill-white stroke-slate-400 dark:fill-zinc-900 dark:stroke-zinc-600',
  frontier: 'fill-amber-100 stroke-amber-500 dark:fill-amber-900/50 dark:stroke-amber-400',
  current: 'fill-green-600 stroke-green-800 dark:fill-green-500 dark:stroke-green-300',
  visited: 'fill-sky-100 stroke-sky-600 dark:fill-sky-900/50 dark:stroke-sky-400',
};
const TXT = { current: 'fill-white', unseen: 'fill-slate-700 dark:fill-zinc-200', frontier: 'fill-slate-900 dark:fill-amber-100', visited: 'fill-slate-900 dark:fill-sky-100' };
const same = (e, p) => p && ((e[0] === p[0] && e[1] === p[1]) || (e[0] === p[1] && e[1] === p[0]));

export default function GraphViz({ frame }) {
  const { graph, state, treeEdges, probe, struct, order, visited, dist } = frame;
  const at = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
      <svg viewBox="0 0 100 100" style={{ maxHeight: 'var(--viz-h, 460px)' }} className="mx-auto w-full rounded-md bg-slate-100/60 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800" role="img" aria-label="Graph">
        {graph.edges.map((e, i) => {
          const a = at[e[0]], b = at[e[1]], tree = treeEdges.some((t) => same(e, t)), pr = same(e, probe);
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={pr ? 2.2 : tree ? 2.4 : 1} strokeLinecap="round" className={`transition-all duration-300 ${pr ? 'stroke-amber-500' : tree ? 'stroke-green-600 dark:stroke-green-400' : 'stroke-slate-300 dark:stroke-zinc-700'}`} />
              {e[2] !== undefined && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 1.2} textAnchor="middle" className="fill-slate-700 text-[4px] font-bold dark:fill-zinc-200" paintOrder="stroke" strokeWidth="1.2" stroke="currentColor" style={{ stroke: 'var(--halo, transparent)' }}>{e[2]}</text>}
            </g>
          );
        })}
        {graph.nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={6.5} strokeWidth={state[n.id] === 'current' ? 1.8 : 1.2} className={`transition-colors duration-300 ${NODE[state[n.id]]}`} />
            <text x={n.x} y={n.y + 1.6} textAnchor="middle" className={`pointer-events-none text-[5px] font-bold ${TXT[state[n.id]]}`}>{n.id}</text>
            {dist && <text x={n.x} y={n.y + 12.5} textAnchor="middle" className="pointer-events-none fill-green-700 text-[4.4px] font-bold dark:fill-green-300">{dist[n.id] === Infinity ? '∞' : dist[n.id]}</text>}
          </g>
        ))}
      </svg>
      <div className="flex flex-col gap-3">
        <div>
          <p className="eyebrow mb-1.5">{struct.name}</p>
          <div className="flex min-h-[44px] flex-wrap gap-1.5 rounded-md bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
            <AnimatePresence initial={false}>
              {struct.items.map((id, i) => <motion.span layout key={id + '-' + i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="flex h-8 min-w-8 items-center justify-center rounded-md bg-amber-100 px-1.5 text-sm font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 font-mono">{id}</motion.span>)}
            </AnimatePresence>
            {!struct.items.length && <span className="self-center px-1 text-xs text-slate-400 dark:text-zinc-500">empty</span>}
          </div>
        </div>
        {visited && (
          <div>
            <p className="eyebrow mb-1.5">Visited set (cycle guard)</p>
            <div className="flex min-h-[40px] flex-wrap gap-1.5 rounded-md bg-slate-100/60 p-2 ring-1 ring-slate-200 dark:bg-zinc-950 dark:ring-zinc-800">
              <AnimatePresence initial={false}>
                {visited.map((id) => <motion.span layout key={id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-xs font-bold text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">{id}</motion.span>)}
              </AnimatePresence>
              {!visited.length && <span className="self-center px-1 text-xs text-slate-400 dark:text-zinc-500">empty</span>}
            </div>
          </div>
        )}
        <div>
          <p className="eyebrow mb-1.5">Visit order</p>
          <p className="min-h-[24px] font-mono text-sm text-slate-800 dark:text-zinc-100">{order.length ? order.join(' → ') : '—'}</p>
        </div>
        <div className="space-y-1 text-xs text-slate-500 dark:text-zinc-400">
          {[['bg-white border border-slate-400', 'unseen'], ['bg-amber-300', 'discovered (in structure)'], ['bg-green-600', 'being visited'], ['bg-sky-300', 'finished']].map(([c, t]) => <p key={t}><i className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${c}`} />{t}</p>)}
        </div>
      </div>
    </div>
  );
}
