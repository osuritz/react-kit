/**
 * Accessibility contract for <GaugeRing>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern. Note the visible `centerLabel`
 * text is presentational — the accessible name comes from `label`.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GaugeRing } from "./gauge-ring";

describe("a11y — GaugeRing", () => {
  it("is exposed as an image with the provided accessible name", () => {
    render(<GaugeRing value={72} centerLabel="72%" label="Storage: 72% of quota used" />);
    expect(
      screen.getByRole("img", { name: "Storage: 72% of quota used" }),
    ).toHaveAccessibleName("Storage: 72% of quota used");
  });

  it("backs the accessible name with an SVG <title> element", () => {
    const { container } = render(<GaugeRing value={72} label="Quota used" />);
    expect(container.querySelector("svg > title")?.textContent).toBe("Quota used");
  });

  it("is removed from the a11y tree (decorative) when no label is given", () => {
    const { container } = render(<GaugeRing value={72} centerLabel="72%" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("treats a blank/whitespace label as decorative (no nameless image)", () => {
    const { container } = render(<GaugeRing value={72} centerLabel="72%" label="   " />);
    expect(screen.queryByRole("img")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("aria-label");
  });
});
