export default function PlaybackBar({ pos, total, playing, onFirst, onPrev, onNext, onLast, onPlay, onSeek, speed, onSpeed, gran, onGran, predict, onPredict, score }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 max-lg:pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:gap-3 lg:px-5 lg:py-2.5">
        <div className="flex gap-1 lg:gap-1.5">
          <button type="button" className="btn !w-9 !px-0 max-lg:!py-1.5 lg:!w-10" onClick={onFirst} disabled={pos < 0} aria-label="Restart" title="Restart (Home)">|&lt;</button>
          <button type="button" className="btn !w-9 !px-0 max-lg:!py-1.5 lg:!w-10" onClick={onPrev} disabled={pos < 0} aria-label="Step back" title="Step back (←)">&lt;</button>
          <button type="button" className="btn btn-primary !w-11 !px-0 text-base max-lg:!py-1.5 lg:!w-12" onClick={onPlay} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">{playing ? 'Pause' : 'Play'}</button>
          <button type="button" className="btn max-lg:!px-3 max-lg:!py-1.5" onClick={onNext} disabled={pos >= total - 1} aria-label="Step forward" title="Step forward (→)">Step &gt;</button>
          <button type="button" className="btn !w-9 !px-0 max-lg:!py-1.5 lg:!w-10" onClick={onLast} disabled={pos >= total - 1} aria-label="Jump to end" title="End">&gt;|</button>
        </div>
        <input type="range" className="h-2 min-w-[160px] cursor-pointer accent-green-600 max-lg:order-last max-lg:basis-full lg:flex-1" min={0} max={total} value={pos + 1} onChange={(e) => onSeek(parseInt(e.target.value, 10) - 1)} aria-label="Execution timeline" />
        <span className="text-xs tabular-nums text-slate-500 dark:text-zinc-400 max-lg:ml-auto max-lg:text-[11px] lg:min-w-[88px] font-mono">step {pos + 1} / {total}</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 max-lg:text-[11px]">Detail
          <select className="field !w-auto !py-1" value={gran} onChange={(e) => onGran(e.target.value)} aria-label="Step granularity"><option value="line">Line by line</option><option value="call">Calls &amp; returns</option></select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 max-lg:text-[11px]">Speed
          <select className="field !w-auto !py-1" value={speed} onChange={(e) => onSpeed(parseFloat(e.target.value))} aria-label="Playback speed">{[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}</select>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300 max-lg:text-[11px]"><input type="checkbox" className="accent-green-600" checked={predict} onChange={(e) => onPredict(e.target.checked)} /> Predict returns{score.n ? <span className="rounded-md bg-green-50 dark:bg-green-950/50 px-2 py-px font-semibold text-green-700 dark:text-green-400 font-mono">{score.ok}/{score.n}</span> : null}</label>
      </div>
    </footer>
  );
}
