// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. Bars at/above the baseline use `currentColor`; bars
// below it are tinted with the shadcn `text-destructive` token. Set the primary
// hue with a text-* class on the element.
import { cn } from "./lib/cn";
import { extent } from "./lib/scale";

export interface SparklineBarProps {
  /** The series to plot, oldest → newest. */
  values: number[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  /** Bars are drawn relative to this value; below it they read as negative. */
  baseline?: number;
  /** Gap between bars, in viewBox units. */
  gap?: number;
  label?: string;
  className?: string;
}

export function SparklineBar({
  values,
  width = 100,
  height = 32,
  min,
  max,
  baseline = 0,
  gap = 1,
  label,
  className,
}: SparklineBarProps) {
  const pad = 1;
  const base = Number.isFinite(baseline) ? baseline : 0;
  const domain = extent([...values, base], { min, max });
  const span = domain.max - domain.min;
  const innerH = height - pad * 2;
  const yOf = (v: number) => pad + innerH - ((v - domain.min) / span) * innerH;
  const yBase = yOf(base);

  const n = values.length;
  const slot = n > 0 ? (width - pad * 2) / n : 0;
  const barW = Math.max(0, slot - gap);

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
      {values.map((raw, i) => {
        // Non-finite bars collapse to the baseline (zero height) instead of
        // emitting NaN geometry.
        const v = Number.isFinite(raw) ? raw : base;
        const yV = yOf(v);
        const y = Math.min(yV, yBase);
        const h = Math.abs(yV - yBase);
        const negative = v < base;
        return (
          <rect
            key={i}
            x={(pad + i * slot + gap / 2).toFixed(2)}
            y={y.toFixed(2)}
            width={barW.toFixed(2)}
            height={h.toFixed(2)}
            rx={Math.min(1, barW / 2)}
            fill="currentColor"
            className={negative ? "text-destructive" : undefined}
          />
        );
      })}
    </svg>
  );
}
