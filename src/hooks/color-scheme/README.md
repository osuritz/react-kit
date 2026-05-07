# color-scheme

A drop-in React hook for resolving and applying a `light`/`dark` color
scheme. Works without a provider; ships a `ColorSchemeProvider` for advanced
cases. No npm package, no build step — copy the files into your app.

> **You don't need this hook for purely-styled components.** If a component
> only changes appearance via CSS (Tailwind's `dark:` variants, `:root[data-theme="dark"]`
> rules), the FOUC blocker script + the right attribute on `<html>` is all
> you need — no React state. Reach for the hook when JS itself needs to
> branch on the scheme: a theme toggle's controlled value, an SVG icon swap,
> a chart that picks colors at runtime, etc.

## What to copy

Copy these three files into your project (e.g. `src/hooks/color-scheme/`):

- `color-scheme.tsx` — provider, hook, resolver interface, and default
  `LocalStorageColorSchemeResolver`
- `fouc-blocker.ts` — `getColorSchemeFoucScript()` for SSR FOUC mitigation
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `color-scheme.test.tsx`) are the
**verification harness** — they live alongside the drop-in so `npm test`
works here, but they're not part of what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19).

## Quick start

```tsx
import { useColorScheme } from "./hooks/color-scheme/color-scheme";

function ThemeToggle() {
  const { colorScheme, userSpecifiedColorScheme, setColorScheme } = useColorScheme();
  return (
    <select
      value={userSpecifiedColorScheme}
      onChange={(e) => void setColorScheme(e.target.value as "light" | "dark" | "system")}
    >
      <option value="system">System ({colorScheme})</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

That's it — no provider needed. On first call, the hook lazily initializes a
module-scoped store that reads the OS preference, loads the persisted choice
from `localStorage`, and applies `<html data-theme="light|dark">`. All hook
consumers share that store, so updates in one component re-render the others.

If you want to override the defaults (storage key, target element, DOM
strategy, custom resolver), call `configureColorScheme()` once at app startup,
*before* any component calls `useColorScheme()`:

```tsx
import { configureColorScheme, LocalStorageColorSchemeResolver } from "./hooks/color-scheme/color-scheme";

configureColorScheme({
  resolver: new LocalStorageColorSchemeResolver({ storageKey: "my-app:theme" }),
  strategy: "class", // or "data-attribute" (default), "both", or a function
});
```

For scoped configuration (e.g. tests, multiple isolated subtrees, mounting
different schemes in different parts of the app), wrap with the provider:

```tsx
<ColorSchemeProvider strategy="class">
  <App />
</ColorSchemeProvider>
```

By default the resolved scheme is written to `<html data-theme="light|dark">`. Style your app with:

```css
:root[data-theme="dark"] { --bg: #111; --fg: #eee; }
:root[data-theme="light"] { --bg: #fff; --fg: #111; }
```

## API

### `configureColorScheme(options)` and `ColorSchemeProvider`

Both accept the same options:

| Option | Type | Default | Notes |
|---|---|---|---|
| `resolver` (provider: `colorSchemeResolver`) | `ColorSchemeResolver` | `new LocalStorageColorSchemeResolver()` (browser only) | Persistence backend. Pass your own to use cookies, IndexedDB, server state, etc. |
| `strategy` | `"data-attribute" \| "class" \| "both" \| (scheme) => void` | `"data-attribute"` | How the resolved scheme is applied to the DOM. |
| `target` | `HTMLElement` | `document.documentElement` | Target element for `data-attribute`/`class`/`both`. Ignored for the function form. |
| `attributeName` | `string` | `"data-theme"` | Attribute used by `data-attribute` and `both`. |

`configureColorScheme` mutates the module-scoped default store and only takes
effect if called *before* any `useColorScheme()` invocation. Subsequent calls
warn and are ignored. Use the provider when you need scoped or multiple
configurations.

#### `strategy` choices

- `"data-attribute"` (default): sets `<html data-theme="dark">`. Works with any
  CSS that targets `[data-theme="dark"]`.
- `"class"`: adds `light`/`dark` as a class on the target. Works out of the
  box with Tailwind's `darkMode: 'class'` (or `darkMode: 'selector'`). Note:
  this strategy unconditionally removes both `light` and `dark` from the
  target before adding the resolved one — don't use those class names on the
  same element for unrelated purposes.
- `"both"`: sets both, useful while migrating between conventions.
- function: called with `"light" | "dark"` on every change. Use this to write
  CSS variables, sync multiple targets, integrate with another framework, etc.

### `useColorScheme()`

```ts
const {
  colorScheme,                 // "light" | "dark" | null  (resolved value)
  isLoading,                   // true only on first render until the persisted choice resolves
  userSpecifiedColorScheme,    // "light" | "dark" | "system"
  systemColorScheme,           // "light" | "dark" | null  (OS-level)
  setColorScheme,              // (value) => Promise<void>; null is treated as "system"
} = useColorScheme();
```

`isLoading` semantics: it is `true` on first render and flips to `false` once
the resolver settles the persisted choice. It does **not** flip back to `true`
on subsequent `setColorScheme` calls — those update synchronously and persist
in the background, so wrapping a toggle in a spinner would just produce
flicker. `colorScheme` is non-null from first render via the system-preference
query as a fallback, so you don't need to gate UI on `isLoading` at all unless
you specifically want to delay paint until persisted state is loaded.

When called outside a `ColorSchemeProvider`, the hook reads from the module-
scoped default store (lazy-initialized on first call). Inside a provider, it
reads from that provider's scoped store instead.

### `getBrowserPreferredColorScheme()`

Returns the OS-preferred scheme synchronously (`"light"` if SSR or
`matchMedia` is unavailable).

### `ColorSchemeResolver` interface

```ts
interface ColorSchemeResolver {
  getCustomizedColorScheme(): Promise<UserSpecifiedColorScheme | null>;
  setCustomizedColorScheme(value: UserSpecifiedColorScheme | null): Promise<void>;
  subscribe?(callback: () => void): () => void;
}
```

Implement this for any custom backend (cookies, server, IndexedDB, etc.).
The optional `subscribe` lets the resolver notify the provider when the
persisted value may have changed externally — `LocalStorageColorSchemeResolver`
uses this to pick up cross-tab writes via the `storage` event. If you skip
`subscribe`, the provider just reads once at mount.

### `LocalStorageColorSchemeResolver`

```ts
new LocalStorageColorSchemeResolver({
  storageKey: "color-scheme",       // default
  storage: globalThis.localStorage, // pass any Storage-shaped object
});
```

Reads are case-insensitive and unrecognized stored values fall back to
`"system"`. Setting `"system"` or `null` *removes* the key (it does not write
the literal `"system"`). Implements `subscribe` via the `window`
`storage` event, so a theme change in one tab propagates to other tabs of
the same origin without a page reload.

## SSR / FOUC mitigation

If you render HTML on the server (Next.js, Remix, Astro, etc.), the user's
chosen scheme isn't known at HTML generation time, so the page can flash the
wrong theme before React hydrates. Inject a tiny synchronous script in
`<head>` that reads `localStorage` (and falls back to `prefers-color-scheme`)
before React boots:

```tsx
import { getColorSchemeFoucScript } from "./hooks/color-scheme/fouc-blocker";

// Next.js app router — in app/layout.tsx
<head>
  <script dangerouslySetInnerHTML={{ __html: getColorSchemeFoucScript() }} />
</head>
```

> **FOUC** = Flash of Unstyled Content — the brief flash where the page
> renders with one theme (server's default) before client JS swaps in the
> user's chosen theme.

`getColorSchemeFoucScript({ storageKey, attributeName, strategy })` accepts
the same options you pass to the provider. Make sure they match, or the
synchronous pre-paint and the React-side application will disagree.

## Testing this drop-in

This directory ships a Vitest harness so you can verify the code before
copying it:

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```

Coverage on `color-scheme.tsx` is ~93% line. The uncovered lines are the
SSR-typeof-window guards and a couple of error-path branches that would need
a Node-environment test pass to exercise; this is documented and not worth
the setup cost for a drop-in.

## Decisions made (where the spec left a choice)

- **Provider-optional via singleton store** — the hook works without a
  provider by lazily initializing a module-scoped store. All hook consumers
  (with no provider) share state; configuration is global via
  `configureColorScheme()`. The provider stays as an opt-in for scoped
  configuration, tests, or multiple isolated subtrees. Tradeoff: only one
  global config, set once before first use.
- **`isLoading` semantics** — `isLoading: true` only on first render until
  the resolver settles; subsequent `setColorScheme` calls do not flip it.
  `colorScheme` is non-null from first render via the system-preference
  query as a fallback, so consumers don't need to gate UI on `isLoading`.
- **Naming** — setter is `setColorScheme`. The reference's SWR-flavored
  `mutate` was dropped to avoid a misleading name (no key, no cache).
- **DOM env** — verification harness uses jsdom with a `localStorage`
  polyfill in `vitest.setup.ts` to dodge jsdom's `about:blank` storage
  block. happy-dom 12/15/20 each had a broken `localStorage` getter on this
  Node 22, so jsdom + polyfill was the simplest path.
