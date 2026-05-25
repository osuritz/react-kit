import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SparklineThreshold } from "./sparkline-threshold";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as unknown as SVGSVGElement;
}

describe("SparklineThreshold", () => {
  it("renders the value line", () => {
    const { container } = render(
      <SparklineThreshold values={[1, 5, 2, 8, 4]} />,
    );
    const line = svgOf(container).querySelector("path[data-part='line']");
    expect(line).not.toBeNull();
    expect((line!.getAttribute("d") ?? "").startsWith("M")).toBe(true);
  });

  it("draws a dashed limit line when threshold is set", () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} threshold={2} />,
    );
    const limit = svgOf(container).querySelector("line[data-part='threshold']");
    expect(limit).not.toBeNull();
    expect(limit!.getAttribute("stroke-dasharray")).not.toBeNull();
  });

  it("draws a shaded band when band is set", () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} band={[1, 2]} />,
    );
    expect(svgOf(container).querySelector("rect[data-part='band']")).not.toBeNull();
  });

  it("marks points that breach the threshold as destructive", () => {
    const { container } = render(
      <SparklineThreshold values={[3, 7, 4, 9]} threshold={5} />,
    );
    const breaches = svgOf(container).querySelectorAll("circle.text-destructive");
    expect(breaches.length).toBe(2); // 7 and 9 exceed 5
  });

  it("sizes the viewBox and exposes the aria-label", () => {
    const { container, getByRole } = render(
      <SparklineThreshold values={[1, 2, 3]} width={120} height={40} label="p95 latency" />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 120 40");
    expect(getByRole("img", { name: "p95 latency" })).toBeInTheDocument();
  });

  it("is decorative when no label is given", () => {
    const { container } = render(<SparklineThreshold values={[1, 2, 3]} />);
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("produces no NaN coordinates for all-zero data", () => {
    const { container } = render(<SparklineThreshold values={[0, 0, 0]} threshold={0} />);
    const d = svgOf(container).querySelector("path[data-part='line']")!.getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
  });

  it("merges a caller className onto the svg", () => {
    const { container } = render(
      <SparklineThreshold values={[1, 2, 3]} className="text-chart-5" />,
    );
    expect(svgOf(container).getAttribute("class")).toContain("text-chart-5");
  });

  it("renders only finite geometry for empty, single-element, and non-finite series", () => {
    for (const values of [[], [42], [1, NaN, 3], [5, Infinity, -Infinity, 2]]) {
      const { container } = render(
        <SparklineThreshold values={values} threshold={50} band={[10, 40]} showLast />,
      );
      expect(svgOf(container).innerHTML).not.toContain("NaN");
      expect(svgOf(container).innerHTML).not.toContain("Infinity");
    }
  });

  it("normalizes a reversed band instead of flagging every point", () => {
    // band={[40,10]} (hi,lo) must behave like [10,40], not mark all breaches.
    const reversed = render(
      <SparklineThreshold values={[5, 25, 60]} band={[40, 10]} />,
    );
    const ascending = render(
      <SparklineThreshold values={[5, 25, 60]} band={[10, 40]} />,
    );
    const countBreaches = (c: HTMLElement) =>
      svgOf(c).querySelectorAll("circle.text-destructive").length;
    expect(countBreaches(reversed.container)).toBe(countBreaches(ascending.container));
    expect(countBreaches(ascending.container)).toBe(2); // 5 and 60 are outside [10,40]
  });
});
