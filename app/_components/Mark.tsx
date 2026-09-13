/**
 * The Parity mark: one solid bar above a broken one. Two things that look
 * alike at a glance and are not the same underneath.
 */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <rect x="8" y="33" width="84" height="13" rx="1" fill="currentColor" />
      <g fill="currentColor">
        <rect x="8" y="56" width="26" height="13" rx="1" />
        <rect x="41" y="56" width="14" height="13" rx="1" />
        <rect x="62" y="56" width="8" height="13" rx="1" />
        <rect x="77" y="56" width="15" height="13" rx="1" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className="h-6 w-6 text-signal" />
      <span className="text-xl font-black tracking-tight">Parity</span>
    </span>
  );
}
