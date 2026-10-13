import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fmt, label } from '../engine/engine.js';

const STATUS = {
  // Executing right now: the only accent-coloured frame on the stack.
  active: { cls: 'border-l-accent-600 bg-accent-50 dark:border-l-accent dark:bg-accent/10', tag: 'executing', tagCls: 'text-accent-700 dark:text-accent', name: 'text-slate-900 dark:text-fg' },
  waiting: { cls: 'border-l-slate-400 bg-white dark:border-l-zinc-600 dark:bg-panel-2', tag: 'paused', tagCls: 'text-slate-500 dark:text-fg-muted', name: 'text-slate-700 dark:text-fg' },
  // Completed: #27272A border, #A1A1AA text.
  done: { cls: 'border-l-slate-300 bg-white dark:border-l-line dark:bg-panel', tag: 'returned', tagCls: 'text-slate-500 dark:text-fg-done', name: 'text-slate-500 dark:text-fg-done' },
  cached: { cls: 'border-l-slate-300 bg-white dark:border-l-line dark:bg-panel border-dashed', tag: 'cache hit', tagCls: 'text-slate-500 dark:text-fg-done', name: 'text-slate-500 dark:text-fg-done' },
};

function Frame({ node, s, status, trace, compact, flowKey, fresh }) {
  const st = status === 'done' && s.cachedHit ? 'cached' : status;
  const S = STATUS[st];
  const child = s.waitChild !== null ? trace.nodes[s.waitChild] : null;
  const got = s.lastChild ? trace.nodes[s.lastChild.id] : null;
  const ref = useRef(null);
  const [dist, setDist] = useState(64);
  useEffect(() => { if (ref.current) setDist(ref.current.offsetHeight + 8); });
  return (
    <motion.div ref={ref} layout="position" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.18, ease: 'easeOut' }} className={`relative flex-none rounded-md border-l-[5px] border-y border-r border-y-slate-100 dark:border-y-zinc-800 border-r-slate-100 dark:border-r-zinc-800 px-3 ${compact ? 'py-1.5' : 'py-2.5'} ${S.cls}`}>
      {status === 'done' && flowKey !== null && (
        <motion.div key={flowKey} aria-hidden="true" className="pointer-events-none absolute right-2 top-1.5 z-10 rounded-md border border-accent-700 bg-accent-600 px-2 py-0.5 font-mono text-xs font-bold text-white dark:border-accent dark:bg-accent dark:text-canvas"
          initial={{ y: 0, opacity: 1 }} animate={{ y: [0, dist, dist], opacity: [1, 1, 0] }} transition={{ duration: 1, ease: 'easeInOut', times: [0, 0.7, 1] }}>
          ret {fmt(s.ret, 14)}
        </motion.div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`break-all font-mono text-[13px] font-semibold ${S.name}`}>{node.name}({Object.keys(node.args).map((k) => `${k}=${fmt(node.args[k], 14)}`).join(', ')})</span>
        <span className={`whitespace-nowrap text-[11px] font-semibold ${S.tagCls}`}>{S.tag}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
        {status === 'waiting' && <>Paused at <b className="text-slate-800 dark:text-fg">line {s.waitLine || '?'}</b>, waiting for <code className="font-mono text-slate-800 dark:text-fg">{child ? label(child) : '…'}</code>{child && child.site && <div className="mt-0.5">pending: <code className="rounded-sm bg-slate-100 px-1 font-mono text-slate-800 dark:bg-panel-2 dark:text-fg">{child.site}</code></div>}</>}
        {status === 'active' && <>Executing <b className="text-slate-800 dark:text-fg">line {s.curLine}</b>{got && (fresh
          ? <motion.div key={'got' + s.lastChild.id + flowKey} initial={{ backgroundColor: 'rgba(34,211,238,0.35)' }} animate={{ backgroundColor: 'rgba(34,211,238,0)' }} transition={{ duration: 1.4 }} className="mt-0.5 rounded-md px-1 py-0.5 text-accent-700 dark:text-accent">received <b className="font-mono text-sm">{fmt(s.lastChild.value)}</b> from <code className="font-mono">{label(got)}</code>{got.site && got.site !== '▢' && <> → <code className="rounded-sm bg-slate-100 px-1 font-mono dark:bg-panel-2">{got.site.replace('▢', fmt(s.lastChild.value))}</code></>}</motion.div>
          : <div className="mt-0.5 text-slate-600 dark:text-fg-done">got <b>{fmt(s.lastChild.value)}</b> from <code className="font-mono">{label(got)}</code>{got.site && got.site !== '▢' && <> → <code className="rounded-sm bg-slate-100 px-1 font-mono dark:bg-panel-2">{got.site.replace('▢', fmt(s.lastChild.value))}</code></>}</div>)}</>}
        {status === 'done' && <>Returned <b className="font-mono text-base text-slate-700 dark:text-fg-done">{fmt(s.ret, 40)}</b></>}
      </div>
      {!compact && Object.keys(s.vars).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {Object.keys(s.vars).map((k) => <span key={k} className="rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-px font-mono text-[11px] text-slate-700 dark:text-zinc-200 ring-1 ring-inset ring-slate-200 dark:ring-zinc-700"><i className="mr-1 not-italic text-slate-400 dark:text-zinc-500">{k}</i>{fmt(s.vars[k], 22)}</span>)}
        </div>
      )}
    </motion.div>
  );
}

export default function StackView({ trace, state }) {
  const { stack, st, last } = state;
  const topId = stack[stack.length - 1];
  // A frame that just returned stays visible one step (as "returning") before it animates away.
  const ghost = last && last.k === 'ret' ? last.id : null;
  const ids = [...(ghost !== null ? [ghost] : []), ...[...stack].reverse()];
  const compact = stack.length > 7;
  const g = state.globals, gk = Object.keys(g);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
        <span>top = running</span>
        <span>depth <b className="text-slate-900 dark:text-fg">{stack.length}</b> / {trace.maxDepth} limit</span>
      </div>
      {gk.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{gk.map((k) => <span key={k} className="rounded-sm bg-slate-50 px-2 py-px font-mono text-[11px] text-slate-800 ring-1 ring-inset ring-slate-200 dark:bg-canvas dark:text-fg dark:ring-line"><i className="mr-1 not-italic text-slate-400 dark:text-fg-muted">{k}</i>{fmt(g[k], 60)}</span>)}</div>}
      <div className="flex min-h-[260px] flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-md bg-slate-50 p-2 ring-1 ring-slate-200 dark:bg-canvas dark:ring-line" aria-label="Call stack frames">
        <div className="flex-1" />
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {ids.map((id) => {
              const s = st[id];
              const status = s.status === 'done' ? 'done' : id === topId ? 'active' : 'waiting';
              const fresh = !!(last && last.k === 'ret' && s.lastChild && s.lastChild.id === last.id);
              return <Frame key={id} node={trace.nodes[id]} s={s} status={status} trace={trace} compact={compact && status === 'waiting'} fresh={fresh} flowKey={last && last.k === 'ret' && last.id === id ? 'ret' + state.lastIdx : null} />;
            })}
          </AnimatePresence>
        </div>
        {ids.length === 0 && <p className="py-4 text-center text-sm text-slate-400 dark:text-zinc-500">The call stack is empty</p>}
        <div className="mt-2 border-t-2 border-dashed border-slate-200 dark:border-zinc-700 pt-1.5 text-center text-[11px] tracking-wide text-slate-400 dark:text-zinc-500">caller (program)</div>
      </div>
    </div>
  );
}
