/**
 * Accessibility contract for <HeatStrip>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeatStrip } from "./heat-strip";

describe("a11y — HeatStrip", () => {
  it("is exposed as an image with the provided accessible name", () => {
    render(<HeatStrip values={[1, 4, 2, 8]} label="Requests per hour, last 24h" />);
    expect(
      screen.getByRole("img", { name: "Requests per hour, last 24h" }),
    ).toHaveAccessibleName("Requests per hour, last 24h");
  });

  it("backs the accessible name with an SVG <title> element", () => {
    const { container } = render(<HeatStrip values={[1, 2, 3]} label="Usage density" />);
    expect(container.querySelector("svg > title")?.textContent).toBe("Usage density");
  });

  it("is removed from the a11y tree (decorative) when no label is given", () => {
    const { container } = render(<HeatStrip values={[1, 2, 3]} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("treats a blank/whitespace label as decorative (no nameless image)", () => {
    const { container } = render(<HeatStrip values={[1, 2, 3]} label="   " />);
    expect(screen.queryByRole("img")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("aria-label");
  });
});
