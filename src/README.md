# `src/` layout

This repo serves two purposes that share a tree: it ships a set of drop-in
React utilities, AND it hosts a Vite demo app that renders each of them on
a documentation page. The conventions below tell you which file belongs to
which purpose.

## Three buckets

| Path                         | Purpose                                                                                  | Part of a drop-in? |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------ |
| `hooks/<name>/`              | A drop-in hook + its co-located test harness. Self-contained.                            | **yes**            |
| `components/<name>/`         | A drop-in component + its co-located test harness. Self-contained.                       | **yes**            |
| `components/ui/`             | shadcn/ui primitives (Button, ToggleGroup, ...). Demo-only, never copied by a drop-in.   | no                 |
| `components/*-demo.tsx`      | Demo glue. Renders a drop-in inside the showcase app. Suffix `-demo.tsx` is required.    | no                 |
| `App.tsx`, `main.tsx`, `index.css` | Vite demo shell + global styles. Demo-only.                                        | no                 |
| `lib/`                       | Demo helpers (e.g. `cn`). Demo-only.                                                     | no                 |

## What makes a folder a drop-in

A drop-in folder always has:

- The actual source file(s) — what users copy into their app.
- A `README.md` listing peer requirements and a "what to copy" section.
- A co-located verification harness: `package.json`, `tsconfig.json`,
  `vitest.config.ts`, `vitest.setup.ts`, and `*.test.ts(x)` next to the
  source.

Examples: `src/hooks/color-scheme/`, `src/components/search-facets/`.

The harness exists so `npm test` works inside the drop-in folder against an
isolated `node_modules`. Harness files are **not** copied by users — each
drop-in's README spells out exactly which files to copy.

## What's `*-demo.tsx`

Files in `src/components/` with the `-demo.tsx` suffix are showcase wrappers
imported by `App.tsx`. They depend on:

- the drop-in they're demonstrating, AND
- the demo-only chrome (shadcn primitives in `components/ui/`, Tailwind
  classes from `index.css`, lucide icons).

They are **not** part of any drop-in. If you copy a drop-in into another app,
you do **not** copy the matching `*-demo.tsx` — write your own integration.

## What's in `components/ui/`

shadcn/ui components installed via `components.json`. Treat this like any
other vendored shadcn directory: edit freely, but don't import these from
inside a drop-in folder. Drop-ins stay file-self-contained so users can
copy the folder as a unit.

## Drop-in styling conventions

- **`hooks/<name>/`** drop-ins ship pure logic (no JSX-level styling) and
  declare only React as a peer.
- **`components/<name>/`** drop-ins ship rendered UI and follow the shadcn
  idiom: Tailwind v4 utilities inline, classes composed with a local
  `cn()` (`clsx` + `tailwind-merge`), and the standard shadcn theme tokens
  (`bg-popover`, `border-input`, `ring-ring`, ...). They do **not** import
  from `components/ui/`, but they **do** assume the host app has Tailwind
  v4 + the shadcn token set installed (`@import "shadcn/tailwind.css"`).
  Each component's README spells out the exact peer set.

## Adding something new

- **A new drop-in?** Create `src/{hooks,components}/<name>/` with the
  source, a README, and the same harness shape as `color-scheme/` or
  `search-facets/`. Don't add it to the demo until the harness is green.
- **A new demo card?** Create `src/components/<name>-demo.tsx`, import it
  from `App.tsx`, and add a `<DemoCard>` entry. The `-demo.tsx` suffix is
  the convention that distinguishes it from drop-in source.
- **A new shadcn primitive?** Use `npx shadcn add <component>`; it lands in
  `components/ui/`. Don't import it from inside a drop-in folder.
