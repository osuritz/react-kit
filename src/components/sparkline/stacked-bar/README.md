# stacked-bar

A drop-in **stacked proportion bar** — a single horizontal row that shows
part-to-whole composition: test results (passed/failed/skipped), budget split,
storage by type, market share. Segments size in proportion to the total and
cycle the shadcn `--color-chart-1..5` tokens unless you pass an explicit color.
Pure SVG — copy the folder into your app.

> Part of the sparkline micro-chart family. No `lib/scale.ts` — segments are a
> simple guarded proportion of the total.

## What to copy

Copy into your project (e.g. `src/components/stacked-bar/`):

- `stacked-bar.tsx` — `<StackedBar>` + `StackedBarProps`, `StackedBarSegment`
- `lib/cn.ts` — local class-name composer
- _(optional)_ this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`stacked-bar.test.tsx` are the verification harness — not part of the copy.

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2. The
`--color-chart-*` tokens are used only for segments without an explicit `color`.

## Usage

```tsx
import { StackedBar } from "./components/stacked-bar/stacked-bar";

// CI run — explicit semantic colors per status.
<StackedBar
  width={240}
  height={10}
  label="412 passed, 18 failed, 7 skipped"
  segments={[
    { value: 412, label: "passed", color: "var(--color-emerald-500, #10b981)" },
    { value: 18, label: "failed", color: "var(--destructive)" },
    { value: 7, label: "skipped", color: "var(--muted-foreground)" },
  ]}
/>

// Neutral composition — omit colors to cycle the chart tokens.
<StackedBar segments={[{ value: 5 }, { value: 3 }, { value: 2 }]} />
```

## API

### `<StackedBar>`

| Prop        | Type                  | Default | Notes                                           |
| ----------- | --------------------- | ------- | ----------------------------------------------- |
| `segments`  | `StackedBarSegment[]` | —       | `{ value, label?, color? }` parts.              |
| `width`     | `number`              | `100`   |                                                 |
| `height`    | `number`              | `8`     |                                                 |
| `gap`       | `number`              | `2`     | Gap between segments, in viewBox units.         |
| `radius`    | `number`              | `2`     | Corner radius of each segment.                  |
| `label`     | `string`              | —       | Accessible name; sets `role="img"` + `<title>`. |
| `className` | `string`              | —       | Merged onto the svg via `cn()`.                 |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
