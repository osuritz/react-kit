import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HeatStrip } from './heat-strip';

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no <svg> rendered');
  return svg as unknown as SVGSVGElement;
}

describe('HeatStrip', () => {
  it('renders one cell per value', () => {
    const { container } = render(<HeatStrip values={[1, 4, 2, 8, 3, 6]} />);
    expect(svgOf(container).querySelectorAll('rect').length).toBe(6);
  });

  it('maps higher values to higher opacity', () => {
    const { container } = render(<HeatStrip values={[0, 10]} max={10} />);
    const rects = svgOf(container).querySelectorAll('rect');
    const lo = Number(rects[0].getAttribute('fill-opacity'));
    const hi = Number(rects[1].getAttribute('fill-opacity'));
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeCloseTo(1, 5);
  });

  it('sizes the viewBox and exposes the aria-label', () => {
    const { container, getByRole } = render(
      <HeatStrip values={[1, 2, 3]} width={120} height={16} label="Hourly load" />
    );
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 120 16');
    expect(getByRole('img', { name: 'Hourly load' })).toBeInTheDocument();
  });

  it('is decorative when no label is given', () => {
    const { container } = render(<HeatStrip values={[1, 2, 3]} />);
    expect(svgOf(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('produces no NaN opacity when max is zero', () => {
    const { container } = render(<HeatStrip values={[0, 0, 0]} max={0} />);
    for (const rect of svgOf(container).querySelectorAll('rect')) {
      expect(rect.getAttribute('fill-opacity') ?? '0').not.toContain('NaN');
    }
  });

  it('merges a caller className onto the svg', () => {
    const { container } = render(<HeatStrip values={[1, 2, 3]} className="text-emerald-600" />);
    expect(svgOf(container).getAttribute('class')).toContain('text-emerald-600');
  });

  it('renders only finite opacity for empty, single-element, and non-finite series', () => {
    for (const values of [[], [42], [1, NaN, 3], [5, Infinity, -Infinity, 2]]) {
      const { container } = render(<HeatStrip values={values} />);
      expect(svgOf(container).innerHTML).not.toContain('NaN');
      expect(svgOf(container).innerHTML).not.toContain('Infinity');
    }
  });
});
