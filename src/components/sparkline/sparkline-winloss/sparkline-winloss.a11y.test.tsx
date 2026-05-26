/**
 * Accessibility contract for <SparklineWinLoss>. See sparkline-line's a11y
 * test for the rationale behind the "img" pattern.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SparklineWinLoss } from './sparkline-winloss';

describe('a11y — SparklineWinLoss', () => {
  it('is exposed as an image with the provided accessible name', () => {
    render(<SparklineWinLoss values={[1, -1, 1]} label="SLA met or missed, last 20 days" />);
    expect(
      screen.getByRole('img', { name: 'SLA met or missed, last 20 days' })
    ).toHaveAccessibleName('SLA met or missed, last 20 days');
  });

  it('backs the accessible name with an SVG <title> element', () => {
    const { container } = render(<SparklineWinLoss values={[1, -1]} label="Build pass/fail" />);
    expect(container.querySelector('svg > title')?.textContent).toBe('Build pass/fail');
  });

  it('is removed from the a11y tree (decorative) when no label is given', () => {
    const { container } = render(<SparklineWinLoss values={[1, -1, 0]} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('treats a blank/whitespace label as decorative (no nameless image)', () => {
    const { container } = render(<SparklineWinLoss values={[1, -1, 0]} label="   " />);
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });
});
