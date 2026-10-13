import { useEffect } from 'react';

/* Phones are landscape-only.
   - Portrait and narrower than md (768px): a full-screen #0A0A0A overlay asks the user to rotate
     (pure CSS: `max-md:portrait:flex`, so it reacts instantly to rotation with no JS).
   - Landscape on a small device: the layout viewport is widened to 1100 CSS px, so the desktop
     side-by-side split (lg: >= 1024px) is used unchanged and simply rendered at a smaller scale.
     Desktop styles are therefore never duplicated or forked for phones.
   Trade-off: text is drawn smaller on a landscape phone (about 0.7-0.8x); pinch-zoom still works. */
const SPLIT_WIDTH = 1100;

function syncViewport() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const sw = window.screen.width, sh = window.screen.height;
  const shortSide = Math.min(sw, sh), longSide = Math.max(sw, sh);
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const small = shortSide < 768 && longSide < 1024;           // phones only; tablets and desktops untouched
  const want = small && landscape ? `width=${SPLIT_WIDTH}, viewport-fit=cover` : 'width=device-width, initial-scale=1, viewport-fit=cover';
  if (meta.getAttribute('content') !== want) meta.setAttribute('content', want);
}

export default function OrientationGuard() {
  useEffect(() => {
    syncViewport();
    const mq = window.matchMedia('(orientation: landscape)');
    mq.addEventListener('change', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    return () => { mq.removeEventListener('change', syncViewport); window.removeEventListener('orientationchange', syncViewport); };
  }, []);

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="rotate-msg"
      className="fixed inset-0 z-[100] hidden flex-col items-center justify-center gap-6 bg-canvas px-8 text-center max-md:portrait:flex">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="text-accent">
        <rect x="18" y="6" width="20" height="34" rx="2" stroke="#3F3F46" strokeWidth="1.5" />
        <rect x="11" y="24" width="34" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M44 14a10 10 0 0 1 4 8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M48 22l-3-1.5M48 22l1.5-3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <p id="rotate-msg" className="max-w-xs text-base leading-relaxed text-fg">Please rotate your device to landscape mode for a better user experience</p>
      <p className="font-mono text-xs text-fg-muted">&gt;_ StructuraLens</p>
    </div>
  );
}
