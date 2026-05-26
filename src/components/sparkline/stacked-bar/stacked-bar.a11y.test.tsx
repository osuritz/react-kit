/**
 * Accessibility contract for <StackedBar>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StackedBar } from './stacked-bar';

describe('a11y — StackedBar', () => {
  it('is exposed as an image with the provided accessible name', () => {
    render(
      <StackedBar
        segments={[{ value: 412 }, { value: 18 }, { value: 7 }]}
        label="412 passed, 18 failed, 7 skipped"
      />
    );
    expect(
      screen.getByRole('img', { name: '412 passed, 18 failed, 7 skipped' })
    ).toHaveAccessibleName('412 passed, 18 failed, 7 skipped');
  });

  it('backs the accessible name with an SVG <title> element', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 1 }, { value: 2 }]} label="Budget split" />
    );
    expect(container.querySelector('svg > title')?.textContent).toBe('Budget split');
  });

  it('is removed from the a11y tree (decorative) when no label is given', () => {
    const { container } = render(<StackedBar segments={[{ value: 1 }, { value: 2 }]} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('treats a blank/whitespace label as decorative (no nameless image)', () => {
    const { container } = render(
      <StackedBar segments={[{ value: 1 }, { value: 2 }]} label="   " />
    );
    expect(screen.queryByRole('img')).toBeNull();
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });
});
