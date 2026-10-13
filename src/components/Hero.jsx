/** Topic header for the Recursion module (the platform brand lives in the global navbar). */
export default function Hero() {
  return (
    <section className="mx-auto max-w-[1500px] px-5 pb-2 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-slate-200 pb-4 dark:border-line">
        <div>
          <p className="eyebrow prompt">tier 1 / data structures</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-fg sm:text-4xl">Recursion</h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-fg-muted sm:text-[15px]">
          Step through the code, the call stack and the recursion tree together, and see which frame is executing, which are paused, and what each one returns. Bring your own function in JavaScript, C, C++, Java or Python.
        </p>
      </div>
    </section>
  );
}
