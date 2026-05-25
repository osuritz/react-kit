# sparkline-line

A drop-in line **sparkline** — a small, axis-less trend line you embed inline in
tables, KPI cards, and dense dashboards. Pure presentational SVG: no state, no
effects, no interactivity, no dependencies beyond `clsx`/`tailwind-merge` for the
local `cn()`. Color comes from `currentColor`, so you set the hue with a `text-*`
class. No npm package, no build step — copy the folder into your app.

> One of a family of copy-paste micro-charts in this kit (area, bar, win/loss,
> threshold, bullet, stacked bar, gauge, heat strip, delta chip). They share the
> same `values: number[]` shape and the same `lib/scale.ts` scaling helpers.

## What to copy

Copy these files into your project (e.g. `src/components/sparkline-line/`):

- `sparkline-line.tsx` — `<SparklineLine>` + `SparklineLineProps`
- `lib/scale.ts` — pure scaling helpers (`toPoints`, `linePath`, …); shared
  verbatim across the series sparklines
- `lib/cn.ts` — local class-name composer (shadcn idiom)
- *(optional)* this README

The other files (`package.json`, `tsconfig.json`, `vitest.config.ts`,
`vitest.setup.ts`, `sparkline-line.test.tsx`) are the **verification harness** —
they let `npm test` run here but are not part of what you copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2. No Tailwind
tokens are required to render; token classes (`text-chart-1`, …) are only used
if you choose to color the line with them.

## Usage

```tsx
import { SparklineLine } from "./components/sparkline-line/sparkline-line";

// In a KPI card — set color via a text-* class, size via width/height.
<div className="text-chart-1">
  <SparklineLine
    values={[12, 14, 13, 18, 17, 22, 25, 24, 28, 31, 30, 35]}
    width={120}
    height={36}
    showLast
    label="Revenue, last 12 weeks (trending up)"
  />
</div>
```

In a table cell, keep it tiny (e.g. `width={64} height={20}`) and let it inherit
the row's text color by omitting any `text-*` class.

## API

### `<SparklineLine>`

| Prop           | Type        | Default | Notes                                              |
| -------------- | ----------- | ------- | -------------------------------------------------- |
| `values`       | `number[]`  | —       | The series, oldest → newest.                       |
| `width`        | `number`    | `100`   | SVG width (also the `viewBox` width).              |
| `height`       | `number`    | `32`    | SVG height.                                        |
| `min` / `max`  | `number`    | data    | Pin the scale (e.g. a shared 0-based axis).        |
| `showLast`     | `boolean`   | `false` | Dot on the most recent point.                      |
| `showExtremes` | `boolean`   | `false` | Dots on the highest (solid) and lowest (faded).    |
| `strokeWidth`  | `number`    | `1.5`   |                                                    |
| `label`        | `string`    | —       | Accessible name; sets `role="img"` + `<title>`.   |
| `className`    | `string`    | —       | Merged onto the svg via `cn()`.                    |

**Accessibility:** pass a `label` for any chart that conveys information on its
own — it becomes the svg's `aria-label`. With no `label` the svg is rendered
decoratively (`aria-hidden`), which is correct when the trend merely echoes a
number already in the DOM next to it.

**Robustness:** empty and all-equal (e.g. all-zero) series are guarded in
`lib/scale.ts`, so they render a flat baseline instead of `NaN` coordinates.

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
