import { AnimatePresence, motion } from 'framer-motion';
import { fmt, label } from '../engine/engine.js';

const STATUS = {
  active: { cls: 'border-green-600 bg-green-50 dark:bg-green-950/50 ring-1 ring-green-200 dark:ring-green-800', tag: '▶ running', tagCls: 'text-green-700 dark:text-green-400' },
  waiting: { cls: 'border-amber-400 bg-white dark:bg-zinc-900', tag: '⏸ paused', tagCls: 'text-amber-700 dark:text-amber-300' },
  done: { cls: 'border-sky-500 bg-sky-50 dark:bg-sky-950/40', tag: '↩ returning', tagCls: 'text-sky-700 dark:text-sky-300' },
  cached: { cls: 'border-violet-500 bg-violet-50 dark:bg-violet-950/40', tag: '⚡ cache hit', tagCls: 'text-violet-700 dark:text-violet-300' },
};

function Frame({ node, s, status, trace, compact }) {
  const st = status === 'done' && s.cachedHit ? 'cached' : status;
  const S = STATUS[st];
  const child = s.waitChild !== null ? trace.nodes[s.waitChild] : null;
  const got = s.lastChild ? trace.nodes[s.lastChild.id] : null;
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: -28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -28, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }} className={`flex-none rounded-md border-l-[5px] border-y border-r border-y-slate-100 dark:border-y-zinc-800 border-r-slate-100 dark:border-r-zinc-800 px-3 ${compact ? 'py-1.5' : 'py-2.5'} ${S.cls}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="break-all font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{node.name}({Object.keys(node.args).map((k) => `${k}=${fmt(node.args[k], 14)}`).join(', ')})</span>
        <span className={`whitespace-nowrap text-[11px] font-semibold ${S.tagCls}`}>{S.tag}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
        {status === 'waiting' && <>Paused at <b className="text-slate-800 dark:text-zinc-100">line {s.waitLine || '?'}</b>, waiting for <code className="font-mono text-slate-800 dark:text-zinc-100">{child ? label(child) : '…'}</code>{child && child.site && <div className="mt-0.5">pending: <code className="rounded bg-amber-100 dark:bg-amber-900/40 px-1 font-mono text-amber-900 dark:text-amber-200">{child.site}</code></div>}</>}
        {status === 'active' && <>Executing <b className="text-slate-800 dark:text-zinc-100">line {s.curLine}</b>{got && <div className="mt-0.5 text-green-700 dark:text-green-400">got <b>{fmt(s.lastChild.value)}</b> from <code className="font-mono">{label(got)}</code>{got.site && got.site !== '▢' && <> → <code className="rounded bg-green-100 dark:bg-green-900/40 px-1 font-mono">{got.site.replace('▢', fmt(s.lastChild.value))}</code></>}</div>}</>}
        {status === 'done' && <>Returned <b className="text-base text-sky-700 dark:text-sky-300">{fmt(s.ret, 40)}</b></>}
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
        <span>depth <b className="text-slate-900 dark:text-white">{stack.length}</b> / {trace.maxDepth} limit</span>
      </div>
      {gk.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{gk.map((k) => <span key={k} className="rounded-md bg-violet-50 dark:bg-violet-950/40 px-2 py-px font-mono text-[11px] text-violet-800 dark:text-violet-300 ring-1 ring-inset ring-violet-200 dark:ring-violet-800"><i className="mr-1 not-italic text-violet-400 dark:text-violet-500">{k}</i>{fmt(g[k], 60)}</span>)}</div>}
      <div className="flex min-h-[260px] flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-md bg-slate-50 dark:bg-zinc-950 p-2 ring-1 ring-slate-100 dark:ring-zinc-800" aria-label="Call stack frames">
        <div className="flex-1" />
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {ids.map((id) => {
              const s = st[id];
              const status = s.status === 'done' ? 'done' : id === topId ? 'active' : 'waiting';
              return <Frame key={id} node={trace.nodes[id]} s={s} status={status} trace={trace} compact={compact && status === 'waiting'} />;
            })}
          </AnimatePresence>
        </div>
        {ids.length === 0 && <p className="py-4 text-center text-sm text-slate-400 dark:text-zinc-500">The call stack is empty</p>}
        <div className="mt-2 border-t-2 border-dashed border-slate-200 dark:border-zinc-700 pt-1.5 text-center text-[11px] tracking-wide text-slate-400 dark:text-zinc-500">caller (program)</div>
      </div>
    </div>
  );
}
