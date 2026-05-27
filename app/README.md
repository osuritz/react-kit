# `app/` — the demo site

Everything in this directory is part of the demo site that renders the
drop-ins from `src/`. None of it is intended to be copied into another
project — when consuming a drop-in, work from `src/<path>/` instead.

## Two buckets

| Path                               | Purpose                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/<name>.mdx`                | One MDX page per drop-in. Frontmatter holds the metadata (title, group, order, blurb, description, GitHub-link paths); the body imports the demo wrapper + its `?shiki` source and embeds `<DemoCard>`s. The filename is the route path.                           |
| `lib/pages.tsx`                    | Globs `routes/*.mdx` and generates **both** the router children and the navigation groups from frontmatter — the single source those derive from.                                                                                                                  |
| `components/`, `lib/`, `index.css` | Demo glue: the `SiteLayout` chrome, the `MdxRoute` page wrapper + `mdxComponents` map, the shared `DemoCard` primitive, the `*-demo` wrappers under `components/demos/`, vendored shadcn primitives under `components/ui/`, the `cn()` helper, and the global CSS. |

`main.tsx` is the Vite entry point. `router.tsx` assembles the layout and spreads
the generated route children. MDX is configured in `vite.config.ts`.

## Aliases

- `~/*` → `./app/*` — used everywhere inside `app/`.
- `#*` → `./src/*` — used by demo wrappers when they consume a drop-in.

`~/*` is configured in `vite.config.ts` (resolve alias) and `tsconfig.app.json`
(paths). `#*` is the existing Node-style imports map in `package.json`.

## Adding a new drop-in to the site

1. Create the demo wrapper at `app/components/demos/<name>.tsx` (it imports
   from `#hooks/<name>/...` or `#components/<name>/...` exactly as a real
   consumer would).
2. Create the page at `app/routes/<name>.mdx`. Declare the frontmatter
   (`title`, `group`, `order`, `blurb`, optional `description`, and
   `dropInPath` for the README + Source links), then import the demo wrapper
   and its `?shiki` source and embed one or more `<DemoCard>`s. `<DemoCard>` is
   provided to every page automatically — no import. For a demo too rich for
   `DemoCard`, hand-roll the body (set `appSourcePath` and render the demo
   directly — see `routes/integration.mdx`).

That's it — the route table (`router.tsx`) and the navigation (sidebar, mobile
drawer, home grid, via `app/lib/nav.ts` → `lib/pages.tsx`) are generated from
the page's frontmatter, so there's nothing else to register.

## Drop-in styling assumption

Drop-in components assume the host app provides Tailwind v4 + the shadcn
token set. `app/index.css` provides them in the demo. Drop-ins themselves
never import from `app/` — they're file-self-contained so users can copy
the `src/<path>/` folder as a unit.
