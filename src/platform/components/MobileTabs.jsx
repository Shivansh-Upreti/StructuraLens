import { motion } from 'framer-motion';

/* Mobile-only (< 1024px) sticky switch between the code side and the visualization side of a workspace.
   Hidden from 1024px up, where the side-by-side layout is used. */
export default function MobileTabs({ value, onChange, items, layout = 'mobtab' }) {
  return (
    <div className="sticky top-[57px] z-20 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
      <div role="tablist" aria-label="Workspace view" className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 dark:bg-zinc-800">
        {items.map(([id, text]) => (
          <button key={id} role="tab" type="button" aria-selected={value === id} onClick={() => onChange(id)}
            className={`relative rounded-md px-3 py-2 text-sm font-semibold transition-colors ${value === id ? 'text-green-700 dark:text-green-300' : 'text-slate-500 dark:text-zinc-400'}`}>
            {value === id && <motion.span layoutId={layout} className="absolute inset-0 rounded-md bg-white dark:bg-zinc-950" transition={{ duration: 0.18, ease: 'easeOut' }} />}
            <span className="relative">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
