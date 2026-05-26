# color-scheme

A drop-in React hook for resolving and applying a `light`/`dark` color
scheme. Works without a provider; ships a `ColorSchemeProvider` for advanced
cases. No npm package, no build step — copy the files into your app.

> **You don't need this hook for purely-styled components.** If a component
> only changes appearance via CSS (Tailwind's `dark:` variants, `.dark` class
> rules), the FOUC blocker script + the right class on `<html>` is all you
> need — no React state. Reach for the hook when JS itself needs to branch
> on the scheme: a theme toggle's controlled value, an SVG icon swap, a
> chart that picks colors at runtime, etc.

## What to copy

Copy these three files into your project (e.g. `src/hooks/color-scheme/`):

- `color-scheme.tsx` — provider, hook, resolver interface, and default
  `LocalStorageColorSchemeResolver`
- `fouc-blocker.ts` — `getColorSchemeFoucScript()` for SSR FOUC mitigation
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `color-scheme.test.tsx`) are the
**verification harness** — they live alongside the drop-in so `npm test`
works here, but they're not part of what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19).

## Client-only setup

For Vite, CRA, or any non-SSR React app.

1. **Copy the files** ([what to copy](#what-to-copy)) into your project, e.g.
   `src/hooks/color-scheme/`.

2. **(Optional) Configure** at app startup if you need a non-default storage
   key, target, attribute, or strategy. The default strategy is `"class"`,
   so shadcn / Tailwind class-mode users skip this entirely:

   ```tsx
   // main.tsx — runs once, before any component renders
   import {
     configureColorScheme,
     LocalStorageColorSchemeResolver,
   } from './hooks/color-scheme/color-scheme';

   configureColorScheme({
     resolver: new LocalStorageColorSchemeResolver({ storageKey: 'my-app:theme' }),
     // strategy: "data-attribute", // opt out of class-based theming
   });
   ```

3. **Drop in a `ModeToggle`.** Below is a 3-state segmented control (light /
   dark / system) — the canonical pattern. A 2-state icon button is also
   common; see the demo page for that variant.

   ```tsx
   import { Monitor, Moon, Sun } from 'lucide-react';
   import { ToggleGroup, ToggleGroupItem } from '#components/ui/toggle-group.tsx';
   import {
     useColorScheme,
     type UserSpecifiedColorScheme,
   } from './hooks/color-scheme/color-scheme';

   export function ModeToggle() {
     const { userSpecifiedColorScheme, colorScheme, setColorScheme } = useColorScheme();
     return (
       <div className="flex flex-col gap-2">
         <ToggleGroup<UserSpecifiedColorScheme>
           value={[userSpecifiedColorScheme]}
           onValueChange={([next]) => next && void setColorScheme(next)}
         >
           <ToggleGroupItem value="light" aria-label="Light">
             <Sun />
           </ToggleGroupItem>
           <ToggleGroupItem value="dark" aria-label="Dark">
             <Moon />
           </ToggleGroupItem>
           <ToggleGroupItem value="system" aria-label="System">
             <Monitor />
           </ToggleGroupItem>
         </ToggleGroup>
         {userSpecifiedColorScheme === 'system' && (
           <p className="text-muted-foreground text-xs">System resolves to: {colorScheme}</p>
         )}
       </div>
     );
   }
   ```

That's it — no provider needed. On first hook call, a module-scoped store
reads the OS preference, loads the persisted choice from `localStorage`, and
toggles `<html class="light|dark">`. All hook consumers share that store, so
updates in one component re-render the others.

Style your app to react to the class:

```css
:root {
  --bg: #fff;
  --fg: #111;
}
.dark {
  --bg: #111;
  --fg: #eee;
}
```

Or with Tailwind v4, declare the dark variant once in your CSS:

```css
@custom-variant dark (&:is(.dark *));
```

For scoped configuration (tests, multiple isolated subtrees, mounting
different schemes in different parts of the app), wrap with the provider
instead of calling `configureColorScheme`:

```tsx
<ColorSchemeProvider strategy="data-attribute">
  <App />
</ColorSchemeProvider>
```

## SSR setup

For Next.js, Remix, Astro, or any framework that ships HTML before client JS
runs. Same hook, plus a synchronous pre-paint script so the page doesn't
flash the wrong theme.

1. **Copy the files** ([what to copy](#what-to-copy)) into your project.

2. **Inject the FOUC script** in `<head>`, synchronously, before React
   mounts. The script reads `localStorage` (with `prefers-color-scheme` as
   fallback) and applies the correct class to `<html>` before first paint.
   No options are passed below — the script's defaults match the hook's
   defaults. If you customize either side, see step 4:

   ```tsx
   // app/layout.tsx (Next.js app router)
   import { getColorSchemeFoucScript } from './hooks/color-scheme/fouc-blocker';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>
           <script dangerouslySetInnerHTML={{ __html: getColorSchemeFoucScript() }} />
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```

   > **FOUC** = Flash of Unstyled Content — the brief flash where the page
   > renders with the server's default theme before client JS swaps in the
   > user's chosen theme.

   `suppressHydrationWarning` on `<html>` is rarely needed with the `class`
   strategy because the script writes the class before React hydrates, but
   keep it in if you ever toggle `strategy: "data-attribute"` and the
   server-rendered tree disagrees with what the script wrote.

3. **Mark the toggle as a client component** (`"use client"` in Next.js).
   Use the same `ModeToggle` component shown in the [Client-only setup](#client-only-setup)
   above.

4. **(Optional) Configure** any non-default options. If you customize
   `storageKey`, `attributeName`, or `strategy`, pass the same options to
   `getColorSchemeFoucScript()` _and_ `configureColorScheme()` — the
   pre-paint script and the React-side hook must agree, or hydration will
   show a flash:

   ```tsx
   const opts = { storageKey: 'my-app:theme' } as const;
   // pre-paint
   <script dangerouslySetInnerHTML={{ __html: getColorSchemeFoucScript(opts) }} />;
   // app boot
   configureColorScheme({ resolver: new LocalStorageColorSchemeResolver(opts) });
   ```

## API

### `configureColorScheme(options)` and `ColorSchemeProvider`

Both accept the same options:

| Option                                       | Type                                                        | Default                                                | Notes                                                                              |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `resolver` (provider: `colorSchemeResolver`) | `ColorSchemeResolver`                                       | `new LocalStorageColorSchemeResolver()` (browser only) | Persistence backend. Pass your own to use cookies, IndexedDB, server state, etc.   |
| `strategy`                                   | `"data-attribute" \| "class" \| "both" \| (scheme) => void` | `"class"`                                              | How the resolved scheme is applied to the DOM.                                     |
| `target`                                     | `HTMLElement`                                               | `document.documentElement`                             | Target element for `data-attribute`/`class`/`both`. Ignored for the function form. |
| `attributeName`                              | `string`                                                    | `"data-theme"`                                         | Attribute used by `data-attribute` and `both`.                                     |

`configureColorScheme` mutates the module-scoped default store and only takes
effect if called _before_ any `useColorScheme()` invocation. Subsequent calls
warn and are ignored. Use the provider when you need scoped or multiple
configurations.

#### `strategy` choices

- `"class"` (default): adds `light`/`dark` as a class on the target. Works
  out of the box with shadcn / Tailwind v4 (`@custom-variant dark (&:is(.dark *))`)
  and Tailwind v3's `darkMode: 'class'` / `darkMode: 'selector'`. Note: this
  strategy unconditionally removes both `light` and `dark` from the target
  before adding the resolved one — don't use those class names on the same
  element for unrelated purposes. Most CSS that branches on `.dark`
  (Tailwind's `dark:` variants included) targets _descendants_ of the
  element with the class, so make sure your `target` is an ancestor of
  everything you want to react to it. Default (`<html>`) covers everything.
- `"data-attribute"`: sets `<html data-theme="dark">`. Works with any CSS that
  targets `[data-theme="dark"]`.
- `"both"`: sets both, useful while migrating between conventions.
- function: called with `"light" | "dark"` on every change. Use this to write
  CSS variables, sync multiple targets, integrate with another framework, etc.

### `useColorScheme()`

```ts
const {
  colorScheme, // "light" | "dark" | null  (resolved value)
  isLoading, // true only on first render until the persisted choice resolves
  userSpecifiedColorScheme, // "light" | "dark" | "system"
  systemColorScheme, // "light" | "dark" | null  (OS-level)
  setColorScheme, // (value) => Promise<void>; null is treated as "system"
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
  storageKey: 'color-scheme', // default
  storage: globalThis.localStorage, // pass any Storage-shaped object
});
```

Reads are case-insensitive and unrecognized stored values fall back to
`"system"`. Setting `"system"` or `null` _removes_ the key (it does not write
the literal `"system"`). Implements `subscribe` via the `window`
`storage` event, so a theme change in one tab propagates to other tabs of
the same origin without a page reload.

### `getColorSchemeFoucScript(options)`

Returns the IIFE-shaped JS string used by the [SSR setup](#ssr-setup)'s
pre-paint script. Accepts `{ storageKey, attributeName, strategy }` —
defaults match the hook (`"color-scheme"`, `"data-theme"`, `"class"`). If
you pass any of those options to `configureColorScheme` / `ColorSchemeProvider`,
pass the same options here, or the pre-paint and React-side application
will disagree and you'll see a flash.

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

- **Default DOM strategy is `"class"`** — to align with shadcn / Tailwind v4
  (`@custom-variant dark (&:is(.dark *))`) and Tailwind v3's class-mode dark
  variant. Most users get the right behavior with no configuration. If you
  were depending on the previous `"data-attribute"` default, pass
  `strategy: "data-attribute"` explicitly to `configureColorScheme()` /
  `ColorSchemeProvider` and to `getColorSchemeFoucScript()`.
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
