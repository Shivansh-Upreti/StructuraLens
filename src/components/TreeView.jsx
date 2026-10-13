import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fmt, label } from '../engine/engine.js';

/* Node colour = where the call is in its life:
   neutral -> waiting: paused until its children return
   cyan    -> executing right now (the only accent node)
   #27272A border + #A1A1AA text -> completed (dashed when answered from the cache)
   red     -> the call that hit the depth limit */
const NODE = {
  active: { rect: 'fill-accent-50 stroke-accent-600 dark:fill-accent-950 dark:stroke-accent', val: 'fill-accent-700 dark:fill-accent', lab: 'fill-slate-900 dark:fill-fg', sw: 2 },
  waiting: { rect: 'fill-white stroke-slate-400 dark:fill-panel-2 dark:stroke-zinc-600', val: 'fill-slate-500 dark:fill-fg-muted', lab: 'fill-slate-700 dark:fill-fg', sw: 1 },
  done: { rect: 'fill-white stroke-slate-300 dark:fill-panel dark:stroke-line', val: 'fill-slate-500 dark:fill-fg-done', lab: 'fill-slate-500 dark:fill-fg-done', sw: 1 },
  cached: { rect: 'fill-white stroke-slate-300 dark:fill-panel dark:stroke-zinc-600', val: 'fill-slate-500 dark:fill-fg-done', lab: 'fill-slate-500 dark:fill-fg-done', sw: 1 },
  error: { rect: 'fill-red-50 stroke-red-500 dark:fill-red-950 dark:stroke-red-500', val: 'fill-red-600 dark:fill-red-500', lab: 'fill-slate-900 dark:fill-fg', sw: 2 },
};

export default function TreeView({ trace, state }) {
  const host = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const follow = useRef(true);
  const drag = useRef(null);
  const wheelT = useRef(null);

  const geo = useMemo(() => {
    const nodes = trace.nodes;
    const maxLen = nodes.reduce((m, n) => Math.max(m, label(n).length), 4);
    const w = Math.max(64, maxLen * 7.4 + 18), h = 42, gx = 14, gy = 46;
    const px = (n) => n.gx * (w + gx) + w / 2, py = (n) => n.depth * (h + gy) + h / 2;
    const leafs = nodes.length ? Math.max(...nodes.map((n) => n.gx)) + 1 : 1;
    const depth = nodes.length ? Math.max(...nodes.map((n) => n.depth)) + 1 : 1;
    const edges = nodes.filter((n) => n.parent !== null).map((n) => {
      const p = nodes[n.parent], x1 = px(p), y1 = py(p) + h / 2, x2 = px(n), y2 = py(n) - h / 2, my = (y1 + y2) / 2;
      return { id: n.id, d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}` };
    });
    return { w, h, px, py, edges, bw: leafs * (w + gx), bh: depth * (h + gy) };
  }, [trace]);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(host.current); return () => ro.disconnect();
  }, []);

  const fitK = Math.min(1.1, (size.w - 24) / geo.bw, (size.h - 24) / geo.bh);
  const fit = () => {
    follow.current = true;
    const k = Math.max(0.5, fitK);
    setView({ k, x: (size.w - geo.bw * k) / 2, y: 12 });
  };
  useEffect(() => { fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [geo, size.w, size.h]);

  const last = state.last;
  useEffect(() => {
    if (!follow.current || !last || fitK >= 0.5) return;
    const n0 = trace.nodes[last.id];
    const n = last.k === 'ret' && n0.parent !== null ? trace.nodes[n0.parent] : n0;
    setView((v) => ({ ...v, x: size.w / 2 - geo.px(n) * v.k, y: size.h / 2 - geo.py(n) * v.k }));
  }, [last, geo, trace, size, fitK]);

  useEffect(() => {
    const el = host.current;
    const onWheel = (e) => {
      e.preventDefault(); follow.current = false;
      const r = el.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      setDragging(true); clearTimeout(wheelT.current); wheelT.current = setTimeout(() => setDragging(false), 160);
      setView((v) => { const nk = Math.min(2.5, Math.max(0.1, v.k * Math.exp(-e.deltaY * 0.0015))); return { k: nk, x: mx - (mx - v.x) * (nk / v.k), y: my - (my - v.y) * (nk / v.k) }; });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onDown = (e) => { drag.current = { x: e.clientX - view.x, y: e.clientY - view.y }; follow.current = false; setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => { if (drag.current) setView((v) => ({ ...v, x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })); };
  const onUp = () => { drag.current = null; setDragging(false); };

  const onStack = new Set(state.stack);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
        <span>drag to pan · wheel to zoom</span>
        <button type="button" className="btn !px-2.5 !py-1 text-xs" onClick={fit}>Fit &amp; follow</button>
      </div>
      <div ref={host} className="relative min-h-[300px] flex-1 cursor-grab touch-none overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-200 dark:bg-canvas dark:ring-line active:cursor-grabbing"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <svg className="h-full w-full" role="img" aria-label="Recursion tree">
          <motion.g style={{ originX: 0, originY: 0 }} animate={{ x: view.x, y: view.y, scale: view.k }} transition={dragging ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}>
            {geo.edges.map((e) => {
              const s = state.st[e.id], shown = s.status !== 'pending';
              const bubble = last && last.k === 'ret' && last.id === e.id;
              const top = state.stack[state.stack.length - 1] === e.id;
              const cls = bubble || top ? 'stroke-accent-600 dark:stroke-accent' : onStack.has(e.id) ? 'stroke-slate-400 dark:stroke-zinc-500' : 'stroke-slate-300 dark:stroke-line';
              return <motion.path key={e.id} d={e.d} fill="none" className={cls} initial={false} animate={{ pathLength: shown ? 1 : 0, opacity: shown ? 1 : 0, strokeWidth: bubble ? 2.5 : 1.5 }} transition={{ duration: 0.35 }} />;
            })}
            {trace.nodes.map((n) => {
              const s = state.st[n.id], pending = s.status === 'pending';
              const key = s.status === 'done' ? (n.cached ? 'cached' : 'done') : s.status === 'waiting' ? 'waiting' : state.overflow && n.id === trace.nodes.length - 1 ? 'error' : 'active';
              const S = NODE[key];
              const val = s.status === 'done' ? '→ ' + fmt(s.ret, 12) : s.status === 'waiting' ? 'waiting' : s.status === 'active' ? 'running' : '';
              return (
                <g key={n.id} transform={`translate(${geo.px(n) - geo.w / 2},${geo.py(n) - geo.h / 2})`} style={{ pointerEvents: pending ? 'none' : 'auto' }}>
                  <motion.g initial={false} animate={{ opacity: pending ? 0 : 1 }} transition={{ duration: 0.18, ease: 'easeOut' }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                    <title>{label(n)}</title>
                    <rect width={geo.w} height={geo.h} rx={2} strokeWidth={S.sw} strokeDasharray={key === 'cached' ? '4 3' : undefined} className={`${S.rect} transition-colors`} />
                    <text x={geo.w / 2} y={17} textAnchor="middle" className={`${S.lab} font-mono text-[12px] font-semibold`}>{label(n)}</text>
                    <text x={geo.w / 2} y={33} textAnchor="middle" className={`${S.val} font-mono text-[11px] font-bold`}>{val}</text>
                  </motion.g>
                </g>
              );
            })}
            {last && last.k === 'ret' && trace.nodes[last.id].parent !== null && (() => {
              const n = trace.nodes[last.id], p = trace.nodes[n.parent];
              return (
                <motion.g key={'fly' + state.lastIdx} pointerEvents="none" initial={{ x: geo.px(n), y: geo.py(n), opacity: 1 }}
                  animate={{ x: geo.px(p), y: geo.py(p) + geo.h / 2 - 2, opacity: [1, 1, 0] }}
                  transition={{ duration: 1, ease: 'easeInOut', opacity: { duration: 1, times: [0, 0.75, 1] } }}>
                  <rect x={-24} y={-11} width={48} height={22} rx={2} className="fill-accent-600 stroke-accent-700 dark:fill-accent dark:stroke-accent" strokeWidth={1} />
                  <text textAnchor="middle" y={4.5} className="fill-white font-mono text-[12px] font-bold dark:fill-canvas">{fmt(last.value, 7)}</text>
                </motion.g>
              );
            })()}
          </motion.g>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-zinc-400">
        {[['border-accent-600 bg-accent-600 dark:border-accent dark:bg-accent', 'executing'], ['border-slate-400 dark:border-zinc-600', 'waiting for children'], ['border-slate-300 dark:border-line dark:bg-panel', 'returned'], ['border-dashed border-slate-400 dark:border-zinc-600', 'answered from cache'], ['border-red-500', 'depth limit hit']].map(([c, t]) => <span key={t} className="font-mono"><i className={`mr-1.5 inline-block h-2.5 w-2.5 border ${c}`} />{t}</span>)}
      </div>
    </div>
  );
}
