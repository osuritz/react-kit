# AGENTS.md

Working notes for agents and contributors. For the catalog of what's in the
kit, see [`README.md`](README.md); each drop-in has its own README with the
copy-this-vs-leave-this details.

## What this repo is

A copy-paste kit of self-contained React hooks and components. There is **no
published package** — consumers copy a `src/<path>/` folder into their own
project. Two buckets:

- **`src/`** — the drop-ins. Each is a standalone unit with its own README,
  peer-dependency list, `lib/cn.ts`, and isolated test harness. This is what
  gets copied out.
- **`app/`** — the Vite demo site (deployed to GitHub Pages). One page per
  drop-in. **Never copy from `app/`**, and drop-ins must never import from it —
  they stay file-self-contained. See [`app/README.md`](app/README.md).

Drop-ins assume the host app provides Tailwind v4 + the shadcn token set; the
demo supplies those in `app/index.css`.

## Package manager: pnpm only

This repo is a pnpm workspace and `preinstall` enforces it (`only-allow pnpm`).
**Do not use npm or yarn** — npm's workspace hoisting breaks the per-drop-in
React-version pinning. Workspace globs (`pnpm-workspace.yaml`):

```
src/components/*
src/components/sparkline/*
src/hooks/*
```

Each drop-in folder is its own workspace package. Drop-ins pin **React 18**
(`peerDependencies: react >=18`, dev-installed at 18) so they're verified on the
floor they advertise; the demo app runs **React 19**.

## Commands

| Task                | Command                | Notes                                            |
| ------------------- | ---------------------- | ------------------------------------------------ |
| Install             | `pnpm install`         | Never `npm install`.                             |
| Run all tests       | `pnpm test`            | = `pnpm -r run test`; runs every drop-in's suite |
| One drop-in's tests | `vitest run` in folder | Each folder has its own `vitest.config.ts`       |
| Typecheck a drop-in | `tsc --noEmit`         | Per-folder `tsconfig.json`                       |
| Lint                | `pnpm run lint`        | oxlint                                           |
| Lint (autofix)      | `pnpm run lint:fix`    |                                                  |
| Format check        | `pnpm run format`      | oxfmt `--check` (CI runs this)                   |
| Format write        | `pnpm run format:fix`  |                                                  |
| Demo site (dev)     | `pnpm dev`             | Vite                                             |
| Demo site (build)   | `pnpm build`           |                                                  |

CI (`.github/workflows/format-lint.yml`) runs format → lint → test on every
push/PR to `main`; `deploy.yml` ships the built `app/` to GitHub Pages.

## Tooling

- **Lint:** oxlint (replaced ESLint), config in `.oxlintrc.json`. Note: listing
  `plugins` _replaces_ the defaults, so all needed plugins are listed
  explicitly. React Hooks rules run via the `react-hooks-js` JS plugin
  (`rules-of-hooks`/`exhaustive-deps` are errors).
- **Format:** oxfmt, config in `.oxfmtrc.json` — single quotes, semicolons,
  `printWidth` 100, 2-space indent, `trailingComma: es5`, always-parens arrows.

## Import aliases

- `#*` → `./src/*` — the Node `imports` map in `package.json`. Demo wrappers use
  it (`#hooks/...`, `#components/...`) to consume a drop-in exactly as a real
  consumer would.
- `~/*` → `./app/*` — app-internal only (Vite `resolve.alias` + `tsconfig.app.json`).

## Drop-in conventions

- **Self-contained.** No imports outside the folder except declared peers. Each
  folder ships its own `lib/cn.ts`. The README must spell out which files to
  copy vs. which are the verification harness (`package.json`, `vitest.config.ts`,
  tests, setup).
- **Testing is expected to be rigorous** — write tests first (TDD), and cover
  edge cases (empty / single-element / flat / non-finite `NaN`/`Infinity` data,
  divide-by-zero) and accessibility (`*.a11y.test.tsx`) by default, not as an
  afterthought.
- **Sparklines** (`src/components/sparkline/*`) are pure presentational SVG:
  color via `currentColor` (multi-series cycle the shadcn `--color-chart-1..5`
  tokens, negatives/breaches use `text-destructive`), an optional `label` to
  expose `role="img"`, and a sane baseline on degenerate data. No charting lib.

## Adding a drop-in to the demo site

Each page is an **MDX file** under `app/routes/`. The route table and the
navigation (desktop sidebar, mobile drawer, home-page grid) are both generated
from the pages' frontmatter by `app/lib/pages.tsx` — so there's no router or nav
list to hand-edit, and they can't drift. Two steps:

1. Add a demo wrapper under `app/components/demos/<name>.tsx` (importing via
   `#hooks/...` / `#components/...`, exactly as a real consumer would).
2. Add the page under `app/routes/<name>.mdx`. **The filename is the route
   path.** Declare frontmatter — `title`, `group` (Hooks / Components /
   Sparklines / Demos), `order` (within the group), `blurb` (home-card line),
   optional `description`, and `dropInPath` (drives the README + Source links) —
   then import the demo wrapper and its `?shiki` source and embed one or more
   `<DemoCard>`s (provided to MDX automatically — no import). See
   `routes/delta-chip.mdx` for the standard shape and `routes/integration.mdx`
   for a hand-rolled page (`appSourcePath`, demo rendered directly without a
   `DemoCard`).

`app/lib/nav.ts` re-exports the generated `NAV_GROUPS`; group order lives in
`GROUP_ORDER` in `app/lib/pages.tsx`. MDX is wired in `vite.config.ts`
(`@mdx-js/rollup` + `remark-frontmatter` + `remark-mdx-frontmatter`); the
`*.mdx` module type is declared in `app/vite-env.d.ts`.
