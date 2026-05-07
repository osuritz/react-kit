# color-scheme

A drop-in React provider + hook for resolving and applying a `light`/`dark`
color scheme. No npm package, no build step — copy the files into your app.

## What to copy

Copy these three files into your project (e.g. `src/hooks/color-scheme/`):

- `color-scheme.tsx` — provider, hook, resolver interface, and default
  `LocalStorageColorSchemeResolver`
- `fouc-blocker.ts` — `getColorSchemeFoucScript()` for SSR FOUC mitigation
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `color-scheme.test.tsx`) are a
**throwaway verification harness** — they exist only to run the test suite.
Don't ship them to your app.

Peer requirements: React 18+ (works in 18 and 19).

## Quick start

```tsx
import { ColorSchemeProvider, useColorScheme } from "./hooks/color-scheme/color-scheme";

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

function App() {
  return (
    <ColorSchemeProvider>
      <ThemeToggle />
      {/* your app */}
    </ColorSchemeProvider>
  );
}
```

By default the provider sets `<html data-theme="light|dark">`. Style your app with:

```css
:root[data-theme="dark"] { --bg: #111; --fg: #eee; }
:root[data-theme="light"] { --bg: #fff; --fg: #111; }
```

## API

### `ColorSchemeProvider`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `colorSchemeResolver` | `ColorSchemeResolver` | `new LocalStorageColorSchemeResolver()` (browser only) | Persistence backend. Pass your own to use cookies, IndexedDB, server state, etc. |
| `strategy` | `"data-attribute" \| "class" \| "both" \| (scheme) => void` | `"data-attribute"` | How the resolved scheme is applied to the DOM. |
| `target` | `HTMLElement` | `document.documentElement` | Target element for `data-attribute`/`class`/`both`. Ignored for the function form. |
| `attributeName` | `string` | `"data-theme"` | Attribute used by `data-attribute` and `both`. |

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

`useColorScheme` throws if used outside a `ColorSchemeProvider`.

### `getBrowserPreferredColorScheme()`

Returns the OS-preferred scheme synchronously (`"light"` if SSR or
`matchMedia` is unavailable).

### `ColorSchemeResolver` interface

```ts
interface ColorSchemeResolver {
  getCustomizedColorScheme(): Promise<UserSpecifiedColorScheme | null>;
  setCustomizedColorScheme(value: UserSpecifiedColorScheme | null): Promise<void>;
}
```

Implement this for any custom backend (cookies, server, IndexedDB, etc.).

### `LocalStorageColorSchemeResolver`

```ts
new LocalStorageColorSchemeResolver({
  storageKey: "color-scheme",       // default
  storage: globalThis.localStorage, // pass any Storage-shaped object
});
```

Reads are case-insensitive and unrecognized stored values fall back to
`"system"`. Setting `"system"` or `null` *removes* the key (it does not write
the literal `"system"`).

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

Coverage on `color-scheme.tsx` is ~91% line. The uncovered lines are the
SSR-typeof-window guards and a couple of error-path branches that would need
a Node-environment test pass to exercise; this is documented and not worth
the setup cost for a drop-in.

## Decisions made (where the spec left a choice)

- **`isLoading` semantics** — kept `isLoading: true` on first render and
  documented it. The alternative (initial `colorScheme: null` until resolver
  settles) forces every consumer to either gate UI or accept a `null` flash;
  fallback-to-system is the friendlier default.
- **Naming** — setter is `setColorScheme`. The reference's SWR-flavored
  `mutate` was dropped to avoid a misleading name (no key, no cache).
- **DOM env** — verification harness uses jsdom (happy-dom 12/15/20 all had
  a broken `localStorage` getter on this Node 22). `localStorage` is
  polyfilled in `vitest.setup.ts` to dodge jsdom's `about:blank` storage
  block.
