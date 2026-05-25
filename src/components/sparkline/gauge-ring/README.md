# gauge-ring

A drop-in **progress ring** — one percentage rendered as a donut/arc, for quota
usage, completion, or a health score. The arc uses SVG `pathLength={100}`, so its
length *is* the percentage and there's no circumference math to get wrong. Track
and arc both use `currentColor` (track at low opacity), so set the hue with a
`text-*` class. Optional center label. Pure SVG — copy the folder into your app.

> Part of the sparkline micro-chart family.

## What to copy

Copy into your project (e.g. `src/components/gauge-ring/`):

- `gauge-ring.tsx` — `<GaugeRing>` + `GaugeRingProps`
- `lib/cn.ts` — local class-name composer
- *(optional)* this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`gauge-ring.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2.

## Usage

```tsx
import { GaugeRing } from "./components/gauge-ring/gauge-ring";

<div className="text-sky-600">
  <GaugeRing value={72} max={100} size={56} thickness={7} centerLabel="72%"
    label="Storage: 72% of quota used" />
</div>
```

## API

### `<GaugeRing>`

| Prop           | Type      | Default | Notes                                            |
| -------------- | --------- | ------- | ------------------------------------------------ |
| `value`        | `number`  | —       | Current value (clamped to `0..max`).             |
| `max`          | `number`  | `100`   |                                                  |
| `size`         | `number`  | `48`    | Width and height (the ring is square).           |
| `thickness`    | `number`  | `6`     | Ring stroke width.                               |
| `centerLabel`  | `string`  | —       | Optional text in the middle (e.g. `"72%"`).     |
| `trackOpacity` | `number`  | `0.15`  | Opacity of the unfilled track.                   |
| `label`        | `string`  | —       | Accessible name; sets `role="img"` + `<title>`. |
| `className`    | `string`  | —       | Merged onto the svg via `cn()`.                  |

The arc starts at 12 o'clock and fills clockwise. Values above `max` clamp to a
full ring; `max = 0` is guarded to an empty ring (no `NaN`).

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
