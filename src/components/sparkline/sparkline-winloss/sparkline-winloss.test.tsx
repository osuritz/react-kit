import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SparklineWinLoss } from "./sparkline-winloss";

function svgOf(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no <svg> rendered");
  return svg as unknown as SVGSVGElement;
}

describe("SparklineWinLoss", () => {
  it("renders one rect per value", () => {
    const { container } = render(
      <SparklineWinLoss values={[1, -1, 1, 1, -1, 0]} />,
    );
    expect(svgOf(container).querySelectorAll("rect").length).toBe(6);
  });

  it("sizes the viewBox from width/height props", () => {
    const { container } = render(
      <SparklineWinLoss values={[1, -1, 1]} width={120} height={40} />,
    );
    expect(svgOf(container).getAttribute("viewBox")).toBe("0 0 120 40");
  });

  it("exposes role=img and the aria-label when label is given", () => {
    const { getByRole } = render(
      <SparklineWinLoss values={[1, -1, 1]} label="SLA met/missed" />,
    );
    expect(getByRole("img", { name: "SLA met/missed" })).toBeInTheDocument();
  });

  it("is decorative when no label is given", () => {
    const { container } = render(<SparklineWinLoss values={[1, -1]} />);
    expect(svgOf(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("tints losses with the destructive token and leaves wins alone", () => {
    const { container } = render(<SparklineWinLoss values={[1, -1, 1]} />);
    const rects = svgOf(container).querySelectorAll("rect");
    expect(rects[0].getAttribute("class") ?? "").not.toContain("text-destructive");
    expect(rects[1].getAttribute("class") ?? "").toContain("text-destructive");
    expect(rects[2].getAttribute("class") ?? "").not.toContain("text-destructive");
  });

  it("places wins above and losses below the midline", () => {
    const { container } = render(<SparklineWinLoss values={[1, -1]} height={40} />);
    const rects = svgOf(container).querySelectorAll("rect");
    const win = Number(rects[0].getAttribute("y"));
    const loss = Number(rects[1].getAttribute("y"));
    expect(win).toBeLessThan(20); // win starts above the midline (y < height/2)
    expect(loss).toBeGreaterThanOrEqual(20); // loss starts at/below the midline
  });

  it("merges a caller className onto the svg", () => {
    const { container } = render(
      <SparklineWinLoss values={[1, -1]} className="text-emerald-600" />,
    );
    expect(svgOf(container).getAttribute("class")).toContain("text-emerald-600");
  });

  it("renders only finite geometry for empty, single-element, and non-finite series", () => {
    for (const values of [[], [1], [1, NaN, -1], [Infinity, -Infinity, 0]]) {
      const { container } = render(<SparklineWinLoss values={values} />);
      expect(svgOf(container).innerHTML).not.toContain("NaN");
      expect(svgOf(container).innerHTML).not.toContain("Infinity");
    }
  });
});
