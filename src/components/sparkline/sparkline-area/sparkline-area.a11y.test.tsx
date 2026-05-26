/**
 * Accessibility contract for <SparklineArea>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern (labeled = role="img" + name;
 * unlabeled = decorative / aria-hidden).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SparklineArea } from './sparkline-area';

describe('a11y — SparklineArea', () => {
  it('is exposed as an image with the provided accessible name', () => {
    render(<SparklineArea values={[1, 5, 2, 8, 4]} label="Traffic, last 12 weeks" />);
    expect(screen.getByRole('img', { name: 'Traffic, last 12 weeks' })).toHaveAccessibleName(
      'Traffic, last 12 weeks'
    );
  });

  it('backs the accessible name with an SVG <title> element', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} label="Active users" />);
    expect(container.querySelector('svg > title')?.textContent).toBe('Active users');
  });

  it('is removed from the a11y tree (decorative) when no label is given', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} showLast />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('treats a blank/whitespace label as decorative (no nameless image)', () => {
    const { container } = render(<SparklineArea values={[1, 2, 3]} label="   " />);
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });
});
