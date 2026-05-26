import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { StackedBar } from './stacked-bar';

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no <svg> rendered');
  return svg as unknown as SVGSVGElement;
}

describe('StackedBar', () => {
  it('renders one rect per segment', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 1 }, { value: 1 }, { value: 2 }]} />
    );
    expect(svgOf(container).querySelectorAll('rect').length).toBe(3);
  });

  it('sizes segment widths in proportion to the whole', () => {
    const { container } = render(
      <StackedBar width={200} gap={0} segments={[{ value: 1 }, { value: 1 }, { value: 2 }]} />
    );
    const rects = svgOf(container).querySelectorAll('rect');
    expect(Number(rects[0].getAttribute('width'))).toBeCloseTo(50, 0);
    expect(Number(rects[1].getAttribute('width'))).toBeCloseTo(50, 0);
    expect(Number(rects[2].getAttribute('width'))).toBeCloseTo(100, 0);
  });

  it('cycles the chart tokens by default and honors an explicit color', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 1 }, { value: 1, color: 'var(--destructive)' }]} />
    );
    const rects = svgOf(container).querySelectorAll('rect');
    expect(rects[0].getAttribute('fill')).toBe('var(--color-chart-1)');
    expect(rects[1].getAttribute('fill')).toBe('var(--destructive)');
  });

  it('sizes the viewBox and exposes the aria-label', () => {
    const { container, getByRole } = render(
      <StackedBar
        width={180}
        height={12}
        label="Test results"
        segments={[{ value: 1 }, { value: 1 }]}
      />
    );
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 180 12');
    expect(getByRole('img', { name: 'Test results' })).toBeInTheDocument();
  });

  it('is decorative when no label is given', () => {
    const { container } = render(<StackedBar segments={[{ value: 1 }]} />);
    expect(svgOf(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('produces no NaN geometry when the total is zero', () => {
    const { container } = render(<StackedBar segments={[{ value: 0 }, { value: 0 }]} />);
    for (const rect of svgOf(container).querySelectorAll('rect')) {
      expect(rect.getAttribute('width') ?? '0').not.toContain('NaN');
    }
  });

  it('merges a caller className onto the svg', () => {
    const { container } = render(<StackedBar segments={[{ value: 1 }]} className="rounded-full" />);
    expect(svgOf(container).getAttribute('class')).toContain('rounded-full');
  });

  it('renders only finite geometry for empty and single-segment input', () => {
    for (const segments of [[], [{ value: 7 }]]) {
      const { container } = render(<StackedBar segments={segments} />);
      expect(svgOf(container).innerHTML).not.toContain('NaN');
    }
  });

  it('ignores a non-finite/negative segment instead of blanking the whole bar', () => {
    const { container } = render(
      <StackedBar
        width={200}
        gap={0}
        segments={[{ value: 1 }, { value: NaN }, { value: -5 }, { value: 1 }]}
      />
    );
    const rects = svgOf(container).querySelectorAll('rect');
    // The two good segments split the width 50/50; the bad ones contribute 0.
    expect(Number(rects[0].getAttribute('width'))).toBeCloseTo(100, 0);
    expect(Number(rects[1].getAttribute('width'))).toBe(0);
    expect(Number(rects[2].getAttribute('width'))).toBe(0);
    expect(Number(rects[3].getAttribute('width'))).toBeCloseTo(100, 0);
    expect(svgOf(container).innerHTML).not.toContain('NaN');
  });
});
