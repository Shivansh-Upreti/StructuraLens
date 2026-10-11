import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../theme.js';
import { TIERS, topicById } from '../topics.js';
import { href } from '../router.js';
import Logo from './Logo.jsx';

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', width: 16, height: 16, 'aria-hidden': true };
const Sun = () => <svg viewBox="0 0 24 24" {...ICON}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
const Moon = () => <svg viewBox="0 0 24 24" {...ICON}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
const Monitor = () => <svg viewBox="0 0 24 24" {...ICON}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>;
const OPTIONS = [['light', 'Light', Sun], ['system', 'System', Monitor], ['dark', 'Dark', Moon]];

function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <div className="relative inline-flex rounded-md bg-slate-100 p-0.5 ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-zinc-700" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map(([id, text, Icon]) => {
        const on = mode === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} aria-label={`${text} theme`} title={`${text} theme`} onClick={() => setMode(id)}
            className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors lg:h-8 lg:w-8 ${on ? 'text-green-700 dark:text-green-400' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100'}`}>
            {on && <motion.span layoutId="theme-pill" className="absolute inset-0 rounded-md bg-white dark:bg-zinc-950" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative"><Icon /></span>
          </button>
        );
      })}
    </div>
  );
}

function TopicsMenu({ route }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [route]);
  const current = topicById(route);
  return (
    <div className="relative" ref={box}>
      <button type="button" className="btn !rounded-md !py-1.5" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {current ? current.title : 'Topics'}
        <svg viewBox="0 0 24 24" {...ICON} width="14" height="14" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
            className="absolute right-0 z-50 mt-2 grid w-[min(94vw,760px)] gap-5 rounded-lg bg-white p-4 ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-700 sm:grid-cols-3">
            {TIERS.map((b) => (
              <div key={b.id}>
                <p className="eyebrow mb-2 flex items-center gap-1.5">{b.kicker} · {b.title.split(' ').slice(0, 3).join(' ')}{b.advanced && <span className="rounded-md bg-amber-100 px-1.5 py-px text-[9px] font-bold tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">ADVANCED</span>}</p>
                <ul className="space-y-0.5">
                  {b.topics.map((t) => (
                    <li key={t.id}><a href={href(t.id)} className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/50 dark:hover:text-green-400 ${route === t.id ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'text-slate-700 dark:text-zinc-200'}`}>{t.title}{t.status === 'preview' && <span className="rounded-md bg-slate-100 px-1.5 py-px text-[9px] font-semibold uppercase text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 font-mono">preview</span>}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Below 1024px the Topics popover collapses into this hamburger panel (all tiers, one tap to any topic). */
function MobileMenu({ route }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [route]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-slate-700 ring-1 ring-slate-200 dark:text-zinc-200 dark:ring-zinc-700" aria-label={open ? 'Close menu' : 'Open topics menu'} aria-expanded={open} aria-controls="mobile-topics" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" {...ICON} width="20" height="20">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.button type="button" aria-label="Close menu" className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.nav id="mobile-topics" aria-label="Topics" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
              className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 pb-6 pt-3 dark:border-zinc-800 dark:bg-zinc-950">
              <a href={href('')} className="mb-2 block rounded-md px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-green-50 dark:text-zinc-200 dark:hover:bg-green-950/50">Home · all topics</a>
              {TIERS.map((b) => (
                <div key={b.id} className="mt-3">
                  <p className="eyebrow mb-1 flex items-center gap-1.5 px-2.5">{b.kicker} · {b.title}{b.advanced && <span className="rounded-md bg-amber-100 px-1.5 py-px text-[9px] font-bold tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">ADVANCED</span>}</p>
                  <ul>
                    {b.topics.map((t) => (
                      <li key={t.id}><a href={href(t.id)} className={`flex items-center justify-between rounded-md px-2.5 py-2.5 text-[15px] font-medium ${route === t.id ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300' : 'text-slate-700 dark:text-zinc-200'}`}>{t.title}{t.status === 'preview' && <span className="rounded-md bg-slate-100 px-1.5 py-px text-[9px] font-semibold uppercase text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 font-mono">preview</span>}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar({ route }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 lg:gap-3 lg:px-5">
        <a href={href('')} className="flex min-w-0 items-center gap-2 lg:gap-2.5" aria-label="StructuraLens home">
          <Logo size={34} className="h-[30px] w-[30px] flex-none lg:h-[34px] lg:w-[34px]" />
          <span className=" text-lg font-semibold tracking-tight text-slate-900 dark:text-white lg:text-xl">Structura<span>Lens</span></span>
        </a>
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <div className="hidden lg:block"><TopicsMenu route={route} /></div>
          <ThemeToggle />
          <MobileMenu route={route} />
        </div>
      </div>
    </header>
  );
}
