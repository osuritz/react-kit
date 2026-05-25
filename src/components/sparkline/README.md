# Sparklines

A **sparkline** is a tiny, word-sized chart that shows a trend or distribution at
a glance — no axes, gridlines, or labels — like GitHub's contribution graph or
the mini chart beside a stock price. They're built to sit inline with text and
numbers in dense, data-heavy UIs (tables, KPI cards, dashboards).

This folder is a small family of copy-paste, dependency-light micro-charts. Each
is a self-contained drop-in (its own `lib/cn.ts`, tests, and README) that you copy
into your project — no npm package, no build step. They share a common shape:

- **Pure presentational SVG** — no state, effects, or interactivity.
- **Color via `currentColor`** — set the hue with a `text-*` class on the element
  (multi-series charts cycle the shadcn `--color-chart-1..5` tokens; negatives /
  breaches use `text-destructive`). No charting library required.
- **Accessible** — pass a `label` to expose the chart as `role="img"` with an
  accessible name; omit it and the chart is decorative (`aria-hidden`), which is
  right when it merely echoes a number already on screen.
- **Robust** — empty, single-element, flat, and non-finite (`NaN`/`Infinity`)
  data render a sane baseline rather than `NaN` geometry.

## The family

| Drop-in | Component | What it's for |
| --- | --- | --- |
| [`sparkline-line`](./sparkline-line/) | `SparklineLine` | Canonical trend line for tables and KPI cards |
| [`sparkline-area`](./sparkline-area/) | `SparklineArea` | Trend with a filled area — emphasises volume/magnitude |
| [`sparkline-bar`](./sparkline-bar/) | `SparklineBar` | Discrete per-period values; below-baseline turns destructive |
| [`sparkline-winloss`](./sparkline-winloss/) | `SparklineWinLoss` | Binary up/down outcomes (SLA met/missed, pass/fail) |
| [`sparkline-threshold`](./sparkline-threshold/) | `SparklineThreshold` | Metric vs an SLO — shaded band + limit, breaches flagged |
| [`bullet-graph`](./bullet-graph/) | `BulletGraph` | Tufte actual-vs-target with qualitative bands (the KPI member) |
| [`stacked-bar`](./stacked-bar/) | `StackedBar` | Single-row part-to-whole (status breakdown, budget) |
| [`gauge-ring`](./gauge-ring/) | `GaugeRing` | One percentage as a donut (quota, completion) |
| [`heat-strip`](./heat-strip/) | `HeatStrip` | Single-row intensity over periods (usage density) |
| [`delta-chip`](./delta-chip/) | `DeltaChip` | The `▲ +12%` change indicator that pairs with a sparkline |

## Using a drop-in

Copy the folder you need (e.g. `sparkline-line/`) into your project. Each folder's
own README lists exactly which files to copy (the component, its `lib/` helpers,
and optionally the README) versus the verification harness (`package.json`,
`vitest.config.ts`, tests) you can leave behind.

Peer requirements across the family: React 18+, `clsx` ≥ 2, `tailwind-merge` ≥ 2.
The series charts (`line`/`area`/`bar`/`threshold`) also share a small
`lib/scale.ts`. Tailwind v4 + the shadcn theme tokens are expected at the host-app
level only where token classes (`text-chart-1`, `text-destructive`, …) are used.

See them composed into a realistic dashboard on the docs site's **Sparkline
dashboard** demo.
