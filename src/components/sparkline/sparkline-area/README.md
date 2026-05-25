# sparkline-area

A drop-in **area sparkline** — a trend line with a soft fill beneath it, for when
you want to emphasise magnitude/volume (revenue, traffic, active users) rather
than just direction. Pure presentational SVG; the line and its fill both use
`currentColor` (the fill at a low opacity), so you set the hue with a `text-*`
class. No npm package, no build step — copy the folder into your app.

> Part of the sparkline micro-chart family in this kit. Shares the
> `values: number[]` shape and the `lib/scale.ts` helpers with the other series
> sparklines.

## What to copy

Copy into your project (e.g. `src/components/sparkline-area/`):

- `sparkline-area.tsx` — `<SparklineArea>` + `SparklineAreaProps`
- `lib/scale.ts` — pure scaling helpers (shared verbatim across series sparklines)
- `lib/cn.ts` — local class-name composer
- *(optional)* this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`sparkline-area.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2.

## Usage

```tsx
import { SparklineArea } from "./components/sparkline-area/sparkline-area";

<div className="text-sky-600">
  <SparklineArea
    values={[820, 910, 880, 1010, 1180, 1240, 1390]}
    width={200}
    height={48}
    showLast
    label="Weekly active users, last 7 weeks"
  />
</div>
```

## API

### `<SparklineArea>`

| Prop          | Type       | Default | Notes                                          |
| ------------- | ---------- | ------- | ---------------------------------------------- |
| `values`      | `number[]` | —       | The series, oldest → newest.                   |
| `width`       | `number`   | `100`   |                                                |
| `height`      | `number`   | `32`    |                                                |
| `min` / `max` | `number`   | data    | Pin the scale.                                 |
| `showLast`    | `boolean`  | `false` | Dot on the most recent point.                  |
| `strokeWidth` | `number`   | `1.5`   |                                                |
| `fillOpacity` | `number`   | `0.15`  | Opacity of the area fill.                      |
| `label`       | `string`   | —       | Accessible name; sets `role="img"` + `<title>`.|
| `className`   | `string`   | —       | Merged onto the svg via `cn()`.                |

Empty/all-equal series render a flat baseline (guarded in `lib/scale.ts`).

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
