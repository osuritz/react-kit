# react-kit

A collection of reusable React hooks and utilities for common frontend patterns.
Copy what you need, no dependencies required (mostly).
MIT licensed.

## Why this exists

You end up rewriting the same hooks and utilities across projects. This is a place to keep the ones that actually work.

## How to use

Each hook/utility is self-contained. Copy the file(s) you need into your project. Check the peer dependencies and any external requirements at the top of each file.

## What's in here

### Hooks

- **[color-scheme](src/hooks/color-scheme/README.md)** — drop-in `light`/`dark`
  color scheme hook. Provider-less by default, configurable storage and DOM
  strategy, ships an SSR FOUC-blocker script. Reach for it when JS needs to
  branch on the scheme (theme toggle, icon/chart swaps); pure CSS theming
  doesn't need it.

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
  [cmdk](https://cmdk.paco.me). Subscribes to the
  [action-registry](src/hooks/action-registry/README.md), groups
  rows by `Action.group`, fuzzy-matches `label` + `keywords`, filters
  out `enabled() === false`, and renders platform-correct shortcut
  glyphs on the right. Persists last-5 recents to `localStorage` and
  accepts async `CommandSource`s for backend search — debounced, with
  per-source loading. Owns its own open hotkey only; per-action
  shortcuts stay with the keyboard-shortcuts drop-in.

## Integration demo

The three action drop-ins above are designed to compose. See
[`src/components/integration-demo.tsx`](src/components/integration-demo.tsx)
for a single page that wires
[action-registry](src/hooks/action-registry/README.md),
[keyboard-shortcuts](src/components/keyboard-shortcuts/README.md), and
[command-palette](src/components/command-palette/README.md) together
and exercises every seam between them: surface attribution via
`ctx.source`, live `enabled()` toggling, mount/unmount cleanup,
`allowInInput` suppression, async palette sources, and a registered
`palette.open` action that owns the `mod+k` chord.

## License

MIT
