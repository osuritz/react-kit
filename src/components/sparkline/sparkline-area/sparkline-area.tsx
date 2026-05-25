// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. Both the line and its fill use `currentColor` (the
// fill is drawn at a low opacity), so set the hue with a text-* class on the
// element or a wrapping container.
import { cn } from "./lib/cn";
import { areaPath, linePath, toPoints } from "./lib/scale";

export interface SparklineAreaProps {
  /** The series to plot, oldest → newest. */
  values: number[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  /** Dot on the most recent point. */
  showLast?: boolean;
  strokeWidth?: number;
  /** Opacity of the filled area under the line (0–1). */
  fillOpacity?: number;
  label?: string;
  className?: string;
}

export function SparklineArea({
  values,
  width = 100,
  height = 32,
  min,
  max,
  showLast = false,
  strokeWidth = 1.5,
  fillOpacity = 0.15,
  label,
  className,
}: SparklineAreaProps) {
  const pad = Math.max(2, strokeWidth + 1);
  const points = toPoints(values, { width, height, pad, min, max });
  const line = linePath(points);
  const area = areaPath(points, height);
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
      <path d={area} fill="currentColor" fillOpacity={fillOpacity} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showLast && last ? (
        <circle cx={last.x} cy={last.y} r={r} fill="currentColor" />
      ) : null}
    </svg>
  );
}
