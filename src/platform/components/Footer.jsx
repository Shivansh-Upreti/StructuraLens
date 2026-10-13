import { href } from '../router.js';

export default function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-[1500px] border-t border-slate-200 px-5 pb-28 pt-8 text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p><a href={href('')} className=" font-semibold text-slate-800 hover:text-green-700 dark:text-fg dark:hover:text-green-400">StructuraLens</a> · DS &amp; DAA Visual Learning Platform</p>
        <p>Everything runs in your browser. No accounts, no tracking, no network calls.</p>
      </div>
    </footer>
  );
}
