/**
 * Accessibility contract for <SparklineBar>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SparklineBar } from "./sparkline-bar";

describe("a11y — SparklineBar", () => {
  it("is exposed as an image with the provided accessible name", () => {
    render(<SparklineBar values={[3, 7, 2, 9]} label="Daily signups, last 14 days" />);
    expect(
      screen.getByRole("img", { name: "Daily signups, last 14 days" }),
    ).toHaveAccessibleName("Daily signups, last 14 days");
  });

  it("backs the accessible name with an SVG <title> element", () => {
    const { container } = render(<SparklineBar values={[1, 2, 3]} label="Signups" />);
    expect(container.querySelector("svg > title")?.textContent).toBe("Signups");
  });

  it("is removed from the a11y tree (decorative) when no label is given", () => {
    const { container } = render(<SparklineBar values={[4, -3, 6]} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("treats a blank/whitespace label as decorative (no nameless image)", () => {
    const { container } = render(<SparklineBar values={[4, -3, 6]} label="   " />);
    expect(screen.queryByRole("img")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("aria-label");
  });
});
