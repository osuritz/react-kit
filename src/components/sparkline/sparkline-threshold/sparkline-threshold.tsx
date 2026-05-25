// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. A trend line with an optional shaded "acceptable"
// band and/or a dashed limit line — for monitoring a metric against a target
// (p95 latency vs SLO, error rate vs budget). Points that breach the threshold
// or fall outside the band are marked with the `text-destructive` token.
import { cn } from "./lib/cn";
import { extent, linePath, toPoints } from "./lib/scale";

export interface SparklineThresholdProps {
  /** The series to plot, oldest → newest. */
  values: number[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  /** A hard limit; values strictly above it are breaches. */
  threshold?: number;
  /** An acceptable [low, high] range; values outside it are breaches. */
  band?: [number, number];
  showLast?: boolean;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

function isBreach(
  v: number,
  threshold: number | undefined,
  band: [number, number] | undefined,
): boolean {
  if (threshold !== undefined && v > threshold) return true;
  if (band && (v < band[0] || v > band[1])) return true;
  return false;
}

export function SparklineThreshold({
  values,
  width = 100,
  height = 32,
  min,
  max,
  threshold,
  band,
  showLast = false,
  strokeWidth = 1.5,
  label,
  className,
}: SparklineThresholdProps) {
  const pad = Math.max(2, strokeWidth + 1);
  // Accept a band given in either order; normalize to [low, high] so a
  // reversed pair doesn't flag every point as a breach.
  const nBand: [number, number] | undefined = band
    ? band[0] <= band[1]
      ? band
      : [band[1], band[0]]
    : undefined;
  // Domain spans the data *and* any reference lines so the band/limit stay
  // visible even when they sit outside the data's own range.
  const refs = [
    ...(nBand ?? []),
    ...(threshold !== undefined ? [threshold] : []),
  ];
  const domain = extent([...values, ...refs], { min, max });
  const points = toPoints(values, {
    width,
    height,
    pad,
    min: domain.min,
    max: domain.max,
  });
  const span = domain.max - domain.min;
  const innerH = height - pad * 2;
  const yOf = (v: number) => pad + innerH - ((v - domain.min) / span) * innerH;
  const last = points.at(-1);
  const r = strokeWidth + 1;

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
      {nBand ? (
        <rect
          data-part="band"
          x={0}
          y={yOf(nBand[1]).toFixed(2)}
          width={width}
          height={Math.abs(yOf(nBand[0]) - yOf(nBand[1])).toFixed(2)}
          fill="currentColor"
          fillOpacity={0.1}
        />
      ) : null}
      {threshold !== undefined ? (
        <line
          data-part="threshold"
          x1={0}
          y1={yOf(threshold).toFixed(2)}
          x2={width}
          y2={yOf(threshold).toFixed(2)}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.45}
        />
      ) : null}
      <path
        data-part="line"
        d={linePath(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, i) =>
        isBreach(values[i], threshold, nBand) ? (
          <circle
            key={i}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r={r}
            fill="currentColor"
            className="text-destructive"
          />
        ) : null,
      )}
      {showLast && last ? (
        <circle cx={last.x} cy={last.y} r={r} fill="currentColor" />
      ) : null}
    </svg>
  );
}
