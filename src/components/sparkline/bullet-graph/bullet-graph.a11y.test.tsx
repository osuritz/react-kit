/**
 * Accessibility contract for <BulletGraph>. See sparkline-line's a11y test
 * for the rationale behind the "img" pattern.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BulletGraph } from "./bullet-graph";

describe("a11y — BulletGraph", () => {
  it("is exposed as an image with the provided accessible name", () => {
    render(
      <BulletGraph
        value={7.2}
        target={8}
        ranges={[5, 7]}
        max={10}
        label="Q2 bookings $7.2M of $8M target"
      />,
    );
    expect(
      screen.getByRole("img", { name: "Q2 bookings $7.2M of $8M target" }),
    ).toHaveAccessibleName("Q2 bookings $7.2M of $8M target");
  });

  it("backs the accessible name with an SVG <title> element", () => {
    const { container } = render(
      <BulletGraph value={7} target={8} ranges={[5]} max={10} label="Bookings" />,
    );
    expect(container.querySelector("svg > title")?.textContent).toBe("Bookings");
  });

  it("is removed from the a11y tree (decorative) when no label is given", () => {
    const { container } = render(
      <BulletGraph value={7} target={8} ranges={[5, 7]} max={10} />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("treats a blank/whitespace label as decorative (no nameless image)", () => {
    const { container } = render(
      <BulletGraph value={7} target={8} ranges={[5, 7]} max={10} label="   " />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("aria-label");
  });
});
