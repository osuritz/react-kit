# sparkline-threshold

A drop-in **threshold sparkline** — a trend line with an optional shaded
"acceptable" band and/or a dashed limit line, for monitoring a metric against a
target (p95 latency vs an SLO, error rate vs a budget, queue depth vs a cap).
Points that breach the limit or fall outside the band are marked with the
shadcn `text-destructive` token. Pure SVG — copy the folder into your app.

> Part of the sparkline micro-chart family. Reuses `lib/scale.ts`; the domain is
> widened to include the band/limit so reference lines stay on-canvas.

## What to copy

Copy into your project (e.g. `src/components/sparkline-threshold/`):

- `sparkline-threshold.tsx` — `<SparklineThreshold>` + `SparklineThresholdProps`
- `lib/scale.ts` — pure scaling helpers (shared across series sparklines)
- `lib/cn.ts` — local class-name composer
- *(optional)* this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`sparkline-threshold.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2, plus the
`text-destructive` token on `:root` for breach markers.

## Usage

```tsx
import { SparklineThreshold } from "./components/sparkline-threshold/sparkline-threshold";

// p95 latency (ms) against a 200ms SLO with a 0–150ms healthy band.
<div className="text-sky-600">
  <SparklineThreshold
    values={[120, 135, 110, 180, 240, 160, 90, 210]}
    threshold={200}
    band={[0, 150]}
    showLast
    label="p95 latency vs 200ms SLO, last 8 intervals"
  />
</div>
```

## API

### `<SparklineThreshold>`

| Prop          | Type                 | Default | Notes                                              |
| ------------- | -------------------- | ------- | -------------------------------------------------- |
| `values`      | `number[]`           | —       | The series, oldest → newest.                       |
| `width`       | `number`             | `100`   |                                                    |
| `height`      | `number`             | `32`    |                                                    |
| `min` / `max` | `number`             | data    | Pin the scale (band/limit are always included).    |
| `threshold`   | `number`             | —       | Dashed limit line; values **above** it breach.     |
| `band`        | `[number, number]`   | —       | Shaded acceptable range; values **outside** breach.|
| `showLast`    | `boolean`            | `false` | Dot on the most recent point.                      |
| `strokeWidth` | `number`             | `1.5`   |                                                    |
| `label`       | `string`             | —       | Accessible name; sets `role="img"` + `<title>`.   |
| `className`   | `string`             | —       | Merged onto the svg via `cn()`.                    |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
