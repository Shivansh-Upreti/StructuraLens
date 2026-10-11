/* Universal playback bar: Reset, Step Back, Play/Pause, Step Forward + timeline and speed.
   Used by every non-recursion module (Recursion keeps its own bar with extra tracing options). */
export default function VisualizerControls({ pos, total, playing, speed, onReset, onPrev, onToggle, onNext, onSeek, onSpeed, disabled, inline = false }) {
  const last = pos >= total - 1;
  return (
    <div className={`${inline ? 'flex-none max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:backdrop-blur' : 'fixed inset-x-0 bottom-0 z-40 backdrop-blur'} border-t border-slate-200 bg-slate-50/95 dark:border-zinc-800 dark:bg-zinc-950/95`} role="toolbar" aria-label="Visualizer controls">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 lg:gap-3 lg:px-4 lg:py-2">
        <div className="flex gap-1 lg:gap-1.5">
          <button type="button" className="btn max-lg:!px-2.5 max-lg:!py-1.5" onClick={onReset} disabled={disabled || pos === 0} aria-label="Reset" title="Reset (Home)"><span className="max-lg:hidden">↺ Reset</span><span className="lg:hidden">↺</span></button>
          <button type="button" className="btn !w-9 !px-0 max-lg:!py-1.5 lg:!w-10" onClick={onPrev} disabled={disabled || pos === 0} aria-label="Step backward" title="Step backward (←)">◀</button>
          <button type="button" className="btn btn-primary !w-[3.25rem] max-lg:!py-1.5 lg:!w-24" onClick={onToggle} disabled={disabled} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)"><span className="max-lg:hidden">{playing ? '⏸ Pause' : '▶ Play'}</span><span className="lg:hidden">{playing ? '⏸' : '▶'}</span></button>
          <button type="button" className="btn max-lg:!px-3 max-lg:!py-1.5" onClick={onNext} disabled={disabled || last} aria-label="Step forward" title="Step forward (→)">Step ▶</button>
        </div>
        <input type="range" className="h-2 min-w-[160px] cursor-pointer accent-green-600 max-lg:order-last max-lg:basis-full lg:flex-1" min={0} max={Math.max(0, total - 1)} value={pos} disabled={disabled} onChange={(e) => onSeek(parseInt(e.target.value, 10))} aria-label="Timeline" />
        <span className="text-xs tabular-nums text-slate-500 dark:text-zinc-400 max-lg:ml-auto max-lg:min-w-0 max-lg:text-[11px] lg:min-w-[96px] font-mono">step {Math.min(pos + 1, total)} / {total}</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 max-lg:text-[11px]">Speed
          <select className="field !w-auto !py-1" value={speed} onChange={(e) => onSpeed(parseFloat(e.target.value))} aria-label="Playback speed">{[0.5, 1, 2, 4].map((s) => <option key={s} value={s}>{s}×</option>)}</select>
        </label>
      </div>
    </div>
  );
}
