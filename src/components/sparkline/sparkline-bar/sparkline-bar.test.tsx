import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SparklineBar } from "./sparkline-bar";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as unknown as SVGSVGElement;
}

describe("SparklineBar", () => {
  it("renders one rect per value", () => {
    const { container } = render(<SparklineBar values={[3, 7, 2, 9, 5, 4]} />);
    expect(svgOf(container).querySelectorAll("rect").length).toBe(6);
  });

  it("sizes the viewBox from width/height props", () => {
    const { container } = render(
      <SparklineBar values={[1, 2, 3]} width={120} height={40} />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 120 40");
  });

  it("exposes role=img and the aria-label when label is given", () => {
    const { getByRole } = render(
      <SparklineBar values={[1, 2, 3]} label="Daily signups" />,
    );
    expect(getByRole("img", { name: "Daily signups" })).toBeInTheDocument();
  });

  it("is decorative when no label is given", () => {
    const { container } = render(<SparklineBar values={[1, 2, 3]} />);
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("colors bars below the baseline as destructive", () => {
    const { container } = render(<SparklineBar values={[4, -3, 6]} baseline={0} />);
    const rects = svgOf(container).querySelectorAll("rect");
    expect(rects[0].getAttribute("class") ?? "").not.toContain("text-destructive");
    expect(rects[1].getAttribute("class") ?? "").toContain("text-destructive");
    expect(rects[2].getAttribute("class") ?? "").not.toContain("text-destructive");
  });

  it("produces no NaN geometry for all-zero data", () => {
    const { container } = render(<SparklineBar values={[0, 0, 0, 0]} />);
    for (const rect of svgOf(container).querySelectorAll("rect")) {
      for (const attr of ["x", "y", "width", "height"]) {
        expect(rect.getAttribute(attr) ?? "0").not.toContain("NaN");
      }
    }
  });

  it("merges a caller className onto the svg", () => {
    const { container } = render(
      <SparklineBar values={[1, 2, 3]} className="text-chart-4" />,
    );
    expect(svgOf(container).getAttribute("class")).toContain("text-chart-4");
  });

  it("renders only finite geometry for empty, single-element, and non-finite series", () => {
    for (const values of [[], [42], [1, NaN, 3], [5, Infinity, -Infinity, 2]]) {
      const { container } = render(<SparklineBar values={values} />);
      expect(svgOf(container).innerHTML).not.toContain("NaN");
      expect(svgOf(container).innerHTML).not.toContain("Infinity");
    }
  });
});
