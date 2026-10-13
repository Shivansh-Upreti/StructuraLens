import { TIERS } from '../topics.js';
import { href } from '../router.js';

/* Landing = an index, not a brochure. Left: what the tool is, in two sentences.
   Right: the full curriculum as a dense, scannable table (one row per topic). */
const TOTAL = TIERS.reduce((n, t) => n + t.topics.length, 0);

const NOTES = [
  ['Trace', 'Every step records the exact source line, the variables and the data-structure state that line produced.'],
  ['Explain', 'Beginner and Advanced explanations per step: an analogy, or the invariant, proof sketch and cost.'],
  ['Verify', 'Trace your own recursive function in JavaScript, C, C++, Java or Python, or test your implementation of any other algorithm in a sandboxed worker.'],
];

function TopicRow({ t, n }) {
  return (
    <li>
      <a href={href(t.id)} className="group grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-slate-200 px-3 py-3 transition-colors duration-100 hover:bg-slate-100 dark:border-line dark:hover:bg-panel-2 sm:grid-cols-[2.25rem_minmax(0,12rem)_minmax(0,1fr)] sm:items-baseline">
        <span className="font-mono text-xs text-slate-400 dark:text-fg-muted">{String(n).padStart(2, '0')}</span>
        <span className="font-medium text-slate-900 group-hover:text-accent-700 dark:text-fg dark:group-hover:text-accent">{t.title}</span>
        <span className="col-start-2 mt-0.5 min-w-0 sm:col-start-3 sm:row-start-1 sm:mt-0">
          <span className="block text-sm text-slate-500 dark:text-fg-muted">{t.hard}</span>
          <span className="mt-1 block font-mono text-[11px] text-slate-500 dark:text-fg-done">{t.tag}</span>
        </span>
      </a>
    </li>
  );
}

export default function Landing() {
  let n = 0;
  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-10 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14 lg:py-16">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow prompt">structuralens</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-fg sm:text-4xl">
          Step-through visualizer for data structures and algorithms.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-fg-muted">
          Code and state advance together, one line at a time. Pick a topic, press play, and step backwards whenever something is unclear.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={href('recursion')} className="btn btn-primary">Open Recursion</a>
          <a href="#topics" onClick={(e) => { e.preventDefault(); document.getElementById('topics')?.scrollIntoView(); }} className="btn">Curriculum ({TOTAL})</a>
        </div>
        <dl className="mt-10 divide-y divide-slate-200 border-y border-slate-200 dark:divide-line dark:border-line">
          {NOTES.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-3 text-sm">
              <dt className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-fg-muted">{k}</dt>
              <dd className="text-slate-600 dark:text-fg-done">{v}</dd>
            </div>
          ))}
        </dl>
      </aside>

      <section id="topics" className="min-w-0 scroll-mt-20">
        {TIERS.map((tier) => (
          <div key={tier.id} className="mb-10 last:mb-0">
            <header className="flex items-baseline justify-between gap-4 border-b border-slate-300 pb-2 dark:border-zinc-700">
              <h2 className="text-base font-semibold text-slate-900 dark:text-fg">
                <span className="mr-2 font-mono text-xs font-normal text-slate-400 dark:text-fg-muted">{tier.kicker}</span>{tier.title}
              </h2>
              <span className="font-mono text-[11px] text-slate-400 dark:text-fg-muted">{tier.topics.length} topics{tier.advanced ? ' / advanced' : ''}</span>
            </header>
            <p className="mt-2 mb-1 text-sm text-slate-500 dark:text-fg-muted">{tier.blurb}</p>
            <ul>{tier.topics.map((t) => <TopicRow key={t.id} t={t} n={++n} />)}</ul>
          </div>
        ))}
      </section>
    </div>
  );
}
