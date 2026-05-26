# Color-scheme: docs rewrite + demo page

Date: 2026-05-07

## Goal

Bring `useColorScheme` to feature parity with how shadcn documents dark mode:
one walkthrough per integration story (client-only vs SSR) and a live demo
page in this repo's Vite app showing the two recommended toggle patterns
(2-state icon button, 3-state segmented control).

Also: align the hook's default DOM strategy with the shadcn / Tailwind v4
convention (`.dark` class) so first-time users get the right behavior with
zero configuration.

## Non-goals

- Syntax highlighting on code snippets in the demo (heavy infra for one page).
- FOUC-blocking script in the Vite demo's `index.html` (brief flash on first
  paint is acceptable; the SSR walkthrough is where the script story lives).
- Routing or a multi-page demo structure.
- A `next-themes`-style provider component layer; the hook stays
  provider-optional, single-store-by-default.

## Changes

### 1. Default strategy: `data-attribute` → `class` (breaking)

Two files, same edit:

- `src/hooks/color-scheme/color-scheme.tsx` — `ColorSchemeStore` constructor:
  `this.strategy = options.strategy ?? "class";`
- `src/hooks/color-scheme/fouc-blocker.ts` — `getColorSchemeFoucScript`:
  `const strategy = options.strategy ?? "class";`

Rationale: shadcn's Tailwind v4 setup uses `@custom-variant dark (&:is(.dark *))`,
which keys off a `.dark` class. The hook's previous `data-attribute` default
required every shadcn user to call `configureColorScheme({ strategy: "class" })`
at startup. Flipping the default removes that papercut for the most common
integration. Documented as a breaking change in the README's "Decisions" section.

### 2. Tests: update assertions to match new default

`src/hooks/color-scheme/color-scheme.test.tsx` — any test that currently
exercises the default strategy and asserts `<html data-theme="...">` flips to
asserting the `.dark`/`.light` class. Tests that explicitly pass
`strategy: "data-attribute"` are unaffected.

Specifically:

- Tests asserting `documentElement.getAttribute("data-theme")` under the
  default store/provider switch to `documentElement.classList.contains("dark")`
  / `"light"`.
- The reset between tests should also clear both `data-theme` and any leftover
  `light`/`dark` classes on `<html>` to avoid cross-test pollution.

No new tests required for this change — the strategy machinery is already
tested via the explicit-strategy paths.

### 3. README rewrite

`src/hooks/color-scheme/README.md` keeps its current intro (the "what is
this" + "you don't need this hook for purely-styled components" callout) and
"What to copy" section. Replace the existing **Quick start** with two
labeled walkthroughs:

#### `## Client-only setup`

For Vite, CRA, or any non-SSR React app.

1. Copy the files (link back to "What to copy").
2. (Optional) Call `configureColorScheme()` at startup if you need a
   non-default storage key, target, or strategy. New default is `"class"`,
   so shadcn / Tailwind-class-mode users skip this entirely.
3. Drop in a `ModeToggle` component. Show the **3-state segmented**
   `ModeToggle` source as the canonical example — it's the richer pattern
   and matches shadcn's three-state dropdown story. Mention the 2-state
   button variant as a one-liner pointing at the demo page.

End with the CSS sketch:

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

(Note the change from `:root[data-theme="dark"]` to `.dark` — this is a
visible doc-level consequence of the strategy default flip.)

#### `## SSR setup`

For Next.js, Remix, Astro, etc.

1. Copy the files.
2. Inject the FOUC script in `<head>` synchronously, before React mounts.
   Show the Next.js app-router snippet:

   ```tsx
   import { getColorSchemeFoucScript } from './hooks/color-scheme/fouc-blocker';

   // app/layout.tsx
   <head>
     <script dangerouslySetInnerHTML={{ __html: getColorSchemeFoucScript() }} />
   </head>;
   ```

3. Mark the toggle as a client component (`"use client"`).
4. Use the same `ModeToggle` source as the client section.

Mention `suppressHydrationWarning` on `<html>` if the user picks a strategy
that mutates a server-rendered attribute the React tree also owns; for
`class` strategy this is rarely needed because the FOUC script writes the
class before React hydrates.

#### Section updates downstream of the default flip

- The API table (`### configureColorScheme(options) and ColorSchemeProvider`):
  the `strategy` row's default cell becomes `"class"`.
- The `getColorSchemeFoucScript` paragraph: default is `"class"`.
- The "Decisions made" section: add a bullet about the default strategy
  being `"class"` to align with shadcn / Tailwind class-based dark mode,
  with a note that pre-existing users on `"data-attribute"` should pass
  `strategy: "data-attribute"` explicitly.

### 4. Install shadcn ToggleGroup

`npx shadcn add toggle-group`

This adds `src/components/ui/toggle-group.tsx`. Verify after install:

- The component compiles and lints clean alongside the existing
  base-ui-flavored `src/components/ui/button.tsx`.
- No collisions in `package.json` (a Radix Toggle Group dep is expected
  and acceptable).
- If the install touches `index.css` or `components.json` in surprising
  ways, surface the diff before committing.

If the shadcn CLI lookup fails (404, registry mismatch with `style: "base-vega"`),
fall back to writing a minimal ToggleGroup primitive on top of
`@base-ui/react/toggle-group` styled to shadcn conventions, and note the
deviation in commit message + spec follow-up.

### 5. Demo components

Each lives in its own file so it can be both rendered live and read via
Vite's `?raw` import for the source-code panel.

#### `src/components/mode-toggle-button.tsx`

Two-state icon button, lucide-react `Sun` / `Moon`. Click flips to the
opposite of the **currently-resolved** scheme. Setting either `"light"`
or `"dark"` is explicit — the button breaks "system" tracking on first
click (this is the expected pattern for a binary toggle).

```tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from '#components/ui/button.tsx';
import { useColorScheme } from '#hooks/color-scheme/color-scheme';

export function ModeToggleButton() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
```

#### `src/components/mode-toggle-segmented.tsx`

Three-state `ToggleGroup` (single-select), bound to
`userSpecifiedColorScheme` ↔ `setColorScheme`. Sun / Moon / Monitor icons
plus a small caption that shows what `system` resolves to so the user can
see why the page looks the way it does.

```tsx
import { Monitor, Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '#components/ui/toggle-group.tsx';
import { useColorScheme } from '#hooks/color-scheme/color-scheme';

export function ModeToggleSegmented() {
  const { userSpecifiedColorScheme, colorScheme, setColorScheme } = useColorScheme();
  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        type="single"
        value={userSpecifiedColorScheme}
        onValueChange={(v) => v && setColorScheme(v as 'light' | 'dark' | 'system')}
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

(Exact prop names will follow whatever `npx shadcn add toggle-group` produces.)

### 6. Demo page

`src/App.tsx` becomes a single-page demo — no routing.

Structure:

- Header: `<h1>useColorScheme</h1>`, one-paragraph blurb, link to the
  hook README.
- Two stacked sections, each a card with two columns: live demo on the
  left, source-code `<pre>` on the right. On narrow viewports the columns
  stack.
- Section A: "Light / dark button" — `<ModeToggleButton />` + raw source
  via `import buttonSrc from "#components/mode-toggle-button.tsx?raw"`.
- Section B: "Light / dark / system segmented" — `<ModeToggleSegmented />`
  - raw source via `?raw` import.

Code panel styling: bordered, rounded, monospace `text-sm`, `overflow-x-auto`,
`bg-muted/30`. No syntax highlighting.

### 7. `main.tsx`

No changes. New `class` default means the default store applies the right
strategy without `configureColorScheme`.

### 8. `index.html`

No changes. Accepting brief first-paint flash for the demo. The SSR
walkthrough in the README is the canonical place for the FOUC-script story.

## Files touched

**Modify**

- `src/hooks/color-scheme/color-scheme.tsx`
- `src/hooks/color-scheme/fouc-blocker.ts`
- `src/hooks/color-scheme/color-scheme.test.tsx`
- `src/hooks/color-scheme/README.md`
- `src/App.tsx`

**Create**

- `src/components/mode-toggle-button.tsx`
- `src/components/mode-toggle-segmented.tsx`

**Add via shadcn CLI**

- `src/components/ui/toggle-group.tsx`

## Verification

- `npx tsc --noEmit` clean.
- `npm test` green (with updated assertions).
- `npm run dev` and manually verify: button toggles, segmented control
  toggles, "system" caption tracks OS preference, refresh persists choice,
  cross-tab updates propagate (open two tabs, change in one, watch the
  other update).
- `npm run build` succeeds.

## Risks / open items

- **Breaking default**: anyone already depending on `data-theme` as the
  default attribute will silently lose the attribute. Mitigation: documented
  in README "Decisions" + visible in the API table.
- **shadcn ToggleGroup compatibility**: the existing `Button` uses
  `@base-ui/react`; the new ToggleGroup will use Radix. Two primitive
  libraries coexisting is fine functionally but means slightly more deps
  and two patterns to maintain. Acknowledged tradeoff per design discussion.
- **Demo first-paint flash**: users on dark may see a light flash before
  the hook applies the class on mount. Acceptable for a demo. Documented
  remedy in the SSR walkthrough.
