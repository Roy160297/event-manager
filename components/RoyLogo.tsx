// Circular monogram badge for the private-events brand: an "R" inside a
// double ring, with "ROY" / "EVENTS" set below it. Colors are drawn from the
// theme's own CSS variables (not hardcoded hex) so it automatically follows
// any future .theme-private palette change instead of drifting out of sync.
export function RoyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 182" className={className} aria-hidden="true">
      <circle cx="80" cy="72" r="62" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
      <circle cx="80" cy="72" r="52" fill="none" stroke="var(--accent)" strokeWidth="0.75" />
      <text
        x="80"
        y="98"
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontSize="68"
        fill="var(--foreground)"
      >
        R
      </text>
      <text
        x="80"
        y="150"
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontSize="15"
        letterSpacing="4"
        fill="var(--foreground)"
      >
        ROY
      </text>
      <text
        x="80"
        y="168"
        textAnchor="middle"
        fontFamily="var(--font-serif)"
        fontSize="11"
        letterSpacing="2"
        fill="var(--accent)"
      >
        EVENTS
      </text>
    </svg>
  );
}
