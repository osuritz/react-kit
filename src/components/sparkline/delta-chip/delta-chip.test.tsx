import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DeltaChip } from "./delta-chip";

function chipOf(container: HTMLElement): HTMLElement {
  const el = container.firstElementChild as HTMLElement | null;
  if (!el) throw new Error("nothing rendered");
  return el;
}

describe("DeltaChip", () => {
  it("shows an up arrow and a signed value when positive", () => {
    const { container } = render(<DeltaChip value={12} />);
    const chip = chipOf(container);
    expect(chip.textContent).toContain("▲");
    expect(chip.textContent).toContain("+12");
  });

  it("shows a down arrow and a real minus sign when negative", () => {
    const { container } = render(<DeltaChip value={-4} />);
    const chip = chipOf(container);
    expect(chip.textContent).toContain("▼");
    expect(chip.textContent).toContain("−4"); // −4
  });

  it("tones positive as success and negative as destructive by default", () => {
    const up = chipOf(render(<DeltaChip value={5} />).container);
    const down = chipOf(render(<DeltaChip value={-5} />).container);
    expect(up.getAttribute("class") ?? "").toContain("text-emerald");
    expect(down.getAttribute("class") ?? "").toContain("text-destructive");
  });

  it("inverts the tone when invert is set (down is good)", () => {
    const up = chipOf(render(<DeltaChip value={5} invert />).container);
    const down = chipOf(render(<DeltaChip value={-5} invert />).container);
    expect(up.getAttribute("class") ?? "").toContain("text-destructive");
    expect(down.getAttribute("class") ?? "").toContain("text-emerald");
  });

  it("renders a neutral chip at the neutral point", () => {
    const chip = chipOf(render(<DeltaChip value={0} />).container);
    expect(chip.getAttribute("class") ?? "").toContain("text-muted-foreground");
  });

  it("applies a custom format function to the magnitude", () => {
    const { container } = render(
      <DeltaChip value={35} format={(n) => `${n} bps`} />,
    );
    expect(chipOf(container).textContent).toContain("35 bps");
  });

  it("marks the arrow glyph as decorative", () => {
    const { container } = render(<DeltaChip value={12} />);
    const arrow = chipOf(container).querySelector("[aria-hidden='true']");
    expect(arrow).not.toBeNull();
  });

  it("merges a caller className", () => {
    const { container } = render(<DeltaChip value={12} className="text-base" />);
    expect(chipOf(container).getAttribute("class") ?? "").toContain("text-base");
  });

  it("rounds the default format so floating-point noise doesn't leak", () => {
    const { container } = render(<DeltaChip value={0.1 + 0.2} />);
    const text = chipOf(container).textContent ?? "";
    expect(text).toContain("0.3");
    expect(text).not.toContain("0.30000");
  });

  it("shows no literal NaN/Infinity for non-finite values", () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      const { container } = render(<DeltaChip value={value} />);
      const text = chipOf(container).textContent ?? "";
      expect(text).not.toContain("NaN");
      expect(text).not.toContain("Infinity");
    }
  });

  it("keeps the default sign consistent with the arrow relative to neutralAt", () => {
    // value 3 is below neutralAt 10 → direction is DOWN, so both the arrow and
    // the displayed sign must read as a decrease (distance from neutral = 7).
    const { container } = render(<DeltaChip value={3} neutralAt={10} />);
    const chip = chipOf(container);
    expect(chip.getAttribute("class") ?? "").toContain("text-destructive");
    expect(chip.querySelector("[aria-hidden='true']")?.textContent).toBe("▼");
    expect(chip.textContent).toContain("−7"); // − is U+2212
  });
});
