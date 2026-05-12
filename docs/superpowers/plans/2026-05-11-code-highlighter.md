# Code Highlighter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unhighlighted `<pre><code>` in `DemoCard` with Shiki syntax-highlighted snippets, generated at build time via a Vite plugin and re-themed through CSS variables.

**Architecture:** A small Vite plugin intercepts `?shiki` query imports of `.tsx` files, runs Shiki's `codeToHtml` with a `createCssVariablesTheme`, and emits a JS module exporting `{ raw, html, lang }`. A new `<CodeBlock>` renders that HTML, exposes a copy button for the raw source, and styles the Shiki-emitted `<pre>` via descendant Tailwind variants. Token colors live in `app/index.css` as `--shiki-*` CSS variables under `:root` and `.dark`, so color-scheme toggling re-themes the highlight via CSS without re-rendering.

**Tech Stack:** Shiki (devDependency, build-time only), Vite plugin API, Tailwind v4 arbitrary-variants, React 19, existing shadcn token system.

**Spec:** `docs/superpowers/specs/2026-05-11-code-highlighter-design.md`

**Testing note:** The `app/` shell has no Vitest setup; the spec explicitly chose manual verification. Each task ends with a concrete smoke check + commit instead of a test step.

---

## File map

Create:
- `app/lib/shiki-source.ts` — `HighlightedSource` type
- `app/vite-env.d.ts` — module declaration for `*?shiki`
- `app/vite-plugins/shiki.ts` — the Vite plugin
- `app/components/ui/code-block.tsx` — the `<CodeBlock>` component

Modify:
- `package.json` — add `shiki` to `devDependencies`
- `vite.config.ts` — register the plugin
- `app/index.css` — add `--shiki-*` CSS variables
- `app/components/demo-card.tsx` — swap `source: string` → `source: HighlightedSource`, use `<CodeBlock>`
- `app/routes/action-registry.tsx` — `?raw` → `?shiki`
- `app/routes/color-scheme.tsx` — `?raw` → `?shiki` (two imports)
- `app/routes/command-palette.tsx` — `?raw` → `?shiki`
- `app/routes/keyboard-shortcuts.tsx` — `?raw` → `?shiki`
- `app/routes/search-facets.tsx` — `?raw` → `?shiki`

---

### Task 1: Install Shiki

**Files:**
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Install Shiki as a devDependency**

Run from the worktree root:
```bash
npm install --save-dev shiki
```

Expected: `package.json` gains a `shiki` entry under `devDependencies` and `package-lock.json` updates. The shiki package lands in `node_modules/shiki/`.

- [ ] **Step 2: Verify the install resolves**

Run:
```bash
node --input-type=module -e "import('shiki').then(m => console.log(typeof m.createHighlighter, typeof m.createCssVariablesTheme))"
```

Expected: `function function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add shiki as a devDependency for build-time highlighting"
```

---

### Task 2: Define the `HighlightedSource` type and `?shiki` module declaration

**Files:**
- Create: `app/lib/shiki-source.ts`
- Create: `app/vite-env.d.ts`

- [ ] **Step 1: Create the type module**

Write `app/lib/shiki-source.ts`:

```ts
export interface HighlightedSource {
  raw: string;
  html: string;
  lang: string;
}
```

- [ ] **Step 2: Create the module declaration**

Write `app/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

declare module "*?shiki" {
  const src: import("~/lib/shiki-source").HighlightedSource;
  export default src;
}
```

The `/// <reference types="vite/client" />` line keeps Vite's existing client globals (`import.meta.env`, asset modules, etc.) available alongside the new declaration.

- [ ] **Step 3: Verify TypeScript picks the file up**

Run:
```bash
npx tsc -b --noEmit
```

Expected: no new errors. If `tsconfig.app.json` does not already include `app/**/*.d.ts`, add it now — check the existing `include` array and adjust if needed.

- [ ] **Step 4: Commit**

```bash
git add app/lib/shiki-source.ts app/vite-env.d.ts
git commit -m "feat(app): type the ?shiki import suffix"
```

---

### Task 3: Add CSS variables for the highlighter theme

**Files:**
- Modify: `app/index.css`

- [ ] **Step 1: Add the light-mode token block**

Inside the existing `:root { ... }` block in `app/index.css`, append (after `--sidebar-ring`):

```css
    /* Shiki highlighter — light */
    --shiki-background: var(--muted);
    --shiki-foreground: var(--foreground);
    --shiki-token-constant:          oklch(0.45 0.13 250);
    --shiki-token-string:            oklch(0.55 0.13 145);
    --shiki-token-comment:           var(--muted-foreground);
    --shiki-token-keyword:           oklch(0.50 0.20 350);
    --shiki-token-parameter:         oklch(0.50 0.13  60);
    --shiki-token-function:          oklch(0.50 0.17 285);
    --shiki-token-string-expression: oklch(0.55 0.13 145);
    --shiki-token-punctuation:       var(--foreground);
    --shiki-token-link:              oklch(0.55 0.15 220);
```

- [ ] **Step 2: Add the dark-mode token block**

Inside the existing `.dark { ... }` block, append (after `--sidebar-ring`):

```css
    /* Shiki highlighter — dark */
    --shiki-background: var(--card);
    --shiki-token-constant:          oklch(0.78 0.12 250);
    --shiki-token-string:            oklch(0.80 0.13 145);
    --shiki-token-keyword:           oklch(0.78 0.18 350);
    --shiki-token-parameter:         oklch(0.82 0.13  60);
    --shiki-token-function:          oklch(0.78 0.15 285);
    --shiki-token-string-expression: oklch(0.80 0.13 145);
    --shiki-token-link:              oklch(0.78 0.15 220);
```

`--shiki-foreground`, `--shiki-token-comment`, and `--shiki-token-punctuation` re-resolve correctly from their `var(...)` definitions in `:root` because shadcn's own light/dark cascade swaps `--foreground` and `--muted-foreground` for us.

- [ ] **Step 3: Smoke-check the build still parses CSS**

Run:
```bash
npm run build
```

Expected: build succeeds. No CSS parse errors. (The bundle won't yet show any highlighting; we're only validating the CSS rules.)

- [ ] **Step 4: Commit**

```bash
git add app/index.css
git commit -m "feat(app): add --shiki-* CSS variables for light + dark"
```

---

### Task 4: Write the Vite plugin

**Files:**
- Create: `app/vite-plugins/shiki.ts`

- [ ] **Step 1: Create the plugin file**

Write `app/vite-plugins/shiki.ts`:

```ts
import fs from "node:fs/promises";
import type { Plugin } from "vite";
import {
  createHighlighter,
  createCssVariablesTheme,
  type Highlighter,
} from "shiki";

const QUERY = "?shiki";

const theme = createCssVariablesTheme({
  name: "shadcn",
  variablePrefix: "--shiki-",
});

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    langs: ["tsx"],
    themes: [theme],
  });
  return highlighterPromise;
}

export function shiki(): Plugin {
  return {
    name: "react-kit:shiki",
    async load(id) {
      if (!id.endsWith(QUERY)) return null;

      const filepath = id.slice(0, -QUERY.length);
      const raw = await fs.readFile(filepath, "utf8");

      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(raw, {
        lang: "tsx",
        theme: "shadcn",
      });

      this.addWatchFile(filepath);

      return `export default ${JSON.stringify({
        raw,
        html,
        lang: "tsx",
      })};`;
    },
  };
}
```

Key design points:
- Module-scoped `highlighterPromise` makes `createHighlighter` a singleton across all `load` calls in one Vite process.
- `this.addWatchFile(filepath)` ties the virtual `?shiki` module to the real source file so editing the demo `.tsx` triggers HMR.
- `JSON.stringify` is sufficient — the emitted object contains only strings.
- No try/catch around `codeToHtml`: any error bubbles up to Vite, which renders it in the error overlay. Silent fallback would hide real problems.

- [ ] **Step 2: TypeScript-check the plugin**

Run:
```bash
npx tsc -b --noEmit
```

Expected: no errors related to the new file. If `tsconfig.app.json` does not cover `app/vite-plugins/**`, add it. (Vite itself does not need it compiled at build time — the file is loaded via `vite.config.ts` which goes through Vite's own TS handling — but having it in the project's tsconfig keeps the editor happy.)

- [ ] **Step 3: Commit**

```bash
git add app/vite-plugins/shiki.ts
git commit -m "feat(app): add ?shiki Vite plugin for build-time highlighting"
```

---

### Task 5: Register the plugin in `vite.config.ts`

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Register the plugin**

Edit `vite.config.ts`. Add the import near the existing imports:

```ts
import { shiki } from "./app/vite-plugins/shiki";
```

And add `shiki()` to the `plugins` array. The full plugins line becomes:

```ts
  plugins: [react(), tailwindcss(), shiki()],
```

Place `shiki()` after `tailwindcss()` — order between these three doesn't matter functionally because they handle disjoint module ids, but keeping app-specific plugins last is the convention.

- [ ] **Step 2: Smoke-test that a `?shiki` import resolves**

Start dev:
```bash
npm run dev
```

In another terminal, hit the dev server with curl and check that one of the demo `.tsx` files can be imported with the `?shiki` suffix. Easiest path: temporarily add a console.log in `app/main.tsx`:

```ts
import probe from "~/components/demos/action-registry.tsx?shiki";
console.log("[shiki probe]", { rawLen: probe.raw.length, htmlLen: probe.html.length, lang: probe.lang });
```

Open `http://localhost:5173/react-kit/`, open DevTools console. Expected log:
- `rawLen` > 1000 (the demo file is ~3 KB)
- `htmlLen` significantly larger than `rawLen` (typical 4–6×)
- `lang === "tsx"`

If those check out, **remove the probe lines from `app/main.tsx`** (do not commit them). Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat(app): register the shiki plugin in vite.config.ts"
```

---

### Task 6: Build the `<CodeBlock>` component

**Files:**
- Create: `app/components/ui/code-block.tsx`

- [ ] **Step 1: Create the component**

Write `app/components/ui/code-block.tsx`:

```tsx
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

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
        "group relative",
        "[&_pre]:max-h-80 [&_pre]:overflow-auto",
        "[&_pre]:rounded-md [&_pre]:p-4",
        "[&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed",
        // Shiki writes inline style="background-color:...; color:..." on
        // the <pre>; force our CSS-vars to win.
        "[&_pre]:![background-color:var(--shiki-background)]",
        "[&_pre]:![color:var(--shiki-foreground)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={async () => {
          await navigator.clipboard.writeText(raw);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="bg-background/80 text-muted-foreground hover:text-foreground border-border absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded border opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      {/* HTML is build-time output of Shiki over file-owned source — not user input. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
```

Notes:
- The outer wrapper is a `<div>`, **not** a `<pre>` — Shiki's `codeToHtml` already emits `<pre><code>...</code></pre>`, and nesting `<pre>` inside `<pre>` is invalid HTML.
- `[&_pre]:...` Tailwind arbitrary-variants apply layout (max-height, overflow, padding, radius, type) to the Shiki-emitted `<pre>`. The `!` prefix overrides the inline `background-color` / `color` Shiki writes there.
- Copy button hidden by default; revealed on group hover or when focused via keyboard.

- [ ] **Step 2: TypeScript-check**

Run:
```bash
npx tsc -b --noEmit
```

Expected: no errors. If `cn` is missing or unresolved, check `app/lib/utils.ts` (it should already export it; this file is shadcn-standard).

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/code-block.tsx
git commit -m "feat(app): add CodeBlock component with copy button"
```

---

### Task 7: Wire `<CodeBlock>` into `DemoCard`

**Files:**
- Modify: `app/components/demo-card.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `app/components/demo-card.tsx` with:

```tsx
import type { ReactNode } from "react";
import { CodeBlock } from "./ui/code-block";
import type { HighlightedSource } from "~/lib/shiki-source";

export interface DemoCardProps {
  title: string;
  description: string;
  source: HighlightedSource;
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
      <CodeBlock raw={source.raw} html={source.html} />
    </section>
  );
}
```

The card-level rounded-bottom corners come from the outer `<section>`'s `rounded-lg overflow-hidden`; the `CodeBlock`'s own rounded corners are visually clipped by it, which is fine.

- [ ] **Step 2: TypeScript-check**

Run:
```bash
npx tsc -b --noEmit
```

Expected: **errors** in every route that still passes a `string` for `source`. That's the signal that the type swap took. We'll fix those routes in Task 8. Leave the errors for now.

- [ ] **Step 3: Stage but do not commit yet**

Don't commit here — the routes are now broken. We'll commit DemoCard + the route migration together once everything type-checks, in Task 8.

---

### Task 8: Migrate the five routes from `?raw` to `?shiki`

**Files:**
- Modify: `app/routes/action-registry.tsx`
- Modify: `app/routes/color-scheme.tsx`
- Modify: `app/routes/command-palette.tsx`
- Modify: `app/routes/keyboard-shortcuts.tsx`
- Modify: `app/routes/search-facets.tsx`

- [ ] **Step 1: action-registry.tsx**

In `app/routes/action-registry.tsx`, change:
```ts
import actionRegistrySrc from "~/components/demos/action-registry.tsx?raw";
```
to:
```ts
import actionRegistrySrc from "~/components/demos/action-registry.tsx?shiki";
```

- [ ] **Step 2: color-scheme.tsx (two imports)**

In `app/routes/color-scheme.tsx`, change both:
```ts
import buttonSrc from "~/components/demos/mode-toggle-button.tsx?raw";
import segmentedSrc from "~/components/demos/mode-toggle-segmented.tsx?raw";
```
to:
```ts
import buttonSrc from "~/components/demos/mode-toggle-button.tsx?shiki";
import segmentedSrc from "~/components/demos/mode-toggle-segmented.tsx?shiki";
```

- [ ] **Step 3: command-palette.tsx**

In `app/routes/command-palette.tsx`, change the `?raw` suffix to `?shiki` on the `commandPaletteSrc` import.

- [ ] **Step 4: keyboard-shortcuts.tsx**

In `app/routes/keyboard-shortcuts.tsx`, change the `?raw` suffix to `?shiki` on the `keyboardShortcutsSrc` import.

- [ ] **Step 5: search-facets.tsx**

In `app/routes/search-facets.tsx`, change the `?raw` suffix to `?shiki` on its source import.

- [ ] **Step 6: TypeScript-check**

Run:
```bash
npx tsc -b --noEmit
```

Expected: clean. No errors. If any route still complains about `source` type, scan it for a missed `?raw`.

- [ ] **Step 7: Verify no stray `?raw` for demo source remains**

Run:
```bash
grep -rn '?raw' app/
```

Expected: no output. If anything shows up, decide case-by-case — but for the demo source imports specifically there should be nothing left.

- [ ] **Step 8: Commit the whole swap**

```bash
git add app/components/demo-card.tsx app/routes/
git commit -m "feat(app): render demo source via Shiki-highlighted CodeBlock"
```

---

### Task 9: Manual verification

This task ships no code; it's the verification battery from the spec, run end-to-end.

- [ ] **Step 1: Dev server smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/react-kit/action-registry`. Confirm:
- The source block at the bottom of each `DemoCard` shows colored syntax (keywords, strings, identifiers visibly distinct from punctuation).
- Hovering the source block reveals a copy button in the top-right corner.
- Clicking the copy button flips the icon to a check for ~1.5s.
- Paste into a scratch editor — pasted text is the **raw** TSX, no HTML tags.

- [ ] **Step 2: Color-scheme re-theme**

While the dev server is still running, toggle the site's color-scheme via the existing toggle. Confirm:
- The code block background swaps (light = muted gray; dark = card).
- The token colors swap to the dark palette.
- No flash, no remount — purely a CSS transition.

- [ ] **Step 3: HMR check**

With dev still running, open `app/components/demos/action-registry.tsx`. Add a throwaway top-level comment like `// hmr probe`. Save. Confirm:
- The browser updates within ~1s.
- The new comment appears in the highlighted source block.
- The page does **not** do a full reload (Vite's HMR overlay reports an update, not a reload).

Remove the comment, save again — clean. Kill the dev server.

- [ ] **Step 4: Production build**

```bash
npm run build
```

Expected: build succeeds. No TS errors, no plugin errors.

- [ ] **Step 5: Verify no Shiki runtime in the client bundle**

Run all three:
```bash
grep -rEi 'shiki|@shikijs|oniguruma' dist/assets/ || echo "no matches"
find dist -name '*.wasm'
du -sh dist/assets
```

Expected:
- `grep` may surface the literal class names `shiki` and `language-tsx` inside the static HTML strings the plugin embedded — that's expected. There should be **no** matches that look like module code (no `createHighlighter`, no `oniguruma` strings, no large minified blocks).
- `find` returns nothing.
- `du -sh dist/assets` is comparable to the previous build (within ~5 KB). If it ballooned by hundreds of KB, the plugin output is leaking Shiki — investigate before shipping.

- [ ] **Step 6: Preview the production build**

```bash
npm run preview
```

Open the preview URL (port shown in output), visit `/react-kit/action-registry` (and one other route). Confirm the highlight still renders. Kill preview.

- [ ] **Step 7: Final commit (only if anything from verification required a fix)**

If verification surfaced a defect, fix it, then:

```bash
git add -A
git commit -m "fix(app): <describe>"
```

If everything passed first try, no commit needed — Task 9 is verification-only.

---

## Done criteria

- All five drop-in routes render source with colored syntax in both light and dark mode.
- Copy button copies raw, unhighlighted TSX.
- HMR re-runs highlighting when a demo `.tsx` is edited.
- `npm run build` ships no Shiki runtime to `dist/`.
