// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. Equal-height ticks above the midline for "wins"
// (value > 0) and below for "losses" (value < 0); zeros render as a thin tie
// mark on the line. Magnitude is ignored — this chart is about the *pattern* of
// outcomes (SLA met/missed, test pass/fail, gain/loss days). Wins use
// `currentColor`; losses are tinted `text-destructive`.
import { cn } from "./lib/cn";

export interface SparklineWinLossProps {
  /** Sign of each value → win (>0) / loss (<0) / tie (0). */
  values: number[];
  width?: number;
  height?: number;
  /** Gap between ticks, in viewBox units. */
  gap?: number;
  label?: string;
  className?: string;
}

export function SparklineWinLoss({
  values,
  width = 100,
  height = 32,
  gap = 1,
  label,
  className,
}: SparklineWinLossProps) {
  const pad = 1;
  const mid = height / 2;
  const tickH = mid - pad; // full-height win/loss tick
  const tieH = Math.max(1.5, height * 0.08);

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
      {values.map((v, i) => {
        const x = pad + i * slot + gap / 2;
        const win = v > 0;
        const loss = v < 0;
        const y = win ? mid - tickH : loss ? mid : mid - tieH / 2;
        const h = win || loss ? tickH : tieH;
        return (
          <rect
            key={i}
            x={x.toFixed(2)}
            y={y.toFixed(2)}
            width={barW.toFixed(2)}
            height={h.toFixed(2)}
            rx={Math.min(1, barW / 2)}
            fill="currentColor"
            className={loss ? "text-destructive" : !win ? "opacity-40" : undefined}
          />
        );
      })}
    </svg>
  );
}
