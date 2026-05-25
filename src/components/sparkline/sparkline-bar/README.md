# sparkline-bar

A drop-in **bar (column) sparkline** for discrete per-period values — daily
signups, monthly bookings, per-build counts. Bars at/above the `baseline` use
`currentColor`; bars below it are tinted with the shadcn `text-destructive`
token, so a series that swings negative reads at a glance. Pure presentational
SVG. No npm package, no build step — copy the folder into your app.

> Part of the sparkline micro-chart family. Reuses `lib/scale.ts`'s `extent`
> guard so empty/flat data never yields `NaN` geometry.

## What to copy

Copy into your project (e.g. `src/components/sparkline-bar/`):

- `sparkline-bar.tsx` — `<SparklineBar>` + `SparklineBarProps`
- `lib/scale.ts` — pure scaling helpers (shared across series sparklines)
- `lib/cn.ts` — local class-name composer
- *(optional)* this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`sparkline-bar.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2. The
`text-destructive` token is expected on `:root` only if you plot values below
the baseline.

## Usage

```tsx
import { SparklineBar } from "./components/sparkline-bar/sparkline-bar";

// Daily signups, last 14 days.
<div className="text-chart-2">
  <SparklineBar values={[12, 18, 9, 22, 16, 25, 30, 21, 28, 33, 19, 27, 35, 31]}
    width={140} height={36} label="Daily signups, last 14 days" />
</div>

// Net flow with negatives — below-baseline bars turn destructive.
<SparklineBar values={[4, -2, 6, -5, 3, 8]} baseline={0} label="Net cash flow" />
```

## API

### `<SparklineBar>`

| Prop          | Type       | Default | Notes                                            |
| ------------- | ---------- | ------- | ------------------------------------------------ |
| `values`      | `number[]` | —       | The series, oldest → newest.                     |
| `width`       | `number`   | `100`   |                                                  |
| `height`      | `number`   | `32`    |                                                  |
| `min` / `max` | `number`   | data    | Pin the scale (baseline is always included).     |
| `baseline`    | `number`   | `0`     | Bars below this read as negative (destructive).  |
| `gap`         | `number`   | `1`     | Gap between bars, in viewBox units.              |
| `label`       | `string`   | —       | Accessible name; sets `role="img"` + `<title>`. |
| `className`   | `string`   | —       | Merged onto the svg via `cn()`.                  |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
