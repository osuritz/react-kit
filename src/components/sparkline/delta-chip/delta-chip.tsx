// Peer requirements: react >=18, react-dom >=18, clsx >=2, tailwind-merge >=2.
// Not a chart — a tiny period-over-period change indicator (▲ +12% / ▼ −4%) that
// pairs with a sparkline or a metric in a KPI cell. Positive is success-toned
// (emerald), negative is `text-destructive`, no change is muted. Pass `invert`
// for metrics where down is good (latency, error rate, cost).
import { cn } from "./lib/cn";

export interface DeltaChipProps {
  /** The change. Sign (relative to `neutralAt`) drives direction + tone. */
  value: number;
  /**
   * Format the value shown after the arrow. Receives the raw `value`. When
   * omitted, the default shows the signed distance from `neutralAt`, rounded to
   * two decimals, so the displayed sign always matches the arrow.
   */
  format?: (n: number) => string;
  /** The value treated as "no change". */
  neutralAt?: number;
  /** Flip the tone so a decrease reads as good (latency, errors, cost). */
  invert?: boolean;
  /** Hide the ▲/▼ glyph (keep just the colored value). */
  showArrow?: boolean;
  /** Accessible label override; otherwise the visible text is used. */
  label?: string;
  className?: string;
}

const MINUS = "−"; // proper minus sign, not a hyphen

/** Trim float noise (0.1 + 0.2 → "0.3", not "0.30000000000000004"). */
function trimFloat(n: number): string {
  return String(Number(n.toFixed(2)));
}

export function DeltaChip({
  value,
  format,
  neutralAt = 0,
  invert = false,
  showArrow = true,
  label,
  className,
}: DeltaChipProps) {
  const finite = Number.isFinite(value);
  const dir = !finite ? 0 : value > neutralAt ? 1 : value < neutralAt ? -1 : 0;
  const good = invert ? dir < 0 : dir > 0;
  const tone =
    dir === 0
      ? "text-muted-foreground"
      : good
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-destructive";
  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "—";
  const sign = dir > 0 ? "+" : dir < 0 ? MINUS : "";
  const text = format
    ? format(value)
    : finite
      ? `${sign}${trimFloat(Math.abs(value - neutralAt))}`
      : "—";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        tone,
        className,
      )}
      aria-label={label}
    >
      {showArrow ? (
        <span aria-hidden="true" className="text-[0.85em] leading-none">
          {arrow}
        </span>
      ) : null}
      {text}
    </span>
  );
}
