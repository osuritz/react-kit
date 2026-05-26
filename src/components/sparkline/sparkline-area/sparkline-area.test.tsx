import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SparklineArea } from './sparkline-area';

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no <svg> rendered');
  return svg as unknown as SVGSVGElement;
}

describe('SparklineArea', () => {
  it('renders a filled area path plus a line path', () => {
    const { container } = render(<SparklineArea values={[1, 5, 2, 8, 4]} />);
    const paths = svgOf(container).querySelectorAll('path');
    expect(paths.length).toBe(2);
    // The area path is closed (ends with Z); the line path is not.
    const area = paths[0].getAttribute('d') ?? '';
    const line = paths[1].getAttribute('d') ?? '';
    expect(area.trimEnd().endsWith('Z')).toBe(true);
    expect(line.includes('Z')).toBe(false);
    expect(paths[0].getAttribute('fill')).toBe('currentColor');
    expect(paths[1].getAttribute('fill')).toBe('none');
  });

  it('sizes the viewBox from width/height props', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} width={120} height={40} />);
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 120 40');
  });

  it('exposes role=img and the aria-label when label is given', () => {
    const { getByRole } = render(
      <SparklineArea values={[1, 2, 3]} label="Traffic, last 12 weeks" />
    );
    expect(getByRole('img', { name: 'Traffic, last 12 weeks' })).toBeInTheDocument();
  });

  it('is decorative when no label is given', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} />);
    expect(svgOf(container).getAttribute('aria-hidden')).toBe('true');
  });

  it('produces no NaN coordinates for all-zero data', () => {
    const { container } = render(<SparklineArea values={[0, 0, 0, 0]} />);
    for (const p of svgOf(container).querySelectorAll('path')) {
      expect(p.getAttribute('d') ?? '').not.toContain('NaN');
    }
  });

  it('renders a last-point marker only when showLast is set', () => {
    const without = render(<SparklineArea values={[1, 2, 3]} />);
    expect(svgOf(without.container).querySelectorAll('circle').length).toBe(0);
    const withDot = render(<SparklineArea values={[1, 2, 3]} showLast />);
    expect(svgOf(withDot.container).querySelectorAll('circle').length).toBe(1);
  });

  it('merges a caller className onto the svg', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} className="text-chart-3" />);
    expect(svgOf(container).getAttribute('class')).toContain('text-chart-3');
  });

  it('renders only finite geometry for empty, single-element, and non-finite series', () => {
    for (const values of [[], [42], [1, NaN, 3], [5, Infinity, -Infinity, 2]]) {
      const { container } = render(<SparklineArea values={values} showLast />);
      expect(svgOf(container).innerHTML).not.toContain('NaN');
      expect(svgOf(container).innerHTML).not.toContain('Infinity');
    }
  });
});
