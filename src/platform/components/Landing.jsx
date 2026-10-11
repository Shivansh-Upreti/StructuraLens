import { motion } from 'framer-motion';
import { TIERS } from '../topics.js';
import { href } from '../router.js';

const reveal = { hidden: { opacity: 0, y: 16, filter: 'blur(6px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
const stagger = (s = 0.07, d = 0) => ({ hidden: {}, show: { transition: { staggerChildren: s, delayChildren: d } } });
const card = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } };

function Words({ text, className, wordClass = '' }) {
  return (
    <motion.span variants={stagger(0.06, 0.25)} initial="hidden" animate="show" className={className} aria-label={text}>
      {text.split(' ').map((w, i) => <motion.span key={i} variants={reveal} className={`mr-[0.28em] inline-block ${wordClass}`} aria-hidden="true">{w}</motion.span>)}
    </motion.span>
  );
}

const STEPS = [
  ['Watch', 'Code and animation move in lock-step, line by line, so you always see which instruction caused which change.'],
  ['Explain', 'Switch between Beginner and Advanced explanations at any time: real-world analogies, or complexity and proofs.'],
  ['Compare', 'Switch algorithms on the same input to see why one wins: swaps, comparisons and memory, side by side.'],
];

function TopicCard({ t, advanced }) {
  const live = t.status === 'live';
  return (
    <motion.a variants={card} whileHover={{ y: -2 }} href={href(t.id)}
      className="group relative flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-md px-2 py-px text-[10px] font-bold uppercase tracking-wider ${live ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>{live ? 'Interactive' : 'Preview'}</span>
        {advanced && <span className="rounded-md bg-amber-100 px-2 py-px text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">Advanced</span>}
      </div>
      <h3 className=" text-xl font-semibold text-slate-900 dark:text-white">{t.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-slate-600 dark:text-zinc-400">{t.hard}</p>
      <p className="mt-3 text-xs font-medium text-green-700 dark:text-green-400">{t.tag}</p>
      <span aria-hidden="true" className="absolute right-4 top-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-green-600 dark:text-zinc-600 dark:group-hover:text-green-400">→</span>
    </motion.a>
  );
}

export default function Landing() {
  return (
    <div>
      <section className="relative mx-auto max-w-[1200px] px-6 pb-12 pt-10 sm:px-5 sm:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-60 [mask-image:radial-gradient(60%_70%_at_50%_0%,black,transparent)]"
          style={{ backgroundImage: 'linear-gradient(to right, rgba(120,116,100,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,116,100,.18) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="eyebrow text-green-700 dark:text-green-400">DS &amp; DAA Visual Learning Platform</motion.p>
        <h1 className="mt-3 text-[clamp(2.1rem,10.5vw,5.5rem)] font-semibold leading-[1.05] tracking-tight text-slate-900 dark:text-white lg:text-8xl">
          <Words text="StructuraLens" wordClass="" />
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed sm:mt-5 sm:text-xl sm:leading-relaxed text-slate-600 dark:text-zinc-300">
          <Words text="See the structure inside every algorithm. From Big-O to A* search, one calm place to learn it." />
        </p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.5 }} className="mt-8 flex flex-wrap gap-3">
          <a href={href('recursion')} className="btn btn-primary !rounded-md !px-5 !py-2.5 text-sm sm:!px-6 sm:!py-3 sm:text-base">Start with Recursion →</a>
          <a href="#topics" onClick={(e) => { e.preventDefault(); document.getElementById('topics')?.scrollIntoView({ behavior: 'smooth' }); }} className="btn !rounded-md !px-5 !py-2.5 text-sm sm:!px-6 sm:!py-3 sm:text-base">Browse the curriculum</a>
        </motion.div>
      </section>

      <section id="topics" className="mx-auto max-w-[1200px] scroll-mt-20 space-y-10 px-6 py-6 sm:space-y-12 sm:px-5 sm:py-8">
        {TIERS.map((tier) => (
          <div key={tier.id}>
            <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45 }} className="mb-5">
              <p className="eyebrow flex items-center gap-2 text-green-700 dark:text-green-400">{tier.kicker}{tier.advanced && <span className="rounded-md bg-amber-100 px-2 py-px text-[10px] font-bold tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-mono">ADVANCED</span>}</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">{tier.title}</h2>
              <p className="mt-1 max-w-2xl text-slate-600 dark:text-zinc-400">{tier.blurb}</p>
            </motion.div>
            <motion.div variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tier.topics.map((t) => <TopicCard key={t.id} t={t} advanced={tier.advanced} />)}
            </motion.div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-10 sm:px-5 sm:py-12">
        <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-8 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <motion.div key={t} variants={reveal}>
              <p className=" text-4xl font-semibold text-green-700/40 dark:text-green-400/40">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{t}</h3>
              <p className="mt-1 text-slate-600 dark:text-zinc-400">{d}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
