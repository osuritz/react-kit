// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG — no state, no effects, no interactivity. Color comes
// from `currentColor`, so set the line's hue with a text-* class on the element
// (e.g. `text-chart-1`, `text-emerald-500`). Tailwind v4 + the standard shadcn
// theme tokens are expected at the host-app level only if you use token-based
// utility classes; the component itself needs no tokens to render.
import { cn } from "./lib/cn";
import { linePath, toPoints } from "./lib/scale";

export interface SparklineLineProps {
  /** The series to plot, oldest → newest. */
  values: number[];
  width?: number;
  height?: number;
  /** Override the scale floor/ceiling (defaults to the data's own min/max). */
  min?: number;
  max?: number;
  /** Dot on the most recent point. */
  showLast?: boolean;
  /** Dots on the highest (solid) and lowest (faded) points. */
  showExtremes?: boolean;
  strokeWidth?: number;
  /**
   * Accessible name. When provided the svg is `role="img"` with this label;
   * when omitted the svg is treated as decorative (`aria-hidden`).
   */
  label?: string;
  className?: string;
}

export function SparklineLine({
  values,
  width = 100,
  height = 32,
  min,
  max,
  showLast = false,
  showExtremes = false,
  strokeWidth = 1.5,
  label,
  className,
}: SparklineLineProps) {
  const pad = Math.max(2, strokeWidth + 1);
  const points = toPoints(values, { width, height, pad, min, max });
  const d = linePath(points);
  const last = points.at(-1);
  const r = strokeWidth + 1;

  const extremes =
    showExtremes && points.length > 0
      ? points.reduce(
          (acc, p) => ({
            hi: p.y < acc.hi.y ? p : acc.hi,
            lo: p.y > acc.lo.y ? p : acc.lo,
          }),
          { hi: points[0], lo: points[0] },
        )
      : null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block overflow-visible", className)}
      role={label?.trim() ? "img" : undefined}
      aria-label={label?.trim() ? label : undefined}
      aria-hidden={label?.trim() ? undefined : true}
    >
      {label?.trim() ? <title>{label}</title> : null}
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {extremes ? (
        <>
          <circle cx={extremes.hi.x} cy={extremes.hi.y} r={r} fill="currentColor" />
          <circle
            cx={extremes.lo.x}
            cy={extremes.lo.y}
            r={r}
            fill="currentColor"
            opacity={0.4}
          />
        </>
      ) : null}
      {showLast && last ? (
        <circle cx={last.x} cy={last.y} r={r} fill="currentColor" />
      ) : null}
    </svg>
  );
}
