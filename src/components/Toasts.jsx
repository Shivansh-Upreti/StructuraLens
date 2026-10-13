import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TONES = {
  error: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200',
  warn: 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
};

function Toast({ t, onClose }) {
  useEffect(() => { const id = setTimeout(() => onClose(t.id), 9000); return () => clearTimeout(id); }, [t.id, onClose]);
  return (
    <motion.div layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border p-3.5 ${TONES[t.tone] || TONES.warn}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-px flex-none font-mono text-[10px] font-bold tracking-wider">{t.tone === 'error' ? 'ERR' : 'WARN'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.title}</p>
          <p className="mt-0.5 break-words text-[13px] leading-snug opacity-90">{t.msg}</p>
        </div>
        <button type="button" className="rounded-md px-1.5 text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss notification" onClick={() => onClose(t.id)}>×</button>
      </div>
    </motion.div>
  );
}

export default function Toasts({ toasts, onClose }) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence initial={false}>{toasts.map((t) => <Toast key={t.id} t={t} onClose={onClose} />)}</AnimatePresence>
    </div>
  );
}
