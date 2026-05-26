# bullet-graph

A drop-in **bullet graph** (Edward Tufte) — a compact "actual vs target" bar with
qualitative background bands (poor / satisfactory / good). The richest of the
micro-charts for KPIs and scorecards: it answers _did we hit the number, and is
that good?_ in a single row. Bands are drawn with `currentColor` at decreasing
opacity (darkest = worst, on the left); the measure bar and target tick use full
`currentColor`. Pure SVG — copy the folder into your app.

> Part of the sparkline micro-chart family. Single value + target, so it has no
> `lib/scale.ts` dependency — just a guarded linear map to `max`.

## What to copy

Copy into your project (e.g. `src/components/bullet-graph/`):

- `bullet-graph.tsx` — `<BulletGraph>` + `BulletGraphProps`
- `lib/cn.ts` — local class-name composer
- _(optional)_ this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`bullet-graph.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2.

## Usage

```tsx
import { BulletGraph } from './components/bullet-graph/bullet-graph';

// Q2 bookings $7.2M against an $8M target; <5 poor, 5–7 ok, >7 good (scale 0–10M).
<div className="text-chart-5">
  <BulletGraph
    value={7.2}
    target={8}
    ranges={[5, 7]}
    max={10}
    width={180}
    height={22}
    label="Q2 bookings $7.2M of $8M target"
  />
</div>;
```

## API

### `<BulletGraph>`

| Prop        | Type       | Default       | Notes                                           |
| ----------- | ---------- | ------------- | ----------------------------------------------- |
| `value`     | `number`   | —             | The actual measured value (the measure bar).    |
| `target`    | `number`   | —             | The goal (vertical tick).                       |
| `ranges`    | `number[]` | —             | Ascending band boundaries splitting `0..max`.   |
| `max`       | `number`   | max of inputs | Scale ceiling.                                  |
| `width`     | `number`   | `160`         |                                                 |
| `height`    | `number`   | `24`          |                                                 |
| `label`     | `string`   | —             | Accessible name; sets `role="img"` + `<title>`. |
| `className` | `string`   | —             | Merged onto the svg via `cn()`.                 |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
