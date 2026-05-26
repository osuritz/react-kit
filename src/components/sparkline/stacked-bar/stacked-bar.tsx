// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Pure presentational SVG. A single-row part-to-whole bar (status breakdown,
// budget split, market share). Segments size in proportion to the total and
// cycle the shadcn `--color-chart-1..5` tokens unless given an explicit color.
import { cn } from './lib/cn';

export interface StackedBarSegment {
  value: number;
  label?: string;
  /** Any CSS color; defaults to a cycled `--color-chart-*` token. */
  color?: string;
}

export interface StackedBarProps {
  segments: StackedBarSegment[];
  width?: number;
  height?: number;
  /** Gap between segments, in viewBox units. */
  gap?: number;
  /** Corner radius of the whole bar / each segment. */
  radius?: number;
  label?: string;
  className?: string;
}

const PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

export function StackedBar({
  segments,
  width = 100,
  height = 8,
  gap = 2,
  radius = 2,
  label,
  className,
}: StackedBarProps) {
  // Coerce each segment to a finite, non-negative weight so one NaN/negative
  // value can't make `total` NaN and silently blank the entire bar.
  const weight = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
  const total = segments.reduce((sum, s) => sum + weight(s.value), 0);
  const gaps = Math.max(0, segments.length - 1) * gap;
  const track = Math.max(0, width - gaps);

  const widths = segments.map((s) => (total > 0 ? (weight(s.value) / total) * track : 0));
  const rects = segments.map((s, i) => ({
    // x = sum of prior widths + the gaps that precede this segment. Computed
    // functionally (no render-time mutation) to satisfy the immutability lint.
    x: widths.slice(0, i).reduce((sum, w) => sum + w, 0) + i * gap,
    w: widths[i],
    fill: s.color ?? PALETTE[i % PALETTE.length],
  }));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block', className)}
      role={label?.trim() ? 'img' : undefined}
      aria-label={label?.trim() ? label : undefined}
      aria-hidden={label?.trim() ? undefined : true}
    >
      {label?.trim() ? <title>{label}</title> : null}
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x.toFixed(2)}
          y={0}
          width={r.w.toFixed(2)}
          height={height}
          rx={radius}
          fill={r.fill}
        />
      ))}
    </svg>
  );
}
