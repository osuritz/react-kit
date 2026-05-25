import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GaugeRing } from "./gauge-ring";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as unknown as SVGSVGElement;
}

describe("GaugeRing", () => {
  it("renders a track ring and a value arc", () => {
    const { container } = render(<GaugeRing value={50} />);
    const svg = svgOf(container);
    expect(svg.querySelector("circle[data-part='track']")).not.toBeNull();
    expect(svg.querySelector("circle[data-part='value']")).not.toBeNull();
  });

  it("expresses the fraction via a pathLength=100 dash array", () => {
    const { container } = render(<GaugeRing value={50} max={100} />);
    const arc = svgOf(container).querySelector("circle[data-part='value']")!;
    expect(arc.getAttribute("pathLength")).toBe("100");
    expect(arc.getAttribute("stroke-dasharray")).toBe("50.00 100");
  });

  it("clamps values above max to a full ring", () => {
    const { container } = render(<GaugeRing value={140} max={100} />);
    const arc = svgOf(container).querySelector("circle[data-part='value']")!;
    expect(arc.getAttribute("stroke-dasharray")).toBe("100.00 100");
  });

  it("renders a centerLabel as svg text when provided", () => {
    const { container } = render(<GaugeRing value={72} centerLabel="72%" />);
    const text = svgOf(container).querySelector("text");
    expect(text).not.toBeNull();
    expect(text!.textContent).toBe("72%");
  });

  it("uses a square viewBox from size and exposes the aria-label", () => {
    const { container, getByRole } = render(
      <GaugeRing value={72} size={56} label="Storage quota" />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 56 56");
    expect(getByRole("img", { name: "Storage quota" })).toBeInTheDocument();
  });

  it("is decorative when no label is given", () => {
    const { container } = render(<GaugeRing value={72} />);
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("produces no NaN dash array when max is zero", () => {
    const { container } = render(<GaugeRing value={0} max={0} />);
    const arc = svgOf(container).querySelector("circle[data-part='value']")!;
    expect(arc.getAttribute("stroke-dasharray") ?? "").not.toContain("NaN");
  });

  it("produces a finite dash array for a non-finite value", () => {
    for (const value of [NaN, Infinity]) {
      const { container } = render(<GaugeRing value={value} max={100} />);
      const arc = svgOf(container).querySelector("circle[data-part='value']")!;
      const dash = arc.getAttribute("stroke-dasharray") ?? "";
      expect(dash).not.toContain("NaN");
      expect(dash).not.toContain("Infinity");
    }
  });

  it("never renders a negative radius when thickness exceeds size", () => {
    const { container } = render(<GaugeRing value={50} size={48} thickness={80} />);
    for (const circle of svgOf(container).querySelectorAll("circle")) {
      expect(Number(circle.getAttribute("r"))).toBeGreaterThanOrEqual(0);
    }
  });
});
