# delta-chip

A drop-in **delta chip** — the tiny `▲ +12%` / `▼ −4%` change indicator that pairs
with a sparkline or a metric in a KPI cell. Not a chart: a single colored span.
Positive is success-toned (emerald), negative is `text-destructive`, no change is
muted. Pass `invert` for metrics where *down* is good (latency, error rate, cost).
Copy the folder into your app.

> Part of the sparkline micro-chart family — the companion that labels the
> direction of the trend a sparkline shows.

## What to copy

Copy into your project (e.g. `src/components/delta-chip/`):

- `delta-chip.tsx` — `<DeltaChip>` + `DeltaChipProps`
- `lib/cn.ts` — local class-name composer
- *(optional)* this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`delta-chip.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2, plus the
`text-destructive` token on `:root`.

## Usage

```tsx
import { DeltaChip } from "./components/delta-chip/delta-chip";

// Revenue up 7.2% — green, up arrow.
<DeltaChip value={7.2} format={(n) => `${n > 0 ? "+" : "−"}${Math.abs(n)}%`} />

// p95 latency up 18% — but up is bad here, so invert → red.
<DeltaChip value={18} invert format={(n) => `+${n}%`} label="latency up 18%" />
```

## API

### `<DeltaChip>`

| Prop        | Type                   | Default        | Notes                                            |
| ----------- | ---------------------- | -------------- | ------------------------------------------------ |
| `value`     | `number`               | —              | The change; its sign (vs `neutralAt`) drives direction + tone. Non-finite → neutral `—`. |
| `format`    | `(n: number) => string`| _(see note)_   | Format the text after the arrow. **Default:** signed distance from `neutralAt`, rounded to 2 dp, so the sign always matches the arrow. |
| `neutralAt` | `number`               | `0`            | The value treated as "no change".                |
| `invert`    | `boolean`              | `false`        | Down reads as good (latency, errors, cost).      |
| `showArrow` | `boolean`              | `true`         | Hide the ▲/▼ glyph if false.                     |
| `label`     | `string`               | —              | Accessible label override (else visible text).   |
| `className` | `string`               | —              | Merged via `cn()`.                               |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
