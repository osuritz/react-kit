import { describe, expect, it } from 'vitest';
import { areaPath, extent, linePath, toPoints } from './scale';

describe('extent', () => {
  it('returns the data min/max for a normal series', () => {
    expect(extent([1, 5, 2, 8, 4])).toEqual({ min: 1, max: 8 });
  });

  it('honors explicit min/max overrides', () => {
    expect(extent([1, 5, 2], { min: 0, max: 10 })).toEqual({ min: 0, max: 10 });
  });

  it('guards a flat series so the span is never zero (divide-by-zero)', () => {
    // Every value equal — a bare max-min would be 0 and callers would divide
    // by it. The guard nudges max so the span is 1.
    expect(extent([5, 5, 5])).toEqual({ min: 5, max: 6 });
    expect(extent([0, 0, 0, 0])).toEqual({ min: 0, max: 1 });
    expect(extent([-3, -3])).toEqual({ min: -3, max: -2 });
  });

  it('guards empty / non-finite input', () => {
    expect(extent([])).toEqual({ min: 0, max: 1 });
    expect(extent([Number.NaN])).toEqual({ min: 0, max: 1 });
    expect(extent([Number.POSITIVE_INFINITY])).toEqual({ min: 0, max: 1 });
  });

  it('ignores a stray non-finite value mixed into finite data', () => {
    // A bare Math.min/max would return NaN here and collapse the range.
    expect(extent([1, Number.NaN, 3])).toEqual({ min: 1, max: 3 });
    expect(extent([1, Number.POSITIVE_INFINITY, 3])).toEqual({ min: 1, max: 3 });
  });

  it('tolerates a reversed min/max override', () => {
    expect(extent([1, 2, 3], { min: 10, max: 0 })).toEqual({ min: 0, max: 10 });
  });
});

describe('toPoints', () => {
  const opts = { width: 100, height: 32 };

  it('spans the inner width and flips the y axis', () => {
    const pts = toPoints([0, 10], opts);
    const pad = 2;
    expect(pts[0].x).toBeCloseTo(pad, 5); // first point at left padding
    expect(pts[1].x).toBeCloseTo(opts.width - pad, 5); // last at right padding
    expect(pts[1].y).toBeCloseTo(pad, 5); // max value → top
    expect(pts[0].y).toBeCloseTo(opts.height - pad, 5); // min value → bottom
  });

  it('produces only finite coordinates for flat data (the divide-by-zero case)', () => {
    const pts = toPoints([0, 0, 0, 0], opts);
    expect(pts).toHaveLength(4);
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    // Flat data → every y on the same baseline.
    expect(new Set(pts.map((p) => p.y.toFixed(4))).size).toBe(1);
  });

  it('handles a single-element series without dividing by (length - 1 = 0)', () => {
    const pts = toPoints([5], opts);
    expect(pts).toHaveLength(1);
    expect(Number.isFinite(pts[0].x)).toBe(true);
    expect(Number.isFinite(pts[0].y)).toBe(true);
  });

  it('returns no points for an empty series', () => {
    expect(toPoints([], opts)).toEqual([]);
  });

  it('pins a non-finite point to a finite baseline coordinate', () => {
    const pts = toPoints([1, Number.NaN, 3], opts);
    expect(pts).toHaveLength(3);
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe('linePath', () => {
  it('is empty for no points', () => {
    expect(linePath([])).toBe('');
  });

  it('starts with a move and uses line-tos for the rest', () => {
    const d = linePath(toPoints([1, 2, 3, 4], { width: 100, height: 32 }));
    expect(d.startsWith('M')).toBe(true);
    expect((d.match(/L/g) ?? []).length).toBe(3);
    expect(d).not.toContain('NaN');
  });
});

describe('areaPath', () => {
  it('is empty for no points', () => {
    expect(areaPath([], 32)).toBe('');
  });

  it('closes the path down to the baseline', () => {
    const d = areaPath(toPoints([1, 5, 2], { width: 100, height: 32 }), 32);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
    expect(d).toContain('32.00'); // baseline (height) appears in the close
    expect(d).not.toContain('NaN');
  });
});
