// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. A single-value progress ring (quota usage, completion
// %, health score). The arc uses `pathLength={100}` so its length is just the
// percentage — no circumference math. Track + arc both use `currentColor` (the
// track at low opacity); set the hue with a text-* class.
import { cn } from "./lib/cn";

export interface GaugeRingProps {
  value: number;
  max?: number;
  /** Width and height (the ring is square). */
  size?: number;
  /** Ring stroke width. */
  thickness?: number;
  /** Optional text in the middle (e.g. "72%"). */
  centerLabel?: string;
  /** Opacity of the unfilled track. */
  trackOpacity?: number;
  label?: string;
  className?: string;
}

export function GaugeRing({
  value,
  max = 100,
  size = 48,
  thickness = 6,
  centerLabel,
  trackOpacity = 0.15,
  label,
  className,
}: GaugeRingProps) {
  const fraction =
    Number.isFinite(value) && Number.isFinite(max) && max > 0
      ? Math.max(0, Math.min(1, value / max))
      : 0;
  const pct = fraction * 100;
  const c = size / 2;
  // Clamp so an oversized `thickness` can't produce a negative radius (invalid SVG).
  const r = Math.max(0, (size - thickness) / 2);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("block", className)}
      role={label?.trim() ? "img" : undefined}
      aria-label={label?.trim() ? label : undefined}
      aria-hidden={label?.trim() ? undefined : true}
    >
      {label?.trim() ? <title>{label}</title> : null}
      <circle
        data-part="track"
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={trackOpacity}
        strokeWidth={thickness}
      />
      <circle
        data-part="value"
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={thickness}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${pct.toFixed(2)} 100`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      {centerLabel ? (
        <text
          x={c}
          y={c}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize={size * 0.28}
          fontWeight={600}
        >
          {centerLabel}
        </text>
      ) : null}
    </svg>
  );
}
