# sparkline-winloss

A drop-in **win/loss sparkline** — equal-height ticks above the midline for
"wins" and below for "losses", with zeros as a faint tie mark. Magnitude is
ignored on purpose: this chart shows the _pattern_ of binary outcomes (SLA
met/missed, test pass/fail, gain/loss days, up/down sessions). Wins use
`currentColor`; losses are tinted with the shadcn `text-destructive` token. Pure
SVG — copy the folder into your app.

> Part of the sparkline micro-chart family.

## What to copy

Copy into your project (e.g. `src/components/sparkline-winloss/`):

- `sparkline-winloss.tsx` — `<SparklineWinLoss>` + `SparklineWinLossProps`
- `lib/cn.ts` — local class-name composer
- _(optional)_ this README

`package.json`, `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, and
`sparkline-winloss.test.tsx` are the verification harness — not part of the copy.
(No `lib/scale.ts`: win/loss ignores magnitude, so there's no scaling to do.)

Peer requirements: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2, plus the
`text-destructive` token on `:root` for the loss color.

## Usage

```tsx
import { SparklineWinLoss } from './components/sparkline-winloss/sparkline-winloss';

// +1 = SLA met, -1 = missed, 0 = no traffic. Wins are emerald, losses destructive.
<div className="text-emerald-600">
  <SparklineWinLoss
    values={[1, 1, -1, 1, 1, 1, -1, 1, 0, 1, 1, -1]}
    width={140}
    height={28}
    label="SLA met/missed, last 12 days"
  />
</div>;
```

## API

### `<SparklineWinLoss>`

| Prop        | Type       | Default | Notes                                             |
| ----------- | ---------- | ------- | ------------------------------------------------- |
| `values`    | `number[]` | —       | Sign per period → win (>0) / loss (<0) / tie (0). |
| `width`     | `number`   | `100`   |                                                   |
| `height`    | `number`   | `32`    |                                                   |
| `gap`       | `number`   | `1`     | Gap between ticks, in viewBox units.              |
| `label`     | `string`   | —       | Accessible name; sets `role="img"` + `<title>`.   |
| `className` | `string`   | —       | Merged onto the svg via `cn()`.                   |

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```
