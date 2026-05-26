# Demo-site code highlighter — design

## Goal

Replace the unhighlighted `<pre><code>` block inside `DemoCard` with a
syntax-highlighted block driven by Shiki, in the spirit of the ShadCN docs
site. Highlighting happens at build time, integrates cleanly with the
existing color-scheme drop-in, and ships zero highlighter JS to the
client.

## Non-goals

- Highlighting arbitrary user input or runtime-loaded snippets.
- Highlighting outside the demo site (`app/`). Drop-ins under `src/` are
  consumed as code, not displayed as code, and stay untouched.
- Line numbers, line highlighting, focused lines, file-title labels, or
  diff styling. ShadCN ships some of these in its MDX pipeline; we don't
  need them yet.
- Automated tests for the demo glue. The `app/` shell has no test setup
  today and "integrate a highlighter" isn't the place to add one.

## Honesty note

ShadCN's docs site currently uses **dual `github-light` + `github-dark`
themes** via `rehype-pretty-code` in an MDX pipeline. This design picks
a **single CSS-variables theme** instead, because:

- This site is a Vite SPA with `?raw` imports, not MDX.
- The site already tracks light/dark via shadcn CSS tokens, so a
  CSS-vars theme re-themes via CSS on color-scheme toggle without
  flicker or DOM swap.

The choice was made consciously. If we later prefer faithful parity with
ShadCN's output, the plugin can be swapped to emit two HTML strings (one
per theme) without touching consumers.

## Architecture

```
app/
├── vite-plugins/
│   └── shiki.ts             ← NEW. Custom Vite plugin
├── components/
│   ├── demo-card.tsx        ← UPDATED. takes `source: HighlightedSource`
│   └── ui/
│       └── code-block.tsx   ← NEW. <pre> + copy button + Shiki HTML
├── lib/
│   └── shiki-source.ts      ← NEW. `HighlightedSource` type
├── vite-env.d.ts            ← UPDATED. `declare module "*?shiki"`
├── routes/<all>.tsx         ← UPDATED. `?raw` → `?shiki` imports
└── index.css                ← UPDATED. adds `--shiki-*` CSS vars
```

### Build-time data flow

1. A route does `import demoSrc from "~/components/demos/foo.tsx?shiki"`.
2. The Vite plugin's `load` hook matches the `?shiki` query suffix,
   reads the underlying `.tsx` file, runs Shiki's `codeToHtml` with the
   CSS-vars theme, and emits a JS module exporting
   `{ raw, html, lang: "tsx" }`.
3. The route forwards the object to `DemoCard`, which forwards to
   `<CodeBlock>`. The HTML renders via `dangerouslySetInnerHTML`; the
   copy button copies `raw`.
4. Production bundle contains only pre-rendered HTML strings — no Shiki
   JS is shipped to the client.
5. Dev: `this.addWatchFile(filepath)` ties the `?shiki` virtual module
   to the source file so editing the demo invalidates and re-highlights
   via HMR.

## The Vite plugin

`app/vite-plugins/shiki.ts` exports a single plugin factory. A
module-scoped `highlighterPromise` ensures `createHighlighter` runs once
per dev/build process (Shiki docs explicitly recommend treating the
highlighter as a long-lived singleton).

```ts
import fs from 'node:fs/promises';
import { createHighlighter, createCssVariablesTheme, type Highlighter } from 'shiki';
import type { Plugin } from 'vite';

const QUERY = '?shiki';
const theme = createCssVariablesTheme({
  name: 'shadcn',
  variablePrefix: '--shiki-',
});

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    langs: ['tsx'],
    themes: [theme],
  });
  return highlighterPromise;
}

export function shiki(): Plugin {
  return {
    name: 'react-kit:shiki',
    async load(id) {
      if (!id.endsWith(QUERY)) return null;
      const filepath = id.slice(0, -QUERY.length);
      const raw = await fs.readFile(filepath, 'utf8');
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(raw, {
        lang: 'tsx',
        theme: 'shadcn',
      });
      this.addWatchFile(filepath);
      return `export default ${JSON.stringify({
        raw,
        html,
        lang: 'tsx',
      })};`;
    },
  };
}
```

Registered alongside `react()` and `tailwindcss()` in `vite.config.ts`.

**Why `load` not `transform`**: a `?shiki` URL has no real on-disk file
matching the query; `load` is Vite's canonical hook for synthesizing
module contents from a virtual id.

**Language scope**: only `tsx`. All current demos are `.tsx`. If a future
snippet needs `.ts`, `.sh`, or `.css`, extend `langs` and infer from the
file extension.

**Failure modes**: file-read errors and Shiki tokenization errors throw.
Vite surfaces them as a transform error in the overlay. There is no
fallback to unhighlighted source — silent fallbacks would mask real
breakage during dev.

## Theme tokens

`app/index.css` adds a focused set of `--shiki-*` vars under `:root` and
`.dark`. Shiki's `createCssVariablesTheme` writes to these named slots;
anything not listed falls through to `--shiki-foreground`.

```css
:root {
  --shiki-background: var(--muted);
  --shiki-foreground: var(--foreground);

  --shiki-token-constant: oklch(0.45 0.13 250);
  --shiki-token-string: oklch(0.55 0.13 145);
  --shiki-token-comment: var(--muted-foreground);
  --shiki-token-keyword: oklch(0.5 0.2 350);
  --shiki-token-parameter: oklch(0.5 0.13 60);
  --shiki-token-function: oklch(0.5 0.17 285);
  --shiki-token-string-expression: oklch(0.55 0.13 145);
  --shiki-token-punctuation: var(--foreground);
  --shiki-token-link: oklch(0.55 0.15 220);
}

.dark {
  --shiki-background: var(--card);

  --shiki-token-constant: oklch(0.78 0.12 250);
  --shiki-token-string: oklch(0.8 0.13 145);
  --shiki-token-keyword: oklch(0.78 0.18 350);
  --shiki-token-parameter: oklch(0.82 0.13 60);
  --shiki-token-function: oklch(0.78 0.15 285);
  --shiki-token-string-expression: oklch(0.8 0.13 145);
  --shiki-token-link: oklch(0.78 0.15 220);
}
```

**Why dedicated `--shiki-*` vars and not shadcn tokens directly**: the
shadcn token set is monochrome — `chart-1`..`chart-5` are all
`oklch(0.X 0 0)`. Reusing them would produce a grayscale highlight with
near-zero visual distinction. The vars stay tunable from CSS without
re-running Shiki.

## `CodeBlock` component

Shiki's `codeToHtml` emits a complete `<pre class="shiki shadcn" style="..."><code>...</code></pre>`.
The wrapper element in `CodeBlock` must therefore be a `<div>` — nesting
the Shiki `<pre>` inside another `<pre>` is invalid HTML. Styling that
needs to land on the actual `<pre>` (background, padding, max-height,
scroll, font) is applied via Tailwind arbitrary-variants on the
wrapper, which target the descendant `<pre>` Shiki produces.

`app/components/ui/code-block.tsx`:

```tsx
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '~/lib/utils';

export interface CodeBlockProps {
  raw: string;
  html: string;
  className?: string;
}

export function CodeBlock({ raw, html, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={cn(
        'group relative',
        // Style the <pre> Shiki emitted, not a wrapper <pre> (would nest).
        '[&_pre]:bg-[var(--shiki-background)]',
        '[&_pre]:text-[var(--shiki-foreground)]',
        '[&_pre]:max-h-80 [&_pre]:overflow-auto',
        '[&_pre]:rounded-md [&_pre]:p-4',
        '[&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed',
        // Shiki ships inline `background-color` / `color` on the <pre>;
        // override so our CSS-vars win regardless of theme name.
        '[&_pre]:![background-color:var(--shiki-background)]',
        '[&_pre]:![color:var(--shiki-foreground)]',
        className
      )}
    >
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(raw);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="bg-background/80 text-muted-foreground hover:text-foreground absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded border border-border opacity-0 transition group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      {/* HTML is build-time output of Shiki over file-owned source — not user input. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
```

Why the inline-style override: Shiki's `codeToHtml` writes
`style="background-color:...; color:..."` directly on the emitted
`<pre>`. Without `!important` the inline style would beat our utility
classes. The `--shiki-background` / `--shiki-foreground` CSS vars do
flow through, but only because we forced them via Tailwind's `!`
prefix.

`dangerouslySetInnerHTML` is acceptable here because the HTML is
produced at build time by Shiki from source files we own
(`app/components/demos/*.tsx`). It is not user input.

## `DemoCard` integration

`app/components/demo-card.tsx` swaps the `source: string` prop for
`source: HighlightedSource` and replaces the inline `<pre>` with
`<CodeBlock raw={source.raw} html={source.html} />`. The outer chrome
(header, demo render area, code section) is unchanged.

`app/lib/shiki-source.ts` holds the shared type:

```ts
export interface HighlightedSource {
  raw: string;
  html: string;
  lang: string;
}
```

`app/vite-env.d.ts` (created if absent) types the `?shiki` import:

```ts
declare module '*?shiki' {
  const src: import('~/lib/shiki-source').HighlightedSource;
  export default src;
}
```

## Route changes

Five routes under `app/routes/` currently import a demo's source via
`?raw` and pass it through to `DemoCard`:

- `action-registry.tsx`
- `color-scheme.tsx`
- `command-palette.tsx`
- `keyboard-shortcuts.tsx`
- `search-facets.tsx`

The remaining routes (`index.tsx`, `integration.tsx`) do not use
`?raw` and do not render through `DemoCard`, so they need no change.

For each of the five, the change is mechanical — replace the import
suffix:

```ts
// before
import src from '~/components/demos/foo.tsx?raw';
// after
import src from '~/components/demos/foo.tsx?shiki';
```

No other route changes are needed.

## Verification

This site has no test setup for the `app/` shell, so verification is
manual:

1. `npm run dev` — open `/action-registry`. Confirm the snippet renders
   with colors, the copy button appears on hover, and clicking it copies
   the raw (unhighlighted) source.
2. Toggle the site's color-scheme. Confirm the highlight re-themes via
   CSS without flicker or re-render.
3. Edit `app/components/demos/action-registry.tsx` and save. Confirm
   HMR re-runs highlighting and the page updates without a full reload.
4. `npm run build`. Confirm the build succeeds and that no Shiki
   runtime leaks into the client bundle. A `grep` for one symbol is
   not enough — minified output mangles identifiers. Run all of:
   - `grep -rEi "shiki|@shikijs|oniguruma" dist/assets/` — should
     return only references inside the static HTML strings already
     embedded by the plugin (i.e., the `shiki` class on emitted
     `<pre>` elements), not module code.
   - `find dist -name "*.wasm"` — should be empty (Shiki's onig WASM
     would land here if it slipped through).
   - Compare `du -sh dist/assets/` against a pre-change baseline. The
     full Shiki runtime + grammars is on the order of ~1 MB
     unminified, so any unintended inclusion will be obvious.
5. After merge, visit one route on the deployed Pages site to confirm
   production HTML still highlights.

## Risks

- **Cold-start cost**: Shiki's WASM load adds ~1–2s to the first
  `vite dev` start. Acceptable.
- **HTML weight**: highlighted HTML for a long demo is ~5× the raw size
  (e.g. ~3KB raw → ~15KB HTML). Gzipped this is much smaller. Sample
  was within budget on inspection.
- **`shiki` dependency placement**: Shiki is only used by `vite.config.ts`
  at build time. Install it as a `devDependency` for consistency with
  the rest of the build chain (Vite, Tailwind, the React plugin, and
  `@types/*` already live there). CI runs `npm ci` without
  `--omit=dev`, so devDeps are present at build time. Shiki does not
  ship to the client.
- **ESLint `dangerouslySetInnerHTML`**: this project does not install
  or configure `eslint-plugin-react`, so the `react/no-danger` rule is
  not active. No disable comment is needed. A plain JSX comment in
  `CodeBlock` documents the trust boundary instead.
