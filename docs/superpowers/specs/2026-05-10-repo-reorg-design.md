# Repo reorg: split drop-ins from demo site, deploy to GitHub Pages

**Date:** 2026-05-10
**Status:** approved (design)
**Type:** structural refactor + new deployment

## Context

The repo currently mixes two purposes under one `src/` tree:

- **Drop-in source** — self-contained hooks and components in `src/hooks/<name>/`
  and `src/components/<name>/` that users copy folder-by-folder into their own
  apps. Each ships its own README and isolated test harness.
- **Demo site** — a Vite app rendering every drop-in on a single long
  `App.tsx` page, plus shadcn primitives in `src/components/ui/`, demo wrappers
  with the `*-demo.tsx` suffix in `src/components/`, and helpers in `src/lib/`.

Two pain points have emerged as the drop-in count grew (5 + an integration page):

1. The single demo page has too much on it.
2. The intermixing of drop-in source and demo glue under `src/` makes it hard
   to tell at a glance which files are "the library" and which are "the site."

The repo also has no live deployment. The owner wants to demo at work — both
walking through the deployed UI and showing source — and wants a stable URL
they can point colleagues at.

## Goals

1. `src/` contains _only_ drop-in source. Nothing demo-only lives there.
2. Each drop-in gets its own page in the demo site (one URL per drop-in plus
   one for the integration demo).
3. The demo deploys automatically to GitHub Pages on push to `main`.
4. The drop-in copy-paste model, the per-drop-in test harnesses, and the
   `#hooks/...` / `#components/...` import paths all keep working unchanged.

## Non-goals

- No workspaces, no monorepo tooling, no second `package.json`.
- No npm publishing, no install CLI, no shadcn-style registry.
- No content management system, no MDX, no Nextra/Docusaurus. Plain React
  routes are sufficient for ~7 pages.
- No backwards-compat shims for the old single-page URL structure — there are
  no real users to break.
- No CI for the per-drop-in test harnesses as part of this reorg. (Easy to add
  later as a separate workflow.)

## Architecture

### Two top-level folders

```
react-kit/
├── src/    ← drop-ins ONLY (the "library" — what users copy)
└── app/    ← demo site (everything demo-only — never copied)
```

The split is **filesystem-level, not package-level.** One `package.json`, one
`vite.config.ts`, one `tsconfig`. Drop-ins remain consumable as folders without
any workspace machinery.

### Target folder layout

```
react-kit/
├── src/                              ← drop-ins ONLY (unchanged)
│   ├── hooks/
│   │   ├── color-scheme/
│   │   └── action-registry/
│   └── components/
│       ├── search-facets/
│       ├── keyboard-shortcuts/
│       └── command-palette/
│
├── app/                              ← demo site (NEW)
│   ├── main.tsx                      ← was src/main.tsx
│   ├── index.css                     ← was src/index.css
│   ├── router.tsx                    ← route table (react-router v7)
│   ├── routes/
│   │   ├── index.tsx                 ← landing: list of drop-ins
│   │   ├── color-scheme.tsx
│   │   ├── search-facets.tsx
│   │   ├── action-registry.tsx
│   │   ├── keyboard-shortcuts.tsx
│   │   ├── command-palette.tsx
│   │   └── integration.tsx
│   ├── components/
│   │   ├── ui/                       ← was src/components/ui/
│   │   ├── site-layout.tsx           ← header + sidebar nav + outlet
│   │   ├── drop-in-page.tsx          ← per-drop-in page template
│   │   ├── demo-card.tsx             ← extracted from current App.tsx
│   │   └── demos/                    ← all demo wrappers (suffix dropped)
│   │       ├── mode-toggle-button.tsx
│   │       ├── mode-toggle-segmented.tsx
│   │       ├── search-facets.tsx
│   │       ├── action-registry.tsx
│   │       ├── keyboard-shortcuts.tsx
│   │       ├── command-palette.tsx
│   │       └── integration.tsx
│   ├── lib/
│   │   └── utils.ts                  ← was src/lib/utils.ts (cn helper)
│   └── README.md                     ← replaces src/README.md, rewritten
│
├── public/
│   └── 404.html                      ← NEW: SPA shim for GH Pages routing
│
├── .github/workflows/
│   └── deploy.yml                    ← NEW: build + deploy to GH Pages
│
├── index.html                        ← updated: script src + SPA-restore script
├── vite.config.ts                    ← updated: base path, ~ alias, dedupe
├── tsconfig.app.json                 ← updated: include "app", add ~ alias
├── components.json                   ← updated: aliases point at app/
├── package.json                      ← unchanged shape; add react-router dep
└── README.md                         ← updated: live demo link, repo map
```

### Why drop-ins don't move

`package.json`'s `"imports": { "#*": "./src/*" }` keeps `#hooks/*` and
`#components/*` pointing at `./src/`. Drop-in folders, their per-folder
`package.json` test harnesses, their READMEs, and the per-drop-in `?raw`
imports from the demo continue to resolve unchanged. The reorg moves _out_
of `src/`, never _within_ it.

### Aliases

Two clean namespaces:

- `#*` → `./src/*` — drop-ins (existing, in `package.json` `imports`)
- `~/*` → `./app/*` — demo site (new, in `vite.config.ts` `resolve.alias`
  and `tsconfig.app.json` `paths`)

### Routing

`react-router` v7 in SPA mode (`createBrowserRouter` + `RouterProvider`).
Boring, well-known, integrates cleanly with the GH Pages 404 shim.

Route table (`app/router.tsx`):

```
/                      → routes/index.tsx           (landing)
/color-scheme          → routes/color-scheme.tsx
/action-registry       → routes/action-registry.tsx
/search-facets         → routes/search-facets.tsx
/keyboard-shortcuts    → routes/keyboard-shortcuts.tsx
/command-palette       → routes/command-palette.tsx
/integration           → routes/integration.tsx
*                      → routes/index.tsx           (catch-all, no separate 404 page)
```

URLs are flat — no `/docs/...` prefix. Only one tier of content.

The router is configured with `basename="/react-kit"` to match the GH Pages
sub-path.

`react-router` joins the existing Vite `dedupe` list (`react`, `react-dom`,
`@base-ui/react`, `react-day-picker`). Same rationale as the existing entries:
drop-ins' nested `node_modules` (test harness installs) would otherwise resolve
a different copy and break Context sharing.

### Site layout

`app/components/site-layout.tsx` provides the chrome wrapping each route:
sticky header with title and GitHub link; sticky left sidebar with grouped
links; content area on the right.

```
┌────────────────────────────────────────────────────┐
│  react-kit                              GitHub →   │  ← top header
├────────────┬───────────────────────────────────────┤
│ Hooks      │                                       │
│  · color…  │     <Outlet />  ← active route        │
│  · action… │                                       │
│            │                                       │
│ Components │                                       │
│  · search… │                                       │
│  · keybd…  │                                       │
│  · cmd…    │                                       │
│            │                                       │
│ Demos      │                                       │
│  · integ…  │                                       │
└────────────┴───────────────────────────────────────┘
```

- Sidebar links use `react-router`'s `<NavLink>`. Active item gets
  `text-foreground` plus a left-border accent (shadcn-style).
- Sidebar groups: **Hooks**, **Components**, **Demos**. The integration page
  lives under Demos.
- On viewports below `md`, the sidebar collapses to a top dropdown.
- No search, no version selector, no theme toggle in chrome — the
  color-scheme drop-in's own demo _is_ the toggle. Keeps chrome minimal.

### Per-drop-in route page template

Each route file is thin and declarative. It imports its demo(s) and source,
then renders a shared `DropInPage` template:

```tsx
// app/routes/color-scheme.tsx
import { DropInPage } from '~/components/drop-in-page';
import { ModeToggleButton } from '~/components/demos/mode-toggle-button';
import { ModeToggleSegmented } from '~/components/demos/mode-toggle-segmented';
import buttonSrc from '~/components/demos/mode-toggle-button.tsx?raw';
import segmentedSrc from '~/components/demos/mode-toggle-segmented.tsx?raw';

export default function ColorSchemeRoute() {
  return (
    <DropInPage
      title="useColorScheme"
      description="A drop-in React hook for resolving and applying a light/dark color scheme..."
      sourceHref="https://github.com/osuritz/react-kit/tree/main/src/hooks/color-scheme"
      readmeHref="https://github.com/osuritz/react-kit/blob/main/src/hooks/color-scheme/README.md"
      demos={[
        {
          title: 'Light / dark button',
          description: '...',
          source: buttonSrc,
          render: <ModeToggleButton />,
        },
        {
          title: 'Light / dark / system segmented',
          description: '...',
          source: segmentedSrc,
          render: <ModeToggleSegmented />,
        },
      ]}
    />
  );
}
```

`DropInPage` and `DemoCard` are extracted from the current `App.tsx` —
identical DOM and styling, just per-page. The integration route is the one
exception that doesn't use the template, since its body is a hand-rolled
seams-checklist UI; it carries over verbatim into `routes/integration.tsx`.

Adding a new drop-in to the site is now four steps:

1. Create `app/components/demos/<name>.tsx`.
2. Create `app/routes/<name>.tsx` using the `DropInPage` template.
3. Add a route to `app/router.tsx`.
4. Add a sidebar entry to `site-layout.tsx`.

No conditional logic, no centralized switch.

## Deployment: GitHub Pages

### Vite config

```ts
// vite.config.ts (updated)
export default defineConfig({
  base: '/react-kit/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
    dedupe: ['react', 'react-dom', '@base-ui/react', 'react-day-picker', 'react-router'],
  },
});
```

The existing dedupe-rationale comment block stays — it's load-bearing context
for why dedupe exists at all. `react-router` joining the list is the same
reason as the other entries.

### SPA routing on GH Pages

GH Pages serves `404.html` for any path it doesn't have a static file for.
We use the standard [spa-github-pages](https://github.com/rafgraph/spa-github-pages)
trick to convert this into proper SPA routing without ugly hash URLs:

```
visitor → /react-kit/color-scheme
GH Pages → 404.html (path doesn't exist as a file)
404.html → window.location.replace("/react-kit/?/color-scheme")
GH Pages → index.html
inline script in index.html → history.replaceState(null, null, "/react-kit/color-scheme")
React mounts → router (basename "/react-kit") sees "/color-scheme" → renders ColorSchemeRoute
```

Two tiny files — `public/404.html` and a small inline `<script>` block at the
top of `index.html`. No router-specific configuration beyond `basename`.

### GitHub Actions workflow

`.github/workflows/deploy.yml`:

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
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

Standard pattern from GitHub's own docs. No `gh-pages` npm package, no
`peaceiris/actions-gh-pages`, no `gh-pages` branch — the official
`actions/deploy-pages` flow is cleaner.

### One-time manual setup

In the repo settings:

- Settings → Pages → Source: **GitHub Actions** (not "Deploy from branch").

This must be done by the repo owner once before the workflow can succeed.

## Migration sequence

The sequencing matters: each step ends in a verifiable state, so a regression
is bisectable to a single small commit.

1. **Add the `app/` scaffold and routing first, with no moves yet.**
   - Create `app/main.tsx`, `app/router.tsx`, `app/components/site-layout.tsx`,
     `app/components/drop-in-page.tsx`, `app/components/demo-card.tsx`,
     `app/index.css` (copied from `src/index.css`).
   - Add the `react-router` dependency.
   - Update `vite.config.ts` (alias `~`, add `react-router` to dedupe).
     **Don't add `base` yet** — that comes in step 5.
   - Update `tsconfig.app.json` (include `app`, alias `~/*`).
   - Update `index.html` script src → `/app/main.tsx`.
   - Build a temporary placeholder route table that just renders
     `"TODO: <drop-in>"` pages.
   - **Verify:** `npm run dev` boots; sidebar navigates between placeholder
     pages.

2. **Move shadcn primitives and `lib/utils`.**
   - `src/components/ui/` → `app/components/ui/`
   - `src/lib/utils.ts` → `app/lib/utils.ts`
   - Update `components.json` aliases to point at `~/components`,
     `~/components/ui`, `~/lib`.
   - **Verify:** `npm run dev` still boots; shadcn `Button` and toggle
     primitives render.

3. **Move demo wrappers one drop-in at a time, wiring its real route as you go.**
   - For each drop-in (color-scheme → search-facets → action-registry →
     keyboard-shortcuts → command-palette → integration):
     - Move `src/components/<name>-demo.tsx` → `app/components/demos/<name>.tsx`
       (drop the `-demo` suffix).
     - For color-scheme, this is two files:
       `mode-toggle-button-demo.tsx` and `mode-toggle-segmented-demo.tsx` →
       `app/components/demos/mode-toggle-button.tsx` and
       `mode-toggle-segmented.tsx`.
     - Update the moved file's imports of shadcn primitives from
       `#components/ui/...` to `~/components/ui/...` (and `#lib/utils` to
       `~/lib/utils` where used). Drop-in imports themselves
       (`#hooks/<name>/...`, `#components/<name>/...`) stay unchanged — the
       demo wrapper still consumes the drop-in via the same path the user
       would.
     - Replace the placeholder route with the real `DropInPage`-based file.
     - **Verify:** that route renders; interactions still work; the `?raw`
       source view shows the right file.
   - Six small commits, easy to review and bisect.

4. **Delete the old single-page entry points.**
   - Delete `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/README.md`.
   - All content has migrated. The `src/README.md`'s "three buckets" doc moves
     to `app/README.md`, rewritten as "two buckets: routes and demo glue."
   - **Verify:** `npm run build` succeeds; `npm run preview` works; every
     route loads.

5. **Wire up GH Pages deploy.**
   - Add `base: "/react-kit/"` to `vite.config.ts`.
   - Add `basename="/react-kit"` to the router.
   - Add `public/404.html` (spa-github-pages shim) plus the inline restore
     script in `index.html`.
   - Add `.github/workflows/deploy.yml`.
   - **Verify locally:** `npm run build && npm run preview` — preview serves
     at `/react-kit/`; deep links work.
   - **Verify on GH:** push a feature branch, open PR, merge to `main`, watch
     the Action, click the deployed URL.

6. **Update documentation.**
   - Root `README.md`: add live demo link near the top; add a "Repo layout"
     paragraph (`src/` = drop-ins, `app/` = demo site).
   - `app/README.md`: written in step 4 above.
   - Per-drop-in READMEs (`src/hooks/<name>/README.md`,
     `src/components/<name>/README.md`): unchanged. They're the contract
     between the drop-in and its copy-paste consumer; the reorg doesn't touch
     that contract.

## Risks & gotchas

- **`?raw` imports** must keep working after the demo files move. Vite
  resolves `?raw` via the import path, so this should work transparently.
  Verify on the first migrated drop-in (color-scheme) before continuing.
- **Tailwind v4 + `index.css`**: the file has `@import` directives and theme
  tokens consumed by both `app/components/ui/` _and_ each drop-in component's
  inline classes. Drop-ins assume the host app provides Tailwind v4 + the
  shadcn token set — they always have. After the move, `app/index.css` keeps
  providing them in the demo. Drop-in files don't change.
- **`public/` is shared** by Vite regardless of source location, so
  `public/404.html` lives at the repo root and works without any reconfiguration.
- **Manual GH Pages enablement** in repo settings (Source = GitHub Actions)
  is a one-time step the repo owner must do.
- **Per-drop-in test harnesses** stay out of CI in this reorg. They continue
  to work locally (each drop-in folder has its own `npm test`); a root
  workflow that runs them all can be added later.

## What's deferred

- PR preview URLs. GH Pages doesn't provide them out of the box; if this
  workflow becomes important later, migrating to Vercel or Cloudflare Pages
  is a small change (drop the `404.html` shim, drop `base`, add a
  `vercel.json`/`wrangler.toml`).
- A test-running CI workflow. Mentioned above as deferred.
- Custom domain. Not needed.
- Code-splitting per route. The whole site is small; can add `lazy()` if
  `dist/` ever bloats.
