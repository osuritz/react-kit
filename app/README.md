# `app/` — the demo site

Everything in this directory is part of the demo site that renders the
drop-ins from `src/`. None of it is intended to be copied into another
project — when consuming a drop-in, work from `src/<path>/` instead.

## Two buckets

| Path                               | Purpose                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/<name>.tsx`                | One file per drop-in. Declarative metadata: title, description, GitHub links, list of demos to render. The router maps URL paths to these.                                                                                        |
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
