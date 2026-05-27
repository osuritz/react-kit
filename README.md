# react-kit

A collection of reusable React hooks and utilities for common frontend patterns.
Copy what you need, no dependencies required (mostly).
MIT licensed.

**Live demo:** <https://osuritz.github.io/react-kit/>

## Why this exists

You end up rewriting the same hooks and utilities across projects. This is a place to keep the ones that actually work.

## Repo layout

- **`src/`** — the drop-ins. Self-contained hooks and components, each with its own README, peer-dependency list, and isolated test harness. This is what you copy into your project.
- **`app/`** — the demo site. Renders one page per drop-in at the live URL above. Never copy from here.

## How to use

Each hook/utility is self-contained. Copy the file(s) you need into your project. Check the peer dependencies and any external requirements at the top of each file.

## What's in here

### Hooks

- **[color-scheme](src/hooks/color-scheme/README.md)** — drop-in `light`/`dark`
  color scheme hook. Provider-less by default, configurable storage and DOM
  strategy, ships an SSR FOUC-blocker script. Reach for it when JS needs to
  branch on the scheme (theme toggle, icon/chart swaps); pure CSS theming
  doesn't need it.

- **[use-clipboard](src/hooks/use-clipboard/README.md)** — drop-in
  copy-to-clipboard hook. `copy()` writes the text and flips a `copied`
  flag that auto-resets on a timer; it handles the async Clipboard API,
  the `execCommand` fallback, secure-context / permission failures (a
  typed `ClipboardError`), and optional before/after callbacks. It never
  throws — every failure resolves to `false` and surfaces on `error`.
  Reach for it whenever you have a "Copy" affordance and want the
  "Copied!" state and all the failure modes handled for you. No runtime
  dependencies.

- **[action-registry](src/hooks/action-registry/README.md)** — drop-in shared
  registry for app actions (id + label + optional
  shortcut/group/keywords/icon). The primitive a keybinding hook and a
  command palette both subscribe to. Provider-scoped, isolated per provider,
  no DOM, no shortcut parsing — just `register` / `getAll` / `subscribe`.

### Components

- **[search-facets](src/components/search-facets/README.md)** — drop-in
  faceted search bar. Schema-driven, controlled by an AST, composed over
  Base UI's `Combobox` and `Popover`. Gmail-flavor grammar (`field:value`,
  `-field:value`, quoted phrases, ranges, free text) with five facet
  types — boolean, enum, string, number, and (optional peer)
  `react-day-picker`-backed date. Reach for it when filtering has more
  than two or three orthogonal axes and users will be mixing them.

- **[keyboard-shortcuts](src/components/keyboard-shortcuts/README.md)** —
  drop-in keybinding layer + cheatsheet. Subscribes to the
  [action-registry](src/hooks/action-registry/README.md) and binds any
  action with a `shortcut` field — `mod+k`, `["mod+s","ctrl+s"]`,
  `g i` sequences. Ignores keystrokes inside inputs unless the action
  opts in (`allowInInput`), normalizes `mod` to ⌘ on macOS / Ctrl
  elsewhere, and renders a shadcn-styled cheatsheet that picks up new
  actions automatically. Reach for it once you have more than three or
  four global shortcuts and want to stop hand-rolling per-component
  `keydown` listeners.

- **[command-palette](src/components/command-palette/README.md)** —
  drop-in `⌘K` launcher built on
  [Base UI](https://base-ui.com)'s `Combobox` + `Dialog`. Subscribes to the
  [action-registry](src/hooks/action-registry/README.md), groups
  rows by `Action.group`, fuzzy-matches `label` + `keywords`, filters
  out `enabled() === false`, and renders platform-correct shortcut
  glyphs on the right. Persists last-5 recents to `localStorage` and
  accepts async `CommandSource`s for backend search — debounced, with
  per-source loading. Owns its own open hotkey only; per-action
  shortcuts stay with the keyboard-shortcuts drop-in.

### Sparklines

A small family of copy-paste, dependency-light **micro-charts** — tiny,
word-sized SVG charts (think GitHub's contribution graph, or the mini chart
beside a stock price) built to sit inline in dense, data-heavy UIs like
tables, KPI cards, and dashboards. They share a common shape: pure
presentational SVG (no state or effects), color via `currentColor` (set the
hue with a `text-*` class), an optional `label` that exposes the chart as
`role="img"` (omit it and it's decorative), and a sane baseline on empty /
flat / non-finite data. See the
[family overview](src/components/sparkline/README.md) for the shared
conventions and peer requirements.

| Drop-in                                                                | Component            | What it's for                                                  |
| ---------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| [`sparkline-line`](src/components/sparkline/sparkline-line/)           | `SparklineLine`      | Canonical trend line for tables and KPI cards                  |
| [`sparkline-area`](src/components/sparkline/sparkline-area/)           | `SparklineArea`      | Trend with a filled area — emphasises volume/magnitude         |
| [`sparkline-bar`](src/components/sparkline/sparkline-bar/)             | `SparklineBar`       | Discrete per-period values; below-baseline turns destructive   |
| [`sparkline-winloss`](src/components/sparkline/sparkline-winloss/)     | `SparklineWinLoss`   | Binary up/down outcomes (SLA met/missed, pass/fail)            |
| [`sparkline-threshold`](src/components/sparkline/sparkline-threshold/) | `SparklineThreshold` | Metric vs an SLO — shaded band + limit, breaches flagged       |
| [`bullet-graph`](src/components/sparkline/bullet-graph/)               | `BulletGraph`        | Tufte actual-vs-target with qualitative bands (the KPI member) |
| [`stacked-bar`](src/components/sparkline/stacked-bar/)                 | `StackedBar`         | Single-row part-to-whole (status breakdown, budget)            |
| [`gauge-ring`](src/components/sparkline/gauge-ring/)                   | `GaugeRing`          | One percentage as a donut (quota, completion)                  |
| [`heat-strip`](src/components/sparkline/heat-strip/)                   | `HeatStrip`          | Single-row intensity over periods (usage density)              |
| [`delta-chip`](src/components/sparkline/delta-chip/)                   | `DeltaChip`          | The `▲ +12%` change indicator that pairs with a sparkline      |

## Demos

Two routes on the demo site compose the drop-ins above end-to-end rather than
showing them in isolation:

- **[Sparkline dashboard](https://osuritz.github.io/react-kit/sparkline-dashboard)**
  — the whole micro-chart family assembled into one realistic enterprise
  dashboard, so you can see how the sparklines, bullet graph, gauge,
  heat strip, and delta chips read side by side.

- **[Integration](https://osuritz.github.io/react-kit/integration)**
  (source:
  [`app/components/demos/integration.tsx`](app/components/demos/integration.tsx))
  — the three action drop-ins, which are designed to compose. It wires
  [action-registry](src/hooks/action-registry/README.md),
  [keyboard-shortcuts](src/components/keyboard-shortcuts/README.md), and
  [command-palette](src/components/command-palette/README.md) together and
  exercises every seam between them: surface attribution via `ctx.source`,
  live `enabled()` toggling, mount/unmount cleanup, `allowInInput`
  suppression, async palette sources, and a registered `palette.open` action
  that owns the `mod+k` chord.

## License

MIT
