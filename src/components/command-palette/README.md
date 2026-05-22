# command-palette

A drop-in `⌘K`-style command palette for React. Built on
[Base UI](https://base-ui.com/)'s `Combobox` and `Dialog`, styled with
shadcn theme tokens. Subscribes to the
[action-registry](../../hooks/action-registry/README.md) — every
registered action shows up as a row, grouped by `Action.group`, with
platform-correct shortcut glyphs on the right. Optional async
`CommandSource`s plug in for backend search (debounced, per-source
loading state). Recents — last 5 invoked actions — persist to
`localStorage`. No npm package, no build step — copy the folder into
your app.

> **The palette only owns its own open hotkey.** Per-action shortcuts
> are the [keyboard-shortcuts](../keyboard-shortcuts/README.md)
> drop-in's job. The palette and the shortcut hook both consume the
> same registry, so an action's `shortcut` field can fire it from a
> key *and* show its glyphs in the palette row — no extra wiring.

## What to copy

Copy these files into your project (e.g. `src/components/command-palette/`):

- `command-palette.tsx` — `<CommandPalette>`, `CommandSource` type
- `format-shortcut.ts` — tiny platform-correct shortcut formatter
  (used by the row glyphs; pulled out so the file is reusable)
- `lib/cn.ts` — local class-name composer (shadcn idiom)
- `lib/command-score.ts` — vendored MIT fuzzy-match scorer (same
  algorithm `cmdk` uses; ~50 LOC, pure function)
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `command-palette.test.tsx`) are
the **verification harness** — they live alongside the drop-in so
`npm test` works here, but they're not part of what you copy into your
app.

This drop-in *consumes* the action-registry drop-in — it does not
redefine the `Action` contract. Make sure
[`src/hooks/action-registry/`](../../hooks/action-registry/README.md)
is in your project too (or wired to wherever you're keeping the
registry).

Peer requirements:

- React 18+ (uses `useSyncExternalStore`)
- `@base-ui/react` ≥ 1.4 — provides `Dialog` (modal wrapper, focus
  trap, accessible labelling) and `Combobox` (input, list, keyboard
  navigation, empty/status slots)
- `clsx` ≥ 2, `tailwind-merge` ≥ 2 — for the local `cn()` helper
- Tailwind v4 + the standard shadcn theme tokens (`bg-popover`,
  `text-popover-foreground`, `border-border`, …) on `:root` — see
  [`shadcn/tailwind.css`](https://ui.shadcn.com/docs/tailwind-v4).
  Without these tokens the dialog renders unstyled.

## Setup

1. **Wrap your app** in an `<ActionsProvider>` (the action-registry
   drop-in) and mount the palette anywhere inside it. One palette per
   provider is the norm — nesting two would just split recents and
   confuse the hotkey.

   ```tsx
   import { ActionsProvider } from "./hooks/action-registry/actions";
   import { CommandPalette } from "./components/command-palette/command-palette";

   export function App() {
     return (
       <ActionsProvider>
         <Routes />
         <CommandPalette />
       </ActionsProvider>
     );
   }
   ```

2. **Register actions** with `useAction` from anywhere inside the
   provider. The palette's row layout uses `label`, optional `icon`,
   optional `shortcut` (rendered as glyphs on the right), `group` (used
   as the section heading), and `keywords` (extra fuzzy-match terms).
   `enabled() === false` actions are filtered out.

   ```tsx
   import { useAction } from "./hooks/action-registry/actions";
   import { useNavigate } from "react-router";
   import { Cog } from "lucide-react";

   export function NavRegisters() {
     const navigate = useNavigate();
     useAction({
       id: "nav.settings",
       label: "Open Settings",
       group: "Navigation",
       shortcut: "mod+,",
       keywords: ["preferences", "config"],
       icon: <Cog />,
       run: () => navigate("/settings"),
     });
     return null;
   }
   ```

3. **(Optional) wire async sources.** Each source returns an array of
   `Action`s for the current query. The palette debounces input
   (~150ms) and aborts in-flight calls when the query changes — honor
   the `AbortSignal` if your search hits the network.

   ```tsx
   import type { CommandSource } from "./components/command-palette/command-palette";

   const docsSource: CommandSource = {
     id: "docs",
     heading: "Search docs",
     async search(query, signal) {
       const res = await fetch(`/api/docs?q=${encodeURIComponent(query)}`, { signal });
       const docs: { id: string; title: string; href: string }[] = await res.json();
       return docs.map((d) => ({
         id: `doc:${d.id}`,
         label: d.title,
         run: () => location.assign(d.href),
       }));
     },
   };

   <CommandPalette sources={[docsSource]} />
   ```

## Recents

Last 5 invoked action ids are persisted to `localStorage` under
`"command-palette:recents"`. They show in a "Recent" group at the top
when the search input is empty; the same actions are suppressed from
their normal group so the row doesn't appear twice. Stale ids
(actions that have since unregistered) are filtered from the list at
read time but kept in storage so they reappear if the action remounts
later — this matters for route-scoped actions whose registrations
come and go.

To use a different storage key (e.g. when an app mounts multiple
isolated palettes) pass `recentsStorageKey="my-key"`. To turn
persistence off entirely, pass `recentsStorageKey={null}` — recents
still work in-memory for the lifetime of the page.

## Hotkey

Defaults to `mod+k` (`⌘K` on macOS, `Ctrl+K` elsewhere). Override
with a different chord, an array of alternates, or `false` to disable
the built-in listener. Disabling the hotkey is the right call when
the palette should be opened by a registered action (so its shortcut
shows up in the cheatsheet); register an action whose `run` calls
`onOpenChange(true)` and pass `hotkey={false}`.

```tsx
// Custom chord
<CommandPalette hotkey="mod+shift+p" />

// Multiple chords
<CommandPalette hotkey={["mod+k", "ctrl+space"]} />

// No built-in hotkey — driven by a registered action that the
// keyboard-shortcuts drop-in will fire on its own shortcut.
function PaletteOpener() {
  const [open, setOpen] = React.useState(false);
  useAction({
    id: "system.palette",
    label: "Open command palette",
    group: "Navigation",
    shortcut: "mod+k",
    allowInInput: true,
    run: () => setOpen(true),
  });
  return (
    <CommandPalette open={open} onOpenChange={setOpen} hotkey={false} />
  );
}
```

The palette deliberately does NOT register itself in the action
registry. If both the palette's built-in hotkey and a registered
action with the same chord were live, both would fire on `mod+k`. Pick
one.

## API

### `<CommandPalette>`

| Prop                | Type                                 | Default                          |
|---------------------|--------------------------------------|----------------------------------|
| `hotkey`            | `string \| string[] \| false`        | `"mod+k"`                        |
| `sources`           | `CommandSource[]`                    | `[]`                             |
| `sourceDebounceMs`  | `number`                             | `150`                            |
| `maxRecents`        | `number`                             | `5`                              |
| `recentsStorageKey` | `string \| null`                     | `"command-palette:recents"`      |
| `open`              | `boolean`                            | uncontrolled                     |
| `onOpenChange`      | `(open: boolean) => void`            | —                                |
| `placeholder`       | `string`                             | `"Search…"`                      |
| `className`         | `string`                             | —                                |
| `mac`               | `boolean`                            | autodetected                     |

Must be mounted inside an `<ActionsProvider>`. The modal is a Base UI
`Dialog.Popup` — focus trap, scroll lock, and ARIA labelling are
inherited from there. The input + list are a Base UI `Combobox.Root`
in `inline` mode (no floating popover; the list renders directly
inside the dialog).

### `CommandSource`

```ts
interface CommandSource {
  id: string;
  heading?: string;
  search: (query: string, signal: AbortSignal) => Promise<Action[]>;
}
```

Sources are searched in parallel as the user types, debounced by
`sourceDebounceMs`. v1 fires sources only when the query is non-empty
— the empty-state shows recents + registered actions. Source results
are rendered in their own group and bypass the local fuzzy filter —
the source already vetted them for this query, so we trust its own
ranking. Registered actions are scored locally against `label` plus
`keywords` plus `group`. Selecting a row calls its `run`, just like
a registered action.

### `ctx.source`

When the palette fires an action (registered or source-returned), it
passes `source: "palette"` in the `run` ctx. See the
[action-registry README](../../hooks/action-registry/README.md#ctxsource--invocation-attribution)
for the full convention.

### Re-exports

```ts
import { formatShortcutCaps, isMacLike, type KeyCap } from "./command-palette";
```

`formatShortcutCaps(shortcut, mac?)` returns
`KeyCap[][]` — outer array is sequence chords, inner is the
modifier+key caps for one chord. Use it to render shortcut glyphs in
your own UI without re-implementing the modifier order.

## Testing this drop-in

This directory ships a Vitest harness so you can verify the code
before copying it:

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```

## Decisions made (where the spec left a choice)

- **Built on Base UI Combobox + Dialog, with a vendored
  `command-score`.** Base UI handles the dialog focus trap, the
  combobox keyboard navigation (arrow/Enter/Escape), and ARIA
  labelling. We own the filter (`lib/command-score.ts` is `cmdk`'s
  MIT-licensed fuzzy-matcher, vendored verbatim — ~50 LOC, pure) and
  the group-hiding rule (a group with no rows passing the filter is
  omitted). We add the registry adapter, the recents bucket, the
  async-source plumbing, and the row layout.
- **Palette owns *only* its open hotkey.** Per-action shortcuts are
  the keyboard-shortcuts drop-in's responsibility. The palette
  deliberately does not register itself in the action registry — that
  would conflict with apps that bind a `system.palette` action to the
  same chord. Apps that want the palette in their cheatsheet register
  a stub action.
- **`enabled() === false` filters at the action level, not the row
  level.** Disabled actions never reach the Combobox, which means they
  don't show up in the empty-state group either, and arrow-key
  navigation doesn't skip over phantom rows. The registry leaves
  `enabled` evaluation to consumers; we evaluate on every render
  because the result may depend on app state outside the registry.
- **Recents persist on success, not on intent.** We update the recents
  list inside `runAction` after we've called the action's `run` — a
  user who opened the palette and immediately escaped doesn't pollute
  the list. We close the palette before invoking `run` so an action
  that opens its own dialog/route doesn't fight the palette for focus.
- **Source results bypass the local filter.** Source rows are
  force-included regardless of `command-score`. The source returned
  them for *this* query; double-filtering on top of the source's own
  ranking would occasionally hide a relevant result with low character
  overlap. Registered actions still go through `command-score` against
  `label`, `keywords`, and `group` so the usual fuzzy match works as
  expected.
- **Sources fire only on non-empty queries.** The empty-state list is
  recents + registered actions. Async sources tend to be expensive
  (network, RAG) and asking them to populate "what should I search
  for?" UI doesn't pay off. If you want eager source fetching, gate
  it inside the source's own `search` and ignore queries shorter than
  whatever threshold you like.
- **Shortcut glyph formatting lives here, not in
  `keyboard-shortcuts`.** The palette renders glyphs without parsing
  sequences (we only show the first variant of an alternates list and
  drop the "or" between chord groups — a list row has no horizontal
  room for that). Keeping a small `format-shortcut.ts` here means the
  drop-in stays self-contained; apps using both drop-ins can ignore
  this file and pass `formatShortcut` from keyboard-shortcuts to a
  custom row component if they want the richer rendering.
