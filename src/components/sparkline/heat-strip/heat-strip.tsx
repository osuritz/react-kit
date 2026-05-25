// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. A single row of cells whose opacity encodes intensity
// (request volume by hour, activity by day, error density). One color
// (`currentColor`) ramped by opacity, so it reads as a heat strip without a
// multi-hue scale. Set the hue with a text-* class.
import { cn } from "./lib/cn";

export interface HeatStripProps {
  /** The series; each value becomes one cell. */
  values: number[];
  /** Intensity ceiling. Defaults to the largest value. */
  max?: number;
  width?: number;
  height?: number;
  /** Gap between cells, in viewBox units. */
  gap?: number;
  /** Corner radius of each cell. */
  radius?: number;
  /** Opacity floor so empty cells stay faintly visible. */
  minOpacity?: number;
  label?: string;
  className?: string;
}

export function HeatStrip({
  values,
  max,
  width = 100,
  height = 12,
  gap = 1.5,
  radius = 1.5,
  minOpacity = 0.08,
  label,
  className,
}: HeatStripProps) {
  const finiteVals = values.filter((v) => Number.isFinite(v));
  const ceil = max ?? Math.max(0, ...finiteVals);
  const scaleMax = Number.isFinite(ceil) && ceil > 0 ? ceil : 1; // guard divide-by-zero
  const n = values.length;
  const slot = n > 0 ? width / n : 0;
  const cellW = Math.max(0, slot - gap);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block", className)}
      role={label?.trim() ? "img" : undefined}
      aria-label={label?.trim() ? label : undefined}
      aria-hidden={label?.trim() ? undefined : true}
    >
      {label?.trim() ? <title>{label}</title> : null}
      {values.map((v, i) => {
        // Non-finite cells fall to the opacity floor rather than fill-opacity="NaN".
        const intensity = Number.isFinite(v)
          ? Math.max(0, Math.min(1, v / scaleMax))
          : 0;
        const opacity = minOpacity + (1 - minOpacity) * intensity;
        return (
          <rect
            key={i}
            x={(i * slot + gap / 2).toFixed(2)}
            y={0}
            width={cellW.toFixed(2)}
            height={height}
            rx={radius}
            fill="currentColor"
            fillOpacity={opacity.toFixed(3)}
          />
        );
      })}
    </svg>
  );
}
