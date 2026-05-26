/**
 * Accessibility contract for <SparklineThreshold>. See sparkline-line's a11y
 * test for the rationale behind the "img" pattern.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SparklineThreshold } from './sparkline-threshold';

describe('a11y — SparklineThreshold', () => {
  it('is exposed as an image with the provided accessible name', () => {
    render(
      <SparklineThreshold values={[1, 5, 2]} threshold={4} label="p95 latency vs 200ms SLO" />
    );
    expect(screen.getByRole('img', { name: 'p95 latency vs 200ms SLO' })).toHaveAccessibleName(
      'p95 latency vs 200ms SLO'
    );
  });

  it('backs the accessible name with an SVG <title> element', () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} threshold={2} label="Error rate" />
    );
    expect(container.querySelector('svg > title')?.textContent).toBe('Error rate');
  });

  it('is removed from the a11y tree (decorative) when no label is given', () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} threshold={2} band={[0, 2]} />
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('treats a blank/whitespace label as decorative (no nameless image)', () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} threshold={2} label="   " />
    );
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });
});
