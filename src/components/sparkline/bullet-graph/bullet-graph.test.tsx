import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BulletGraph } from './bullet-graph';

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no <svg> rendered');
  return svg as unknown as SVGSVGElement;
}

describe('BulletGraph', () => {
  it('renders one qualitative band per range segment (ranges.length + 1)', () => {
    const { container } = render(<BulletGraph value={7.2} target={8} ranges={[5, 7]} max={10} />);
    expect(svgOf(container).querySelectorAll("rect[data-part='range']").length).toBe(3);
  });

  it('renders the measure bar and the target marker', () => {
    const { container } = render(<BulletGraph value={7.2} target={8} ranges={[5, 7]} max={10} />);
    const svg = svgOf(container);
    expect(svg.querySelector("rect[data-part='measure']")).not.toBeNull();
    expect(svg.querySelector("[data-part='target']")).not.toBeNull();
  });

  it('scales the measure bar width to value/max', () => {
    const { container } = render(
      <BulletGraph value={5} target={8} ranges={[5, 7]} max={10} width={200} />
    );
    const measure = svgOf(container).querySelector("rect[data-part='measure']")!;
    // value 5 of max 10 → half the width.
    expect(Number(measure.getAttribute('width'))).toBeCloseTo(100, 0);
  });

  it('sizes the viewBox and exposes the aria-label', () => {
    const { container, getByRole } = render(
      <BulletGraph
        value={7.2}
        target={8}
        ranges={[5, 7]}
        max={10}
        width={180}
        height={24}
        label="Q2 bookings vs target"
      />
    );
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 180 24');
    expect(getByRole('img', { name: 'Q2 bookings vs target' })).toBeInTheDocument();
  });

  it('is decorative when no label is given', () => {
    const { container } = render(<BulletGraph value={7.2} target={8} ranges={[5, 7]} max={10} />);
    expect(svgOf(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('produces no NaN geometry when everything is zero', () => {
    const { container } = render(<BulletGraph value={0} target={0} ranges={[]} max={0} />);
    for (const rect of svgOf(container).querySelectorAll('rect')) {
      for (const attr of ['x', 'y', 'width', 'height']) {
        expect(rect.getAttribute(attr) ?? '0').not.toContain('NaN');
      }
    }
  });

  it('merges a caller className onto the svg', () => {
    const { container } = render(
      <BulletGraph value={7} target={8} ranges={[5]} max={10} className="text-chart-1" />
    );
    expect(svgOf(container).getAttribute('class')).toContain('text-chart-1');
  });

  it('clamps the measure bar to full width when value exceeds max', () => {
    const { container } = render(
      <BulletGraph value={20} target={8} ranges={[5, 7]} max={10} width={200} />
    );
    const measure = svgOf(container).querySelector("rect[data-part='measure']")!;
    expect(Number(measure.getAttribute('width'))).toBeCloseTo(200, 0);
    expect(measure.getAttribute('width') ?? '').not.toContain('NaN');
  });

  it('renders only finite geometry for non-finite value/target', () => {
    const { container } = render(
      <BulletGraph value={NaN} target={Infinity} ranges={[5, 7]} max={10} />
    );
    const html = svgOf(container).innerHTML;
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });
});
