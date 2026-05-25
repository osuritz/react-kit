// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. A compact Tufte bullet graph: qualitative background
// bands (poor → good, drawn darkest-on-the-left via decreasing currentColor
// opacity), a measure bar for the actual value, and a tick for the target. The
// single most "enterprise KPI" micro-chart — actual vs target at a glance.
import { cn } from "./lib/cn";

export interface BulletGraphProps {
  /** The actual measured value. */
  value: number;
  /** The goal; drawn as a vertical tick. */
  target: number;
  /**
   * Ascending boundaries that split 0..max into qualitative bands
   * (e.g. `[50, 75]` → poor / satisfactory / good).
   */
  ranges: number[];
  /** Scale ceiling. Defaults to the largest of value/target/ranges. */
  max?: number;
  width?: number;
  height?: number;
  label?: string;
  className?: string;
}

export function BulletGraph({
  value,
  target,
  ranges,
  max,
  width = 160,
  height = 24,
  label,
  className,
}: BulletGraphProps) {
  const candidates = [value, target, ...ranges].filter((n) => Number.isFinite(n));
  const ceil = max ?? Math.max(0, ...candidates);
  const scaleMax = Number.isFinite(ceil) && ceil > 0 ? ceil : 1; // guard divide-by-zero
  const xOf = (v: number) =>
    Math.max(0, Math.min(width, ((Number.isFinite(v) ? v : 0) / scaleMax) * width));

  // Band boundaries: 0 → each range → scaleMax. Lighter as quality improves.
  const bounds = [0, ...ranges, scaleMax];
  const bands = bounds.slice(0, -1).map((lo, i) => ({
    x: xOf(lo),
    w: xOf(bounds[i + 1]) - xOf(lo),
    opacity: 0.28 - i * (0.2 / Math.max(1, bounds.length - 2)),
  }));

  const measureH = height * 0.4;
  const measureY = (height - measureH) / 2;
  const targetX = xOf(target);

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
      {bands.map((b, i) => (
        <rect
          key={i}
          data-part="range"
          x={b.x.toFixed(2)}
          y={0}
          width={Math.max(0, b.w).toFixed(2)}
          height={height}
          fill="currentColor"
          fillOpacity={Math.max(0.05, b.opacity).toFixed(3)}
        />
      ))}
      <rect
        data-part="measure"
        x={0}
        y={measureY.toFixed(2)}
        width={xOf(value).toFixed(2)}
        height={measureH.toFixed(2)}
        rx={1}
        fill="currentColor"
      />
      <rect
        data-part="target"
        x={Math.max(0, targetX - 1).toFixed(2)}
        y={(height * 0.15).toFixed(2)}
        width={2}
        height={(height * 0.7).toFixed(2)}
        fill="currentColor"
      />
    </svg>
  );
}
