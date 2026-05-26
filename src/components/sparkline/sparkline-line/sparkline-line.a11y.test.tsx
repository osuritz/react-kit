/**
 * Accessibility contract for <SparklineLine>.
 *
 * The static SVG sparklines follow the WAI-ARIA "img" pattern: a chart that
 * carries information on its own is exposed as role="img" with a computed
 * accessible name (backed by an SVG <title>); a chart that merely echoes a
 * number already in the DOM is decorative and removed from the accessibility
 * tree (aria-hidden) so a screen reader doesn't announce a nameless graphic.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SparklineLine } from './sparkline-line';

describe('a11y — SparklineLine', () => {
  it('is exposed as an image with the provided accessible name', () => {
    render(<SparklineLine values={[1, 5, 2, 8, 4]} label="Revenue, last 12 weeks" />);
    const img = screen.getByRole('img', { name: 'Revenue, last 12 weeks' });
    expect(img).toHaveAccessibleName('Revenue, last 12 weeks');
  });

  it('backs the accessible name with an SVG <title> element', () => {
    const { container } = render(<SparklineLine values={[1, 2, 3]} label="Quarterly revenue" />);
    const title = container.querySelector('svg > title');
    expect(title?.textContent).toBe('Quarterly revenue');
  });

  it('is removed from the a11y tree (decorative) when no label is given', () => {
    const { container } = render(<SparklineLine values={[1, 2, 3]} showLast />);
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg.querySelector('title')).toBeNull();
  });

  it('treats a blank/whitespace label as decorative (no nameless image)', () => {
    const { container } = render(<SparklineLine values={[1, 2, 3]} label="   " />);
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });
});
