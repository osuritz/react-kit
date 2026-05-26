/**
 * Accessibility contract for <DeltaChip>.
 *
 * Unlike the SVG charts, the chip is text. Its directional ▲/▼ glyph is
 * decorative (aria-hidden) so a screen reader doesn't read "up-pointing
 * triangle"; the accessible name is either the explicit `label` or, failing
 * that, the visible numeric text on its own.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeltaChip } from './delta-chip';

function chipOf(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe('a11y — DeltaChip', () => {
  it('uses the explicit label as its accessible name', () => {
    const { container } = render(<DeltaChip value={12} label="Revenue up 12%" />);
    expect(chipOf(container)).toHaveAccessibleName('Revenue up 12%');
  });

  it('keeps the number as readable text and hides the arrow when unlabeled', () => {
    const { container } = render(<DeltaChip value={12} />);
    const chip = chipOf(container);
    // No aria-label override — the chip is read as flow text next to its metric.
    expect(chip.getAttribute('aria-label')).toBeNull();
    const arrow = chip.querySelector("[aria-hidden='true']");
    expect(arrow?.textContent).toBe('▲');
    // What a screen reader reads (decorative arrow stripped) is just the number.
    const readable = chip.textContent?.replace(arrow?.textContent ?? '', '').trim();
    expect(readable).toBe('+12');
  });

  it('marks the directional glyph aria-hidden for a decrease too', () => {
    const { container } = render(<DeltaChip value={-4} />);
    const arrow = chipOf(container).querySelector("[aria-hidden='true']");
    expect(arrow?.textContent).toBe('▼');
  });
});
