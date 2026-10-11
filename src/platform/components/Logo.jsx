/* StructuraLens mark: a magnifying lens (focus) whose glass contains a small binary tree (nodes + edges).
   Monochrome with a single emerald accent node. The ring and handle follow the text colour, so the mark reads
   on both light and dark surfaces. Inline SVG: no extra request. */
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`text-zinc-900 dark:text-white ${className}`} aria-hidden="true" focusable="false">
      <circle cx="18" cy="18" r="13.5" fill="#0a0a0a" stroke="currentColor" strokeWidth="3" />
      <path d="M28 28 L36.5 36.5" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M18 11 L11.5 20 M18 11 L24.5 20 M11.5 20 L8.5 27" stroke="#a1a1aa" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="11" r="2.7" fill="#34d399" />
      <circle cx="11.5" cy="20" r="2.4" fill="#fafafa" />
      <circle cx="24.5" cy="20" r="2.4" fill="#fafafa" />
      <circle cx="8.5" cy="27" r="2" fill="#fafafa" />
    </svg>
  );
}
