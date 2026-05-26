# heat-strip

A drop-in **heat strip** — a single row of cells whose opacity encodes intensity:
request volume by hour, activity by day, error density, occupancy. One color
(`currentColor`) ramped by opacity, so it reads as a heat map without a
multi-hue scale. Set the hue with a `text-*` class. Pure SVG — copy the folder
into your app.

> Part of the sparkline micro-chart family.

## What to copy

Copy into your project (e.g. `src/components/heat-strip/`):

- `heat-strip.tsx` — `<HeatStrip>` + `HeatStripProps`
- `lib/cn.ts` — local class-name composer
- _(optional)_ this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`heat-strip.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2.

## Usage

```tsx
import { HeatStrip } from './components/heat-strip/heat-strip';

// Requests per hour over a day — darker = busier.
<div className="text-sky-600">
  <HeatStrip
    values={[2, 1, 0, 0, 1, 3, 8, 14, 19, 22, 18, 15, 17, 20, 16, 12, 9, 11, 7, 5, 4, 3, 2, 1]}
    width={240}
    height={14}
    label="Requests per hour, last 24h"
  />
</div>;
```

## API

### `<HeatStrip>`

| Prop         | Type       | Default       | Notes                                           |
| ------------ | ---------- | ------------- | ----------------------------------------------- |
| `values`     | `number[]` | —             | One cell per value.                             |
| `max`        | `number`   | largest value | Intensity ceiling.                              |
| `width`      | `number`   | `100`         |                                                 |
| `height`     | `number`   | `12`          |                                                 |
| `gap`        | `number`   | `1.5`         | Gap between cells, in viewBox units.            |
| `radius`     | `number`   | `1.5`         | Corner radius of each cell.                     |
| `minOpacity` | `number`   | `0.08`        | Opacity floor so empty cells stay visible.      |
| `label`      | `string`   | —             | Accessible name; sets `role="img"` + `<title>`. |
| `className`  | `string`   | —             | Merged onto the svg via `cn()`.                 |

`max = 0` (or all-zero data) is guarded — cells render at the opacity floor, no
`NaN`.

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
