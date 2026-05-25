import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SparklineLine } from "./sparkline-line";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as unknown as SVGSVGElement;
}

describe("SparklineLine", () => {
  it("renders a polyline path from the values", () => {
    const { container } = render(<SparklineLine values={[1, 5, 2, 8, 4]} />);
    const path = svgOf(container).querySelector("path");
    expect(path).not.toBeNull();
    const d = path!.getAttribute("d") ?? "";
    // One move + four line segments for five points.
    expect(d.startsWith("M")).toBe(true);
    expect((d.match(/L/g) ?? []).length).toBe(4);
  });

  it("sizes the viewBox from width/height props", () => {
    const { container } = render(
      <SparklineLine values={[1, 2, 3]} width={120} height={40} />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 120 40");
  });

  it("exposes role=img and the aria-label when label is given", () => {
    const { getByRole } = render(
      <SparklineLine values={[1, 2, 3]} label="Revenue, last 12 weeks" />,
    );
    expect(getByRole("img", { name: "Revenue, last 12 weeks" })).toBeInTheDocument();
  });

  it("is decorative (aria-hidden, no role) when no label is given", () => {
    const { container } = render(<SparklineLine values={[1, 2, 3]} />);
    const svg = svgOf(container);
    expect(svg.getAttribute("role")).toBeNull();
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("produces no NaN coordinates for all-zero data (divide-by-zero guard)", () => {
    const { container } = render(<SparklineLine values={[0, 0, 0, 0]} />);
    const d = svgOf(container).querySelector("path")!.getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
    expect(d.length).toBeGreaterThan(0);
  });

  it("renders a last-point marker only when showLast is set", () => {
    const without = render(<SparklineLine values={[1, 2, 3]} />);
    expect(svgOf(without.container).querySelectorAll("circle").length).toBe(0);

    const withDot = render(<SparklineLine values={[1, 2, 3]} showLast />);
    expect(svgOf(withDot.container).querySelectorAll("circle").length).toBe(1);
  });

  it("merges a caller className onto the svg", () => {
    const { container } = render(
      <SparklineLine values={[1, 2, 3]} className="text-chart-2" />,
    );
    expect(svgOf(container).getAttribute("class")).toContain("text-chart-2");
  });

  it("renders only finite geometry for empty, single-element, and non-finite series", () => {
    for (const values of [[], [42], [1, NaN, 3], [5, Infinity, -Infinity, 2]]) {
      const { container } = render(<SparklineLine values={values} showLast showExtremes />);
      const svg = svgOf(container);
      expect(svg.innerHTML).not.toContain("NaN");
      expect(svg.innerHTML).not.toContain("Infinity");
    }
  });
});
