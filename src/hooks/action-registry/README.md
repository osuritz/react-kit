# action-registry

A drop-in shared registry for app actions — `id`, `label`, and optional
`shortcut`/`group`/`keywords`/`icon`/`enabled`/`run`. The primitive a
keybinding hook and a command palette both subscribe to. No npm package, no
build step — copy the file into your app.

> **The registry is intentionally dumb.** It stores `Action` records,
> exposes `getAll()`, and notifies `subscribe`rs on change. It does _not_
> parse `shortcut`, render `icon`, evaluate `enabled`, or filter on `scope`
> — those are consumer concerns. Keep one source of truth (this registry),
> and let each consumer decide what to do with the actions it sees.

## What to copy

Copy this file into your project (e.g. `src/hooks/action-registry/`):

- `actions.tsx` — `Action` type, `ActionsProvider`, `useActions()`,
  `useAction()`
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `actions.test.tsx`) are the
**verification harness** — they live alongside the drop-in so `npm test`
works here, but they're not part of what you copy into your app.

Peer requirements: React 18+ (uses `useSyncExternalStore`).

## Setup

1. **Wrap your app** (or any subtree where the actions live) with
   `<ActionsProvider>`. Each provider owns its own registry — nesting
   creates an inner registry that's isolated from the outer one.

   ```tsx
   import { ActionsProvider } from './hooks/action-registry/actions';

   export function App() {
     return (
       <ActionsProvider>
         <Routes />
       </ActionsProvider>
     );
   }
   ```

2. **Register actions** from anywhere inside the provider with `useAction`.
   Re-renders that change `run`, `label`, etc. don't cause a re-register
   — only an `id` change does. That keeps subscriber traffic quiet while
   consumers (palette, shortcut hook) always see the latest fields.

   ```tsx
   import { useAction } from './hooks/action-registry/actions';

   export function SettingsRegister() {
     const navigate = useNavigate();
     useAction({
       id: 'nav.settings',
       label: 'Open Settings',
       group: 'Navigation',
       shortcut: 'mod+,',
       run: () => navigate('/settings'),
     });
     return null;
   }
   ```

3. **Read the registry** from a consumer. The recommended pattern is
   `useSyncExternalStore(subscribe, getAll, getAll)` — it gives you a
   stable array reference between renders and re-runs the consumer when
   the registry mutates:

   ```tsx
   import { useSyncExternalStore } from 'react';
   import { useActions } from './hooks/action-registry/actions';

   export function CommandList() {
     const { getAll, subscribe } = useActions();
     const actions = useSyncExternalStore(subscribe, getAll, getAll);
     return (
       <ul>
         {actions.map((a) => (
           <li key={a.id}>{a.label}</li>
         ))}
       </ul>
     );
   }
   ```

## API

### `<ActionsProvider>`

Owns one in-memory registry for its subtree. Provider-required: a
`useActions()` call outside any provider throws. Nested providers do **not**
inherit ancestor registries — each is isolated. The `Action.scope` field is
opaque metadata for consumers; the registry doesn't interpret it.

### `useActions(): ActionsContextValue`

```ts
interface ActionsContextValue {
  register: (action: Action) => () => void; // returns an idempotent unregister
  getAll: () => Action[]; // stable identity until next mutation
  getById: (id: string) => Action | undefined; // O(1) lookup
  subscribe: (listener: () => void) => () => void;
}
```

- `register(action)` returns an unregister fn. If the same `id` is
  registered twice, the registry warns and overwrites; the older
  registration's unregister fn becomes a no-op (it only deletes if the
  current entry is still the same instance).
- `getAll()` returns the same array reference until the next mutation, so
  it's safe to feed straight into `useSyncExternalStore`.
- `getById(id)` is an O(1) lookup against the registry's internal map.
  Use it for "execute this action by id" paths (deep links, recents,
  command-by-name) instead of scanning `getAll()`.
- `subscribe(listener)` fires `listener` after every register/unregister.
  The returned fn detaches it.

#### Subscriber semantics — read this before memoizing

Subscribers fire when actions are added, removed, or change their `id`
— i.e. on `register`, `unregister`, and `useAction` re-renders where
`action.id` itself changed. **Field-level updates do _not_ fire
subscribers.** A re-render of `useAction(...)` with the same `id` but a
new `label`, `keywords`, `enabled`, or `run` propagates through the
live getters on the registered Action — the next read sees the new
value, but no subscribe event is emitted.

The implication for consumers (palettes, shortcut hooks, anything that
caches across renders): **don't memoize derived state from action
fields without an independent invalidation signal.** A command palette
building a fuzzy-search index over `keywords`/`label` should rebuild
the index when the search input changes, when `subscribe` fires, _and_
on every render of the palette itself — not under the assumption that
`subscribe` will catch every visible change. The cheapest correct
pattern is to recompute on each render with a `useMemo` keyed by the
input plus `useSyncExternalStore(subscribe, getAll, getAll)`'s array
identity.

### `useAction(action: Action): void`

Registers `action` for the lifetime of the calling component. Identity is
keyed by `action.id`:

- Renders that change `run`, `label`, `shortcut`, etc. **do not**
  re-register and **do not** notify subscribers.
- Renders where `action.id` changes do unregister + register, firing two
  subscribe events.
- The registered entry reads `run`/`label`/`enabled`/etc. through a live
  ref written during render, so consumers reading the wrapper later in
  the same render commit see the latest values without a follow-up
  render.

### `Action`

```ts
type Action = {
  id: string; // stable, e.g. "nav.settings"
  label: string; // shown in palette
  group?: string; // "Navigation", "Settings", ...
  keywords?: string[]; // extra fuzzy-match terms
  shortcut?: string | string[]; // "mod+k", "g i", ["mod+s","ctrl+s"]
  scope?: string; // "global" (default) | route/component scope id
  enabled?: () => boolean;
  run: (ctx: ActionRunContext) => void | Promise<void>;
  icon?: React.ReactNode;
};

interface ActionRunContext {
  event?: KeyboardEvent; // present only when invoked by keyboard-shortcuts
  source?: ActionSource; // identifies the invoking surface
}

type ActionSource = 'shortcut' | 'palette' | (string & {});
```

The `shortcut` string is consumed by the keybinding hook, not the registry
— `"mod"` resolves to `cmd` on macOS / `ctrl` elsewhere; sequences are
space-separated (`"g i"`).

#### `ctx.source` — invocation attribution

Both consumer drop-ins identify themselves: keyboard-shortcuts passes
`source: "shortcut"`, command-palette passes `source: "palette"`. App
callers that invoke `action.run` directly (a button click, a context
menu, a programmatic dispatch) should pass their own value
(`"click"`, `"menu"`, …). The registry doesn't read this field — it's
threaded through verbatim by the `useAction` wrapper. Useful for
analytics, logging, or "did the user reach this via keyboard?"
branching inside an action.

## Testing this drop-in

This directory ships a Vitest harness so you can verify the code before
copying it:

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```

## Decisions made (where the spec left a choice)

- **Provider-required, isolated per provider.** Each `<ActionsProvider>`
  owns its own registry; nested providers do not inherit ancestor actions.
  Keeps lookup predictable and matches React context norms. The `scope`
  field on `Action` is opaque metadata for consumers (palette/shortcut hook)
  to filter on — the registry itself doesn't care.
- **Registry stores `Action` records as-is — no DOM, no shortcut parsing,
  no `enabled` evaluation.** Those are consumer concerns. The registry's
  job is "who has registered, and tell me when that changes."
- **`useAction` keys identity by `id`.** A live getter wrapper means
  callbacks and labels stay fresh between renders without churning
  subscribers — important when a command palette or shortcut hook is
  reading the list on every keystroke. The wrapper writes its ref
  during render so consumers reading the registry later in the same
  commit see the new values without a second render. (A render that
  React discards still runs the ref write; React's normal re-render of
  the registrar with the committed state restores the ref on the next
  pass. If you need stronger concurrent-render guarantees, encode the
  varying state in `id` instead of mutating fields in place.)
- **`getById` is on the API surface.** Palette deep-links and "execute
  by id" paths happen often enough that an O(n) `getAll().find(...)`
  would be a footgun. Since the registry already keys its internal map
  by id, exposing `getById` is free.
- **`id` collision warns + overwrites.** Two components claiming the same
  id is almost always a bug; the warn surfaces it without hard-crashing
  apps where two unrelated trees happen to mount the same id briefly. The
  losing registration's unregister fn becomes a no-op so it can't tear down
  the replacement.
- **No `unregister`-by-id helper.** `register` returns its own unregister
  fn — same pattern as `addEventListener`. Keeps the API to three methods.
