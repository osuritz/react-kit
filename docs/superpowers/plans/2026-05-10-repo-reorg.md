# Repo Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split drop-in source (`src/`) from demo site (`app/`), give each drop-in its own route, and deploy to GitHub Pages.

**Architecture:** Filesystem-level split — one `package.json`, one Vite config, one tsconfig. `src/` keeps the drop-ins (unchanged), new `app/` holds all demo glue with `react-router` v7 driving per-drop-in pages. GitHub Actions builds and deploys to `osuritz.github.io/react-kit/` via the official `actions/deploy-pages` flow + a `404.html` SPA shim.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4, shadcn primitives, `react-router` v7. Spec: `docs/superpowers/specs/2026-05-10-repo-reorg-design.md`.

---

## Conventions used in this plan

- All paths are repo-root-relative.
- `~/*` resolves to `./app/*` (added in Task 2). `#*` resolves to `./src/*` (existing, unchanged).
- "Verify dev" means `npm run dev` boots cleanly and the URL given works in a browser. Quit the dev server (Ctrl-C) before moving to the next task unless the task says otherwise.
- Each task ends in a single commit. Use `git add` for the specific files the task touched — never `git add -A`.
- Drop-in folders under `src/hooks/<name>/` and `src/components/<name>/` are **never** modified by this plan. If a step appears to require editing one, stop and re-read the spec.

---

## Phase 1 — Scaffold `app/` with placeholder routing

Goal of this phase: a fully working dev server that renders the new `app/` site layout and all six placeholder routes, while the existing `src/App.tsx` is still around but no longer the entry point.

### Task 1: Install `react-router`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install react-router@^7`
Expected: `react-router` appears under `"dependencies"` in `package.json`; `package-lock.json` updates.

- [ ] **Step 2: Verify the install**

Run: `node -e "console.log(require('react-router/package.json').version)"`
Expected: prints a version string starting with `7.`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-router for the demo-site reorg"
```

---

### Task 2: Wire up build config (Vite alias + tsconfig paths)

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`

- [ ] **Step 1: Add the `~` alias and `react-router` dedupe to `vite.config.ts`**

Replace the file with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Each drop-in folder under src/{hooks,components}/<name>/ ships its own
// isolated test harness (its own package.json with React 18 in devDeps), so
// `node_modules/` exists *inside* `src/`. Without dedupe, Vite walks up from
// a drop-in source file and resolves shared packages from the harness's
// nested install instead of the root.
//
// `react` / `react-dom` produce a hard "A React Element from an older version
// of React was rendered" runtime error when duplicated. `@base-ui/react`,
// `react-day-picker`, `react-router`, and any other Context-using library
// would fail more silently — Combobox items would not register with their
// root, popovers would not anchor, route navigation would not propagate — so
// dedupe them too.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
    dedupe: [
      "react",
      "react-dom",
      "@base-ui/react",
      "react-day-picker",
      "react-router",
    ],
  },
});
```

- [ ] **Step 2: Update `tsconfig.app.json` to include `app/` and resolve `~/*`**

Replace the file with:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,

    /* Aliases */
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    }
  },
  "include": ["src", "app"],
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/vitest.config.ts",
    "src/**/vitest.setup.ts"
  ]
}
```

- [ ] **Step 3: Verify config files parse**

Run: `npx tsc -b --dry`
Expected: exits 0, no errors. (If you see a "no inputs were found" error for `app`, that's expected and OK at this point — the directory doesn't exist yet. The next tasks create it.)

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts tsconfig.app.json
git commit -m "chore: wire up app/ alias and react-router dedupe"
```

---

### Task 3: Create `app/` entry point and CSS

**Files:**
- Create: `app/index.css` (verbatim copy of `src/index.css`)
- Create: `app/main.tsx`
- Modify: `index.html`

- [ ] **Step 1: Copy `src/index.css` to `app/index.css`**

```bash
mkdir -p app
cp src/index.css app/index.css
```

(No content changes — Tailwind layers and shadcn tokens are identical.)

- [ ] **Step 2: Create `app/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 3: Update `index.html` script src**

Edit the `<script>` tag's `src` attribute from `/src/main.tsx` to `/app/main.tsx`. The full file should read:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>react-kit-demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Don't run anything yet**

`app/router.tsx` doesn't exist; `npm run dev` would error. The next tasks create the router and routes. Move on without verification.

- [ ] **Step 5: Commit**

```bash
git add app/index.css app/main.tsx index.html
git commit -m "feat(app): add demo-site entry point and CSS"
```

---

### Task 4: Create `app/components/site-layout.tsx`

**Files:**
- Create: `app/components/site-layout.tsx`

The site layout is the chrome that wraps every route: top header + left sidebar (grouped nav links) + outlet for the active route.

- [ ] **Step 1: Create the file**

```tsx
import { NavLink, Outlet } from "react-router";

interface NavGroup {
  heading: string;
  items: ReadonlyArray<{ to: string; label: string }>;
}

const NAV: ReadonlyArray<NavGroup> = [
  {
    heading: "Hooks",
    items: [
      { to: "/color-scheme", label: "useColorScheme" },
      { to: "/action-registry", label: "action-registry" },
    ],
  },
  {
    heading: "Components",
    items: [
      { to: "/search-facets", label: "SearchFacets" },
      { to: "/keyboard-shortcuts", label: "KeyboardShortcuts" },
      { to: "/command-palette", label: "CommandPalette" },
    ],
  },
  {
    heading: "Demos",
    items: [{ to: "/integration", label: "Integration" }],
  },
];

export function SiteLayout() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-border bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <NavLink
            to="/"
            className="text-base font-semibold tracking-tight hover:opacity-80"
          >
            react-kit
          </NavLink>
          <a
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            href="https://github.com/osuritz/react-kit"
          >
            GitHub →
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-8 md:py-12">
        <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-48 shrink-0 self-start overflow-y-auto md:block">
          <nav className="flex flex-col gap-6">
            {NAV.map((group) => (
              <div key={group.heading} className="flex flex-col gap-1.5">
                <h2 className="text-muted-foreground px-2 text-[11px] font-semibold tracking-wider uppercase">
                  {group.heading}
                </h2>
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          [
                            "block rounded-md border-l-2 px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "border-foreground text-foreground bg-muted/50"
                              : "text-muted-foreground hover:text-foreground border-transparent",
                          ].join(" ")
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/site-layout.tsx
git commit -m "feat(app): add SiteLayout chrome with sidebar nav"
```

---

### Task 5: Create `app/components/demo-card.tsx` and `app/components/drop-in-page.tsx`

**Files:**
- Create: `app/components/demo-card.tsx`
- Create: `app/components/drop-in-page.tsx`

Both extracted from the existing `src/App.tsx` (`DemoCard` and `DropIn` helpers, lines 144-212), generalized so each route can render multiple demos by passing data.

- [ ] **Step 1: Create `app/components/demo-card.tsx`**

```tsx
import type { ReactNode } from "react";

export interface DemoCardProps {
  title: string;
  description: string;
  source: string;
  render: ReactNode;
}

export function DemoCard({ title, description, source, render }: DemoCardProps) {
  return (
    <section className="border-border bg-card text-card-foreground overflow-hidden rounded-lg border shadow-xs">
      <header className="border-border border-b px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </header>
      <div className="border-border flex min-h-32 items-center justify-center border-b p-6">
        {render}
      </div>
      <pre className="bg-muted/30 max-h-80 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <code>{source}</code>
      </pre>
    </section>
  );
}
```

- [ ] **Step 2: Create `app/components/drop-in-page.tsx`**

```tsx
import { DemoCard, type DemoCardProps } from "./demo-card";

export interface DropInPageProps {
  title: string;
  description: string;
  sourceHref: string;
  readmeHref: string;
  demos: ReadonlyArray<DemoCardProps>;
}

export function DropInPage({
  title,
  description,
  sourceHref,
  readmeHref,
  demos,
}: DropInPageProps) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          {description}
        </p>
        <p className="flex gap-4 text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={readmeHref}
          >
            README →
          </a>
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={sourceHref}
          >
            Source on GitHub →
          </a>
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {demos.map((demo) => (
          <DemoCard key={demo.title} {...demo} />
        ))}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/demo-card.tsx app/components/drop-in-page.tsx
git commit -m "feat(app): add DemoCard and DropInPage building blocks"
```

---

### Task 6: Create `app/router.tsx` + placeholder routes

**Files:**
- Create: `app/routes/index.tsx`
- Create: `app/routes/color-scheme.tsx`
- Create: `app/routes/action-registry.tsx`
- Create: `app/routes/search-facets.tsx`
- Create: `app/routes/keyboard-shortcuts.tsx`
- Create: `app/routes/command-palette.tsx`
- Create: `app/routes/integration.tsx`
- Create: `app/router.tsx`

The placeholder routes are stubs that prove the router and layout work. They're replaced one-by-one in Phase 3.

- [ ] **Step 1: Create the landing route**

```tsx
// app/routes/index.tsx
import { NavLink } from "react-router";

const ENTRIES: ReadonlyArray<{ to: string; label: string; blurb: string }> = [
  {
    to: "/color-scheme",
    label: "useColorScheme",
    blurb: "Light/dark color scheme hook with SSR FOUC blocker.",
  },
  {
    to: "/action-registry",
    label: "action-registry",
    blurb: "Shared registry that the keybinding hook and command palette subscribe to.",
  },
  {
    to: "/search-facets",
    label: "SearchFacets",
    blurb: "Schema-driven faceted search bar with Gmail-flavor grammar.",
  },
  {
    to: "/keyboard-shortcuts",
    label: "KeyboardShortcuts",
    blurb: "Keybinding layer + cheatsheet that consume the action registry.",
  },
  {
    to: "/command-palette",
    label: "CommandPalette",
    blurb: "⌘K launcher built on cmdk with async sources.",
  },
  {
    to: "/integration",
    label: "Integration demo",
    blurb: "All three action drop-ins wired together end-to-end.",
  },
];

export default function IndexRoute() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          react-kit
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          Lightweight, copy-paste React hooks and components for common
          frontend patterns. Each entry below is a self-contained drop-in
          with its own README and verification harness — no npm install,
          no build step, just copy the folder.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <li key={entry.to}>
            <NavLink
              to={entry.to}
              className="border-border bg-card hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
            >
              <h2 className="text-base font-semibold">{entry.label}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {entry.blurb}
              </p>
            </NavLink>
          </li>
        ))}
      </ul>
    </article>
  );
}
```

- [ ] **Step 2: Create the six drop-in placeholder routes**

For each path in this list, create a file with the corresponding stub:

| File | Title shown |
| --- | --- |
| `app/routes/color-scheme.tsx` | `useColorScheme` |
| `app/routes/action-registry.tsx` | `action-registry` |
| `app/routes/search-facets.tsx` | `SearchFacets` |
| `app/routes/keyboard-shortcuts.tsx` | `KeyboardShortcuts` |
| `app/routes/command-palette.tsx` | `CommandPalette` |
| `app/routes/integration.tsx` | `Integration demo` |

Stub template (replace `TITLE_HERE` with the title for each file):

```tsx
export default function PlaceholderRoute() {
  return (
    <article className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        TITLE_HERE
      </h1>
      <p className="text-muted-foreground text-sm">
        TODO — wired up in Phase 3.
      </p>
    </article>
  );
}
```

- [ ] **Step 3: Create `app/router.tsx`**

```tsx
import { createBrowserRouter } from "react-router";
import { SiteLayout } from "./components/site-layout";
import IndexRoute from "./routes/index";
import ColorSchemeRoute from "./routes/color-scheme";
import ActionRegistryRoute from "./routes/action-registry";
import SearchFacetsRoute from "./routes/search-facets";
import KeyboardShortcutsRoute from "./routes/keyboard-shortcuts";
import CommandPaletteRoute from "./routes/command-palette";
import IntegrationRoute from "./routes/integration";

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: "/", element: <IndexRoute /> },
      { path: "color-scheme", element: <ColorSchemeRoute /> },
      { path: "action-registry", element: <ActionRegistryRoute /> },
      { path: "search-facets", element: <SearchFacetsRoute /> },
      { path: "keyboard-shortcuts", element: <KeyboardShortcutsRoute /> },
      { path: "command-palette", element: <CommandPaletteRoute /> },
      { path: "integration", element: <IntegrationRoute /> },
      { path: "*", element: <IndexRoute /> },
    ],
  },
]);
```

- [ ] **Step 4: Verify dev server boots and routing works**

Run: `npm run dev`
In a browser, visit:
- `http://localhost:5173/` — landing page with 6 cards.
- Click one of the cards (e.g. "useColorScheme") — URL changes to `/color-scheme`, page shows "TODO — wired up in Phase 3."
- Click each sidebar link — URL changes, active item gets the left-border highlight.
- Visit `http://localhost:5173/totally-bogus` — falls through to the landing page.

Quit the dev server (Ctrl-C) when done.

- [ ] **Step 5: Commit**

```bash
git add app/router.tsx app/routes/
git commit -m "feat(app): add router and placeholder routes for every drop-in"
```

---

## Phase 2 — Move shadcn primitives and `lib/utils` out of `src/`

Goal: `src/components/ui/` and `src/lib/utils.ts` live under `app/`. After this phase, `src/` still contains the old `App.tsx` and the demo wrappers but no shadcn glue.

### Task 7: Move shadcn ui + `lib/utils.ts` to `app/`

**Files:**
- Move: `src/components/ui/button.tsx` → `app/components/ui/button.tsx`
- Move: `src/components/ui/toggle.tsx` → `app/components/ui/toggle.tsx`
- Move: `src/components/ui/toggle-group.tsx` → `app/components/ui/toggle-group.tsx`
- Move: `src/lib/utils.ts` → `app/lib/utils.ts`
- Modify: `app/components/ui/button.tsx` (rewrite import)
- Modify: `app/components/ui/toggle.tsx` (rewrite import)
- Modify: `app/components/ui/toggle-group.tsx` (rewrite import)
- Modify: `components.json` (alias paths)

The moves and import rewrites have to happen together — moving `lib/utils.ts` alone would break the existing `src/components/ui/*.tsx` files that still import from `#lib/utils.ts`. We move the ui files in the same task so the `#`-rooted import becomes a `~`-rooted one in the new location.

`src/components/*-demo.tsx` files (still present until Phase 3) import the ui components via `#components/ui/...`. After this task they'll briefly be broken, but `src/App.tsx` is not the entry point anymore (Task 3 swapped `index.html`), so the dev server doesn't load them. The `tsc` typecheck *will* see the broken imports — Task 7 step 4 below confirms the dev server still boots; the typecheck is deferred until the demos move in Phase 3.

- [ ] **Step 1: Move the files**

```bash
mkdir -p app/components/ui app/lib
git mv src/components/ui/button.tsx app/components/ui/button.tsx
git mv src/components/ui/toggle.tsx app/components/ui/toggle.tsx
git mv src/components/ui/toggle-group.tsx app/components/ui/toggle-group.tsx
git mv src/lib/utils.ts app/lib/utils.ts
```

After this, `src/components/ui/` and `src/lib/` are empty. Remove them:

```bash
rmdir src/components/ui src/lib
```

- [ ] **Step 2: Rewrite `#lib/utils.ts` imports inside the moved ui files**

Each of the three ui files imports `cn` from `#lib/utils.ts`. Update each:

In `app/components/ui/button.tsx`, change:

```ts
import { cn } from "#lib/utils.ts"
```

to:

```ts
import { cn } from "~/lib/utils.ts"
```

Apply the same edit to `app/components/ui/toggle.tsx` and `app/components/ui/toggle-group.tsx`.

- [ ] **Step 3: Update `components.json` aliases**

Replace the file with:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "~/components",
    "utils": "~/lib/utils",
    "ui": "~/components/ui",
    "lib": "~/lib",
    "hooks": "#hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

(The `hooks` alias keeps pointing at `#hooks` because hooks live under `src/hooks/` and remain drop-in source.)

- [ ] **Step 4: Verify dev server still boots**

Run: `npm run dev`
In a browser, visit `http://localhost:5173/`.
Expected: landing page renders without errors. Sidebar nav still works. (The placeholder routes don't import shadcn ui yet, so this only proves the move didn't break the scaffold.)

Quit the dev server (Ctrl-C) when done.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui app/lib components.json src/components src/lib
git commit -m "refactor: move shadcn ui and lib/utils from src/ to app/"
```

---

## Phase 3 — Migrate demo wrappers one drop-in at a time

Each task in this phase:
1. Moves one drop-in's demo wrapper file(s) from `src/components/` to `app/components/demos/`.
2. Drops the `-demo` suffix.
3. Rewrites `#components/ui/...` → `~/components/ui/...` and `#lib/utils.ts` → `~/lib/utils.ts` inside the moved file(s). Drop-in imports (`#hooks/<name>/...`, `#components/<name>/...`) are left alone.
4. Replaces the placeholder route with a real `DropInPage`-based file.
5. Verifies in the browser.
6. Commits.

The order is least-coupled-first so a regression early on is easy to bisect.

### Task 8: Migrate `color-scheme`

**Files:**
- Move: `src/components/mode-toggle-button-demo.tsx` → `app/components/demos/mode-toggle-button.tsx`
- Move: `src/components/mode-toggle-segmented-demo.tsx` → `app/components/demos/mode-toggle-segmented.tsx`
- Modify: `app/components/demos/mode-toggle-button.tsx` (rewrite ui import)
- Modify: `app/components/demos/mode-toggle-segmented.tsx` (rewrite ui import)
- Modify: `app/routes/color-scheme.tsx` (replace placeholder)

- [ ] **Step 1: Move the demo files**

```bash
mkdir -p app/components/demos
git mv src/components/mode-toggle-button-demo.tsx app/components/demos/mode-toggle-button.tsx
git mv src/components/mode-toggle-segmented-demo.tsx app/components/demos/mode-toggle-segmented.tsx
```

- [ ] **Step 2: Rewrite shadcn-ui imports in the moved files**

In `app/components/demos/mode-toggle-button.tsx`, change:

```ts
import { Button } from "#components/ui/button.tsx";
```

to:

```ts
import { Button } from "~/components/ui/button.tsx";
```

In `app/components/demos/mode-toggle-segmented.tsx`, change:

```ts
import {
  ToggleGroup,
  ToggleGroupItem,
} from "#components/ui/toggle-group.tsx";
```

to:

```ts
import {
  ToggleGroup,
  ToggleGroupItem,
} from "~/components/ui/toggle-group.tsx";
```

The `#hooks/color-scheme/...` import in both files stays unchanged.

- [ ] **Step 3: Replace `app/routes/color-scheme.tsx` with the real route**

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { ModeToggleButton } from "~/components/demos/mode-toggle-button";
import { ModeToggleSegmented } from "~/components/demos/mode-toggle-segmented";
import buttonSrc from "~/components/demos/mode-toggle-button.tsx?raw";
import segmentedSrc from "~/components/demos/mode-toggle-segmented.tsx?raw";

export default function ColorSchemeRoute() {
  return (
    <DropInPage
      title="useColorScheme"
      description="A drop-in React hook for resolving and applying a light/dark color scheme. Works without a provider, persists the user choice, and tracks the OS preference. Two recommended toggle patterns are shown below."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/hooks/color-scheme"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/hooks/color-scheme/README.md"
      demos={[
        {
          title: "Light / dark button",
          description:
            "Two-state icon button. Setting either light or dark is explicit — clicking breaks 'system' tracking.",
          source: buttonSrc,
          render: <ModeToggleButton />,
        },
        {
          title: "Light / dark / system segmented",
          description:
            "Three-state segmented control bound to the user choice. When 'system' is selected, the resolved scheme is shown below.",
          source: segmentedSrc,
          render: <ModeToggleSegmented />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/color-scheme`.
Expected:
- Page header shows `useColorScheme` + description + README/Source links.
- Two demo cards rendered. Each card shows: title, description, the rendered toggle component, the file's source code below.
- Clicking the icon button in the first demo toggles the color scheme of the page.
- The segmented control in the second demo selects light/dark/system; selecting `system` shows the resolved scheme.
- Both source-code blocks are non-empty and show the moved files' contents.

Quit the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/components/demos app/routes/color-scheme.tsx src/components
git commit -m "refactor(app): migrate color-scheme demo to its own route"
```

---

### Task 9: Migrate `search-facets`

**Files:**
- Move: `src/components/search-facets-demo.tsx` → `app/components/demos/search-facets.tsx`
- Modify: `app/routes/search-facets.tsx` (replace placeholder)

The `search-facets-demo.tsx` file does NOT import any shadcn ui primitives — only `#components/search-facets/...` paths. No import rewrites needed.

- [ ] **Step 1: Move the file**

```bash
git mv src/components/search-facets-demo.tsx app/components/demos/search-facets.tsx
```

- [ ] **Step 2: Replace `app/routes/search-facets.tsx`**

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { SearchFacetsDemo } from "~/components/demos/search-facets";
import searchFacetsSrc from "~/components/demos/search-facets.tsx?raw";

export default function SearchFacetsRoute() {
  return (
    <DropInPage
      title="SearchFacets"
      description="A schema-driven faceted search bar — Gmail-flavor field:value chips, quoted phrases, negation, ranges, and a builder popover for syntax discovery. Composed over Base UI's Combobox and Popover; styled with shadcn theme tokens."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/search-facets"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/search-facets/README.md"
      demos={[
        {
          title: "Faceted search",
          description:
            "Type 'from:bob' + space to commit a chip. Click a chip to edit it. Click '+ Add filter' for the schema-driven builder form.",
          source: searchFacetsSrc,
          render: <SearchFacetsDemo />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/search-facets`.
Expected:
- Header + one demo card.
- Type `from:bob` + space — a chip appears.
- Click the `+ Add filter` button — the builder popover opens with the schema fields.
- Below the input, the parsed query is shown in JSON.

Quit the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/components/demos/search-facets.tsx app/routes/search-facets.tsx src/components
git commit -m "refactor(app): migrate search-facets demo to its own route"
```

---

### Task 10: Migrate `action-registry`

**Files:**
- Move: `src/components/action-registry-demo.tsx` → `app/components/demos/action-registry.tsx`
- Modify: `app/routes/action-registry.tsx` (replace placeholder)

The `action-registry-demo.tsx` file does NOT import any shadcn ui primitives. No import rewrites needed.

- [ ] **Step 1: Move the file**

```bash
git mv src/components/action-registry-demo.tsx app/components/demos/action-registry.tsx
```

- [ ] **Step 2: Replace `app/routes/action-registry.tsx`**

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { ActionRegistryDemo } from "~/components/demos/action-registry";
import actionRegistrySrc from "~/components/demos/action-registry.tsx?raw";

export default function ActionRegistryRoute() {
  return (
    <DropInPage
      title="action-registry"
      description="A drop-in shared registry for app actions — id, label, optional shortcut/group/keywords/icon. The primitive a keybinding hook and a command palette both subscribe to. Provider-scoped, isolated per provider, no DOM, no shortcut parsing — just register/getAll/subscribe."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/hooks/action-registry"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/hooks/action-registry/README.md"
      demos={[
        {
          title: "Register and observe",
          description:
            "Three components register actions on mount; a sibling subscribes via useSyncExternalStore and renders the list. Toggle the checkbox to mount/unmount nav.search and watch the list react.",
          source: actionRegistrySrc,
          render: <ActionRegistryDemo />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/action-registry`.
Expected:
- Header + one demo card.
- Four actions listed inside the demo (Open Settings, Show keyboard shortcuts, Refresh data, Search…).
- Uncheck the "Mount nav.search" checkbox — the list drops to three. Re-check — it goes back to four.

Quit the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/components/demos/action-registry.tsx app/routes/action-registry.tsx src/components
git commit -m "refactor(app): migrate action-registry demo to its own route"
```

---

### Task 11: Migrate `keyboard-shortcuts`

**Files:**
- Move: `src/components/keyboard-shortcuts-demo.tsx` → `app/components/demos/keyboard-shortcuts.tsx`
- Modify: `app/components/demos/keyboard-shortcuts.tsx` (rewrite ui import)
- Modify: `app/routes/keyboard-shortcuts.tsx` (replace placeholder)

- [ ] **Step 1: Move the file**

```bash
git mv src/components/keyboard-shortcuts-demo.tsx app/components/demos/keyboard-shortcuts.tsx
```

- [ ] **Step 2: Rewrite the shadcn-ui import**

In `app/components/demos/keyboard-shortcuts.tsx`, change:

```ts
import { Button } from "#components/ui/button.tsx";
```

to:

```ts
import { Button } from "~/components/ui/button.tsx";
```

The `#hooks/action-registry/...` and `#components/keyboard-shortcuts/...` imports stay unchanged.

- [ ] **Step 3: Replace `app/routes/keyboard-shortcuts.tsx`**

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { KeyboardShortcutsDemo } from "~/components/demos/keyboard-shortcuts";
import keyboardShortcutsSrc from "~/components/demos/keyboard-shortcuts.tsx?raw";

export default function KeyboardShortcutsRoute() {
  return (
    <DropInPage
      title="KeyboardShortcuts"
      description="A drop-in keybinding layer + cheatsheet that consume the action-registry. Bind any registered action by setting its `shortcut` field — single chords, alternates, or g-i-style sequences. The cheatsheet picks them up automatically."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/keyboard-shortcuts"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/keyboard-shortcuts/README.md"
      demos={[
        {
          title: "Shortcut bindings + cheatsheet",
          description:
            "Try ⌘K, ⌘S, the g-i sequence, or / from anywhere on the page. Press ? to open the cheatsheet.",
          source: keyboardShortcutsSrc,
          render: <KeyboardShortcutsDemo />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/keyboard-shortcuts`.
Expected:
- Header + one demo card.
- Pressing `?` opens the cheatsheet listing the four registered shortcuts.
- Pressing ⌘K (or Ctrl-K) appends "mod+k → palette open" to the activity log.
- Pressing the `g` then `i` keys in sequence appends "g i → inbox".

Quit the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/components/demos/keyboard-shortcuts.tsx app/routes/keyboard-shortcuts.tsx src/components
git commit -m "refactor(app): migrate keyboard-shortcuts demo to its own route"
```

---

### Task 12: Migrate `command-palette`

**Files:**
- Move: `src/components/command-palette-demo.tsx` → `app/components/demos/command-palette.tsx`
- Modify: `app/components/demos/command-palette.tsx` (rewrite ui import)
- Modify: `app/routes/command-palette.tsx` (replace placeholder)

- [ ] **Step 1: Move the file**

```bash
git mv src/components/command-palette-demo.tsx app/components/demos/command-palette.tsx
```

- [ ] **Step 2: Rewrite the shadcn-ui import**

In `app/components/demos/command-palette.tsx`, change:

```ts
import { Button } from "#components/ui/button.tsx";
```

to:

```ts
import { Button } from "~/components/ui/button.tsx";
```

- [ ] **Step 3: Replace `app/routes/command-palette.tsx`**

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { CommandPaletteDemo } from "~/components/demos/command-palette";
import commandPaletteSrc from "~/components/demos/command-palette.tsx?raw";

export default function CommandPaletteRoute() {
  return (
    <DropInPage
      title="CommandPalette"
      description="A drop-in cmd+k launcher built on cmdk. Reads from the action-registry, groups by Action.group, fuzzy-matches label + keywords, filters out disabled actions, shows platform-correct shortcut glyphs, persists last-5 recents, and accepts async CommandSources for backend search — debounced, with per-source loading."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/components/command-palette"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/components/command-palette/README.md"
      demos={[
        {
          title: "Palette + async source",
          description:
            "Press ⌘K (or click the button) to open. Try 'theme', 'sign', or 'onboarding' (the last hits a fake async docs source). Recents persist across reloads in localStorage.",
          source: commandPaletteSrc,
          render: <CommandPaletteDemo />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/command-palette`.
Expected:
- Header + one demo card.
- Pressing ⌘K (or clicking "Open palette") opens the palette.
- Typing "theme" matches the theme-toggle row.
- Typing "onboarding" shows a brief loading state, then the fake async docs results appear.

Quit the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/components/demos/command-palette.tsx app/routes/command-palette.tsx src/components
git commit -m "refactor(app): migrate command-palette demo to its own route"
```

---

### Task 13: Migrate `integration` (special case — no `DropInPage` template)

**Files:**
- Move: `src/components/integration-demo.tsx` → `app/components/demos/integration.tsx`
- Modify: `app/components/demos/integration.tsx` (rewrite ui import)
- Modify: `app/routes/integration.tsx` (replace placeholder)

The integration demo's UI (seams checklist + controls + registry panel + event log) is too rich to fit comfortably inside a `DemoCard`. The route renders its own minimal header and the demo full-width, with a "View source on GitHub →" link instead of an inline source block.

- [ ] **Step 1: Move the file**

```bash
git mv src/components/integration-demo.tsx app/components/demos/integration.tsx
```

- [ ] **Step 2: Rewrite the shadcn-ui import**

In `app/components/demos/integration.tsx`, change:

```ts
import { Button } from "#components/ui/button.tsx";
```

to:

```ts
import { Button } from "~/components/ui/button.tsx";
```

The other `#hooks/...` and `#components/...` imports stay unchanged.

- [ ] **Step 3: Replace `app/routes/integration.tsx`**

```tsx
import { IntegrationDemo } from "~/components/demos/integration";

export default function IntegrationRoute() {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Integration
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          All three action drop-ins wired together. Exercises the seams
          between action-registry, keyboard-shortcuts, and command-palette —
          surface attribution via <code>ctx.source</code>, live disable,
          mount/unmount cleanup, <code>allowInInput</code> suppression,
          async sources, and the <code>palette.open</code> action.
        </p>
        <p className="text-sm">
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://github.com/osuritz/react-kit/blob/main/app/components/demos/integration.tsx"
          >
            View source on GitHub →
          </a>
        </p>
      </header>

      <IntegrationDemo />
    </article>
  );
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`
Visit `http://localhost:5173/integration`.
Expected:
- Header + the seams-checklist UI + controls panel + registered-actions panel + event log.
- Pressing `g h` appends `nav.home fired (source=shortcut)` to the event log.
- Clicking "Open palette" appends `palette.open fired (source=click)` and opens the palette.
- Toggling "demo.disabled enabled" off greys the row in the cheatsheet.

Quit the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/components/demos/integration.tsx app/routes/integration.tsx src/components
git commit -m "refactor(app): migrate integration demo to its own route"
```

---

## Phase 4 — Delete the old single-page entry point

### Task 14: Delete obsolete `src/` files

After Phase 3, `src/components/` should contain only drop-in subdirectories. `src/main.tsx`, `src/App.tsx`, `src/index.css`, and `src/README.md` are now unreferenced — `index.html` points at `app/main.tsx`, and `App.tsx`'s contents are spread across the routes.

**Files:**
- Delete: `src/App.tsx`
- Delete: `src/main.tsx`
- Delete: `src/index.css`
- Delete: `src/README.md`

- [ ] **Step 1: Verify nothing else imports the about-to-delete files**

Run: `grep -rn "src/App\|src/main\|src/index.css\|src/README" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=docs .`
Expected: no matches (or only matches inside the design spec at `docs/superpowers/specs/...`, which is fine).

If there are unexpected matches, stop and investigate.

- [ ] **Step 2: Delete the files**

```bash
git rm src/App.tsx src/main.tsx src/index.css src/README.md
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: exits 0; produces `dist/`. There should be no TypeScript errors.

- [ ] **Step 4: Verify preview still works**

Run: `npm run preview`
Expected: serves at `http://localhost:4173/`. Visit each route — they all render correctly.

Quit the preview server.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "refactor: remove obsolete single-page entry point"
```

---

## Phase 5 — GitHub Pages deploy

### Task 15: Add base path and router basename

**Files:**
- Modify: `vite.config.ts` (add `base`)
- Modify: `app/router.tsx` (add `basename`)

- [ ] **Step 1: Add `base` to `vite.config.ts`**

Edit `vite.config.ts` to add `base: "/react-kit/"` after the `plugins` line. The full file should read:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Each drop-in folder under src/{hooks,components}/<name>/ ships its own
// isolated test harness (its own package.json with React 18 in devDeps), so
// `node_modules/` exists *inside* `src/`. Without dedupe, Vite walks up from
// a drop-in source file and resolves shared packages from the harness's
// nested install instead of the root.
//
// `react` / `react-dom` produce a hard "A React Element from an older version
// of React was rendered" runtime error when duplicated. `@base-ui/react`,
// `react-day-picker`, `react-router`, and any other Context-using library
// would fail more silently — Combobox items would not register with their
// root, popovers would not anchor, route navigation would not propagate — so
// dedupe them too.
export default defineConfig({
  base: "/react-kit/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
    dedupe: [
      "react",
      "react-dom",
      "@base-ui/react",
      "react-day-picker",
      "react-router",
    ],
  },
});
```

- [ ] **Step 2: Add `basename` to the router**

Edit `app/router.tsx`:

```tsx
export const router = createBrowserRouter(
  [
    {
      element: <SiteLayout />,
      children: [
        { path: "/", element: <IndexRoute /> },
        { path: "color-scheme", element: <ColorSchemeRoute /> },
        { path: "action-registry", element: <ActionRegistryRoute /> },
        { path: "search-facets", element: <SearchFacetsRoute /> },
        { path: "keyboard-shortcuts", element: <KeyboardShortcutsRoute /> },
        { path: "command-palette", element: <CommandPaletteRoute /> },
        { path: "integration", element: <IntegrationRoute /> },
        { path: "*", element: <IndexRoute /> },
      ],
    },
  ],
  { basename: "/react-kit" },
);
```

(Only the `createBrowserRouter` call changes — wrap the existing children array as the first arg and add `{ basename: "/react-kit" }` as the second.)

- [ ] **Step 3: Verify the build serves at the base path**

Run: `npm run build && npm run preview`
Expected: preview prints a URL like `http://localhost:4173/react-kit/`. Visit it — landing page renders. Click a sidebar link — URL is `/react-kit/color-scheme`, page renders.

Quit the preview server.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts app/router.tsx
git commit -m "build: serve under /react-kit/ for GitHub Pages"
```

---

### Task 16: Add the `404.html` SPA shim and inline restore script

**Files:**
- Create: `public/404.html`
- Modify: `index.html` (add restore script)

This is the standard [spa-github-pages](https://github.com/rafgraph/spa-github-pages) trick. `404.html` rewrites the requested path into a query string and redirects to `index.html`; an inline script in `index.html` reads that query string and pushes the right route into history before React mounts.

- [ ] **Step 1: Create `public/404.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>react-kit</title>
    <script>
      // Single Page Apps for GitHub Pages
      // https://github.com/rafgraph/spa-github-pages
      // MIT License — Rafael Pedicini
      // Redirects every unknown path to /react-kit/?/<original-path>&<original-query>
      // The companion script in index.html restores it via history.replaceState.
      var pathSegmentsToKeep = 1; // matches the "/react-kit" base path
      var l = window.location;
      l.replace(
        l.protocol +
          "//" +
          l.hostname +
          (l.port ? ":" + l.port : "") +
          l.pathname
            .split("/")
            .slice(0, 1 + pathSegmentsToKeep)
            .join("/") +
          "/?/" +
          l.pathname
            .slice(1)
            .split("/")
            .slice(pathSegmentsToKeep)
            .join("/")
            .replace(/&/g, "~and~") +
          (l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : "") +
          l.hash,
      );
    </script>
  </head>
  <body></body>
</html>
```

- [ ] **Step 2: Add the restore script to `index.html`**

Insert the SPA-restore script as the first child of `<head>` (so it runs before any module loads). The full file should read:

```html
<!doctype html>
<html lang="en">
  <head>
    <script>
      // Companion to public/404.html — restores the original path before the
      // app boots. From https://github.com/rafgraph/spa-github-pages (MIT).
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search
            .slice(1)
            .split("&")
            .map(function (s) {
              return s.replace(/~and~/g, "&");
            })
            .join("?");
          window.history.replaceState(
            null,
            "",
            l.pathname.slice(0, -1) + decoded + l.hash,
          );
        }
      })(window.location);
    </script>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>react-kit-demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/app/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify deep links work locally**

Run: `npm run build && npm run preview`
Expected: preview at `http://localhost:4173/react-kit/`.

This step verifies what we *can* verify locally — the restore script's `~and~` decoding doesn't fire on direct visits because `vite preview` serves `index.html` for SPA routes natively. The `404.html` round-trip is exercised on the deployed GH Pages site (Task 18). For now, confirm:

- `http://localhost:4173/react-kit/` — landing page renders.
- `http://localhost:4173/react-kit/color-scheme` — page renders directly (preview's SPA fallback covers this).
- View source on `index.html` in the browser — the restore script is present at the top of `<head>`.

Quit the preview server.

- [ ] **Step 4: Commit**

```bash
git add public/404.html index.html
git commit -m "build: add SPA-routing shim for GitHub Pages"
```

---

### Task 17: Add the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy demo site to GitHub Pages on push to main"
```

---

### Task 18: One-time GH Pages setup + post-merge verification (manual, for the repo owner)

**Files:** none — this is operator instructions to print out, not code changes.

**The repo owner (Olivier) must do this once** in the GitHub web UI before the workflow can succeed. The agent cannot do this step — surface it as the next action.

- [ ] **Step 1: Print these instructions for the user and stop**

Tell the user, verbatim:

> The deploy workflow is ready. Two manual steps remain that I cannot do:
>
> 1. **One-time setup** (GitHub web UI): go to **Settings → Pages**, set **Source** to **GitHub Actions** (not "Deploy from branch"). This tells GH Pages to listen for the `actions/deploy-pages` artifact our workflow produces.
> 2. **Merge this branch to `main`.** The workflow only deploys from `main` (per the `on.push.branches` config). Once merged, watch the Actions tab; on success it prints the deployed URL.
>
> After the deploy succeeds, sanity-check that the SPA shim works on the real site:
>
> - Visit `https://osuritz.github.io/react-kit/` — landing page should load.
> - Visit `https://osuritz.github.io/react-kit/color-scheme` directly (paste the deep link into the address bar) — the `404.html` shim + restore script should kick in and the color-scheme page should render. If you see a raw 404, the `Source = GitHub Actions` setting wasn't applied, or `404.html` isn't in `dist/` (Vite copies `public/*` into `dist/` automatically; check `dist/404.html` exists after `npm run build`).

---

## Phase 6 — Documentation

### Task 19: Write `app/README.md`

**Files:**
- Create: `app/README.md`

Replaces the deleted `src/README.md` with a "two buckets" framing focused on the demo site.

- [ ] **Step 1: Create the file**

```markdown
# `app/` — the demo site

Everything in this directory is part of the demo site that renders the
drop-ins from `src/`. None of it is intended to be copied into another
project — when consuming a drop-in, work from `src/<path>/` instead.

## Two buckets

| Path | Purpose |
| --- | --- |
| `routes/<name>.tsx` | One file per drop-in. Declarative metadata: title, description, GitHub links, list of demos to render. The router maps URL paths to these. |
| `components/`, `lib/`, `index.css` | Demo glue: the `SiteLayout` chrome, the shared `DropInPage` and `DemoCard` primitives, the `*-demo` wrappers under `components/demos/`, vendored shadcn primitives under `components/ui/`, the `cn()` helper, and the global CSS. |

`main.tsx` is the Vite entry point. `router.tsx` is the route table.

## Aliases

- `~/*` → `./app/*` — used everywhere inside `app/`.
- `#*` → `./src/*` — used by demo wrappers when they consume a drop-in.

`~/*` is configured in `vite.config.ts` (resolve alias) and `tsconfig.app.json`
(paths). `#*` is the existing Node-style imports map in `package.json`.

## Adding a new drop-in to the site

1. Create the demo wrapper at `app/components/demos/<name>.tsx` (it imports
   from `#hooks/<name>/...` or `#components/<name>/...` exactly as a real
   consumer would).
2. Create the route at `app/routes/<name>.tsx`. Use the `DropInPage`
   template for a standard drop-in, or hand-roll the page if the demo's UI
   is too rich for `DemoCard` (see `routes/integration.tsx` for the
   hand-rolled pattern).
3. Add a route entry in `app/router.tsx`.
4. Add a sidebar entry in `app/components/site-layout.tsx`'s `NAV` table.

## Drop-in styling assumption

Drop-in components assume the host app provides Tailwind v4 + the shadcn
token set. `app/index.css` provides them in the demo. Drop-ins themselves
never import from `app/` — they're file-self-contained so users can copy
the `src/<path>/` folder as a unit.
```

- [ ] **Step 2: Commit**

```bash
git add app/README.md
git commit -m "docs(app): add README for the demo-site directory"
```

---

### Task 20: Update root `README.md`

**Files:**
- Modify: `README.md`

Add a live-demo link near the top and a "Repo layout" paragraph explaining `src/` vs `app/`. The existing per-drop-in bullets stay as-is.

- [ ] **Step 1: Edit the file**

Replace the current top of `README.md` (lines 1–14, from the `# react-kit` heading through the "How to use" section) with:

```markdown
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
```

The remaining sections ("What's in here", drop-in bullets, "Integration demo", "License") stay unchanged.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add live-demo link and repo-layout overview to README"
```

---

## Self-review (already done by the plan author — included for transparency)

**Spec coverage check** — every spec section maps to at least one task:

- Goal 1 (`src/` is drop-ins only): Tasks 7, 8–13, 14.
- Goal 2 (one page per drop-in): Tasks 6, 8–13.
- Goal 3 (deploy on push to `main`): Tasks 15–18.
- Goal 4 (drop-ins + harnesses + `#*` paths unchanged): enforced by *not* touching `src/{hooks,components}/<name>/` anywhere; verified by build passing in Task 14.
- Architecture: filesystem-only split (no workspaces) — reflected throughout.
- Folder layout: Tasks 3–13 produce exactly the layout the spec describes.
- Aliases: Task 2 (`~/*`); `#*` left alone.
- Routing + site layout: Tasks 4–6.
- Per-drop-in template: Task 5 (template) + Tasks 8–12 (use it). Task 13 is the special case the spec calls out.
- Vite config + GH Pages base: Task 15.
- SPA shim: Task 16.
- Workflow: Task 17.
- Manual GH setup: Task 18.
- Migration sequence: Tasks 1–14 follow the spec's six-step ordering exactly.
- Risks (`?raw` keeps working, Tailwind tokens, `public/` shared, harnesses untouched): verified inline in Tasks 8 and 14.
- Doc updates: Tasks 19–20.
- Deferred items (PR previews, CI for harnesses, custom domain, code-splitting): correctly absent from the plan.

No gaps found. Plan is complete.
