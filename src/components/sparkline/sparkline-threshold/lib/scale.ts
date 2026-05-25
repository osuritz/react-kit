// Pure scaling helpers shared by the series-style sparklines (line / area /
// bar / win-loss / threshold). No DOM, no React — just turn a `number[]` into
// coordinates in an SVG viewBox. Each drop-in keeps its own copy so the folder
// stays self-contained and copy-paste-friendly.

export interface Extent {
  min: number;
  max: number;
}

/**
 * Resolve the value range to map onto the chart height. Guards the two
 * degenerate cases that otherwise produce `NaN`/`Infinity` coordinates:
 * empty input (no finite min/max) and flat input (every value equal, so the
 * span would be 0 and `(v - min) / span` would divide by zero).
 */
export function extent(
  values: number[],
  opts?: { min?: number; max?: number },
): Extent {
  // Only finite values define the range — a stray NaN/Infinity in otherwise
  // good data must not poison min/max (Math.min(1, NaN, 3) is NaN).
  const finite = values.filter((v) => Number.isFinite(v));
  const lo = opts?.min ?? (finite.length ? Math.min(...finite) : Number.NaN);
  const hi = opts?.max ?? (finite.length ? Math.max(...finite) : Number.NaN);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1 };
  if (lo > hi) return { min: hi, max: lo }; // tolerate a reversed min/max override
  if (lo === hi) return { min: lo, max: lo + 1 };
  return { min: lo, max: hi };
}

export interface Point {
  x: number;
  y: number;
}

export interface ScaleOpts {
  width: number;
  height: number;
  /** Inner padding so strokes/markers near the edges aren't clipped. */
  pad?: number;
  min?: number;
  max?: number;
}

/** Map values to evenly-spaced points; y is flipped (SVG origin is top-left). */
export function toPoints(values: number[], opts: ScaleOpts): Point[] {
  const { width, height } = opts;
  const pad = opts.pad ?? 2;
  const { min, max } = extent(values, { min: opts.min, max: opts.max });
  const span = max - min; // guaranteed > 0 by `extent`
  const innerH = height - pad * 2;
  const step =
    values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  return values.map((raw, i) => {
    // A non-finite point is pinned to the baseline so it yields a finite
    // coordinate instead of NaN (it renders flat rather than corrupting the path).
    const v = Number.isFinite(raw) ? raw : min;
    return {
      x: pad + i * step,
      y: pad + innerH - ((v - min) / span) * innerH,
    };
  });
}

/** `M`/`L` polyline through the points. Empty input → empty string. */
export function linePath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
}

/** Line path closed down to the baseline (chart bottom) for an area fill. */
export function areaPath(points: Point[], height: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x.toFixed(2)},${height.toFixed(
    2,
  )} L${first.x.toFixed(2)},${height.toFixed(2)} Z`;
}
