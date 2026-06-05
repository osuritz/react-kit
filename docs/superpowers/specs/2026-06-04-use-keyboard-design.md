# `use-keyboard` drop-in — design

A registry-free hook for local, component-lifetime keyboard bindings:
"Escape closes this drawer", "mod+enter submits this form", "j/k navigates
this list". The kit already answers the app-wide case (`action-registry` +
`keyboard-shortcuts` + `command-palette`); this is the primitive below that
stack, for consumers who want one binding without buying three folders.

The matching engine is **lifted verbatim** from the battle-tested code that
already powers cmd+K: the grammar/matcher from
`src/components/keyboard-shortcuts/parse.ts` and the keydown loop from
`ShortcutsProvider` (`keyboard-shortcuts.tsx`). No new keyboard semantics are
invented anywhere in this drop-in.

## Goals & non-goals

**Goals**

- One hook, one copyable file. Map of shortcut-grammar strings → handlers,
  plus a single-binding sugar overload.
- Full grammar parity with `keyboard-shortcuts`: chords (`mod+shift+k`),
  sequences (`g i`), `mod` → Meta/Ctrl platform resolution, key aliases,
  the shift-punctuation relaxation (`"?"` just works).
- The provider's safety behaviors: editable-target guard, `event.repeat`
  skip, `preventDefault` only on claimed keystrokes, handler error
  containment, SSR safety.
- Zero runtime deps beyond `react >=18`. No base-ui, no clsx — the first
  zero-UI-dependency keyboard drop-in in the kit.

**Non-goals (v1)**

- A printable-character catch-all (`onKey`) for typing surfaces. Rejected
  for YAGNI; the options bag can grow it later without an API break.
- Registry, scopes, cheatsheet, `enabled()` closures — that's
  `keyboard-shortcuts`' job. A plain `enabled: boolean` covers the local case.
- Comma-separated alternates in map keys (`"mod+s, ctrl+s"`). Alternates are
  two map entries, or a `string[]` in the sugar overload.
- Refactoring `keyboard-shortcuts` / `command-palette` onto this hook. They
  stay untouched; the engine copy is the repo's accepted trade (see
  `command-palette.tsx`'s own intentionally-duplicated mini parser).

## Decisions (locked with the repo owner)

- **Standalone copy, not a layered refactor.** New `src/hooks/use-keyboard/`
  folder with its own copy of the parse/match core; `keyboard-shortcuts` and
  `command-palette` are not modified.
- **Engine is lifted, not redesigned.** The repo owner's own interview-style
  `useKeyboard` was reviewed and rejected as a source: keyup-based, no chord
  support, blocklist leaks (`Escape` reaches the default handler), listener
  churn. Its map-form ergonomics survive; its internals do not.
- **`parse.ts` is folded into `use-keyboard.ts`.** It's internal API — the
  hook is the entire public surface, and there is no second consumer (in
  `keyboard-shortcuts` the separate file exists because `format.ts` and the
  public re-exports also consume it). A provenance header marks the lifted
  section so future drift between the copies is auditable.
- **Pure helpers stay exported.** `parseShortcut`, `parseSequence`,
  `chordMatches`, `isMacLike` (+ the `Chord` / `Sequence` / `ParsedShortcut`
  types) are named exports — the grammar tests hit them directly instead of
  simulating DOM events per alias, and they double as an escape hatch.
  Costs nothing in a copy-paste kit.
- **Multi-instance semantics are "both fire", documented.** Within one
  `useKeyboard` call, the first completed candidate wins (provider
  behavior, map insertion order). Two separate `useKeyboard` calls binding
  the same chord are independent listeners and both fire — same as two
  `ShortcutsProvider`s would. The README states this.
- **`enabled: false` detaches the listener** (effect dependency), it is not
  a per-keystroke ref check. Zero overhead while disabled, and any
  in-progress sequence drops naturally on toggle.

## Files

Drop-in (what a consumer copies):

- `src/hooks/use-keyboard/use-keyboard.ts` — everything: the lifted
  parse/match core (provenance header) + the hook. Plain `.ts`, no JSX.
- `src/hooks/use-keyboard/README.md`

Verification harness (lives alongside, not copied — mirrors `use-debounce`):

- `package.json` — `private`, peer dep React `>=18`, devDeps pin React
  `^18.3.1` (test against the minimum supported peer), plus
  `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `vitest`,
  `typescript`, `@types/*`. Folder is auto-picked-up by the
  `src/hooks/*` glob in `pnpm-workspace.yaml`.
- `tsconfig.json` — same shape as `use-debounce`.
- `vitest.config.ts` — `environment: "jsdom"`, `globals: true`,
  `setupFiles: ["./vitest.setup.ts"]`,
  `coverage.include: ["use-keyboard.ts"]`.
- `vitest.setup.ts` — `@testing-library/jest-dom/vitest` import + `afterEach`
  cleanup/`vi.restoreAllMocks()`.
- `use-keyboard.test.tsx` — one suite: a grammar section (pure-function
  tests) and a hook section (DOM keydown dispatch).

Docs app wiring (per `AGENTS.md` — MDX, no router/nav edits):

- `app/components/demos/use-keyboard.tsx` — **new** demo wrapper importing
  via `#hooks/use-keyboard/use-keyboard`.
- `app/routes/use-keyboard.mdx` — **new** page. Frontmatter: `title`,
  `group: Hooks`, `order` (next free slot in the group), `blurb`,
  `dropInPath: src/hooks/use-keyboard`; embeds the demo + its `?shiki`
  source in a `<DemoCard>`.

## Public API

```ts
export type KeyHandler = (event: KeyboardEvent) => void | Promise<void>;

export interface UseKeyboardOptions {
  /**
   * DOM target the keydown listener attaches to. Defaults to `document`
   * (same rationale as ShortcutsProvider: portals are still part of the
   * document). Pass an element to gate bindings by focus.
   */
  target?: Document | HTMLElement;
  /** When false, the listener is not attached at all. Default true. */
  enabled?: boolean;
  /**
   * Fire even while the user types in an input/textarea/select/
   * contenteditable. Default false (bindings are suppressed there).
   * Hook-wide; call the hook twice if two groups need different values.
   */
  allowInInput?: boolean;
  /** Sequence window in ms. Default 1000; 0 disables sequences. */
  sequenceTimeoutMs?: number;
  /** Platform override for `mod` resolution. Tests only. */
  mac?: boolean;
}

/** Map form: keys are shortcut-grammar strings ("mod+k", "?", "g i"). */
export function useKeyboard(
  bindings: Record<string, KeyHandler>,
  options?: UseKeyboardOptions
): void;
/** Sugar: one binding; string[] = alternates ("mod+s" or "ctrl+s"). */
export function useKeyboard(
  shortcut: string | string[],
  handler: KeyHandler,
  options?: UseKeyboardOptions
): void;

// Escape hatch / test surface (lifted verbatim):
export { parseShortcut, parseSequence, chordMatches, isMacLike };
export type { Chord, Sequence, ParsedShortcut };
```

Overload resolution: first arg `string | string[]` → single binding;
otherwise it's the map. Both normalize internally to
`Array<{ handler, parsed: ParsedShortcut }>`.

## Matching semantics (all lifted from `ShortcutsProvider`)

On `keydown` (bubble phase) at `target`:

1. `event.repeat` → return (holding `mod+s` fires once; repeats never
   advance a sequence).
2. Modifier-only key (`Shift` alone, etc.) → return (doesn't reset an
   in-progress `g i`).
3. `isEditableTarget(event.target)` and not `allowInInput` → return
   **without touching the cursor** (the sequence timer handles cleanup).
   `isEditableTarget` is the lifted version including the input-type
   nuances (checkbox/radio/button/etc. don't count as editable).
4. Build candidates: fresh keystrokes seed from every binding's sequences;
   mid-sequence keystrokes filter the prior candidate set. A candidate
   survives if `chordMatches(head, event)`.
5. No candidate matched → reset the cursor silently, **no
   `preventDefault`** (we never claimed the key).
6. A candidate completed (no remaining chords) → `preventDefault()`, reset
   cursor, run its handler. Sync throws are caught and `console.error`-ed;
   returned promises get a `.catch` doing the same. The page never breaks.
7. Otherwise mid-sequence → `preventDefault()`, stash survivors, arm the
   timeout timer.

First completed candidate wins (map insertion order). Invalid shortcut
strings `console.warn` and the binding is skipped (action stays unbound) —
same author-bug policy as `collectBindings`.

## Stability & lifecycle

- **Bindings/handlers are read through a ref** written in an effect each
  render — the listener is _not_ re-attached when the user passes inline
  object/arrow literals (they will, every render). Parsing runs per render
  into that ref; this is the provider's explicit trade ("parsing is cheap,
  the list is small") and avoids memoizing on identities that never hold.
- **Parse warnings are deduped per hook instance** (a ref-held `Set` of
  already-warned shortcut strings) so an inline-literal re-parse doesn't
  spam the console every render.
- **Effect dependencies** (detach + re-attach + cursor reset):
  `target`, `enabled`, `sequenceTimeoutMs`, resolved `mac`. These change
  rarely or never.
- The sequence timer is cleared on detach/unmount. No state, no re-renders —
  the hook returns `void` and never causes one.
- SSR: no `document`/`navigator` access at module load or render;
  `isMacLike()` already guards `typeof navigator`. The effect body guards
  `typeof document` when defaulting the target.

## Testing plan (TDD; vitest + jsdom)

Grammar section (pure, via the exported helpers):

- `mod` resolves to Meta on mac, Ctrl elsewhere; all modifier aliases
  (`cmd`/`command`/`super`/`win` → meta, `option`/`opt` → alt, …).
- Key aliases: `esc`/`escape`, `return`/`enter`, `space`, arrow shorthands,
  `plus` → `+`.
- Sequences: `"g i"` parses to two chords; alternates `["mod+s", "ctrl+s"]`
  parse to two sequences.
- `chordMatches` shift relaxation: chord `"?"` matches Shift+/ events;
  chord `"k"` does **not** match Shift+K; `"shift+k"` does.
- Empty/garbage strings throw from `parseShortcut` (the hook layer converts
  to warn-and-skip).

Hook section (dispatch real `KeyboardEvent`s):

- Map form: `mod+k` fires its handler, `preventDefault` called; unmatched
  keys don't `preventDefault`.
- Sugar form: string and `string[]` alternates both fire.
- Sequence completes (`g` then `i`); mistype (`g` then `x`) resets and `x`
  is not claimed; timeout (fake timers) resets the cursor;
  `sequenceTimeoutMs: 0` disables sequences.
- `event.repeat` ignored; modifier-only keydown doesn't reset a sequence.
- Editable guard: binding doesn't fire while a focused `<input type="text">`
  is the event target; **does** fire from `<input type="checkbox">`;
  `allowInInput: true` fires from the text input.
- `enabled: false` → no listener (handler never fires); toggling true
  attaches; toggling false mid-sequence drops it.
- Unmount removes the listener and clears the pending sequence timer.
- Invalid chord in the map → `console.warn` once (not per render), other
  bindings still work.
- Handler that throws / rejects → `console.error`, no unhandled rejection,
  subsequent keystrokes still work.
- Two hook instances binding the same chord → both fire (documented
  semantic).
- Inline-literal bindings across re-renders → listener attached once
  (spy on `addEventListener`), latest handler is the one invoked.
- First-completed-wins within one call when two map entries share a chord.

Run: `pnpm install`, then in the folder `tsc --noEmit` and `vitest run`.

## README outline

Mirrors `use-debounce`'s README: what to copy (one file), peer requirements
(React ≥18 only), quick start (map form), the sugar overload, the grammar
table (chords / sequences / `mod` / aliases — borrowed wording from
`keyboard-shortcuts`' README), options table, the multi-instance "both
fire" note, an accessibility note (don't hijack keys users need; the
editable guard is on by default; prefer visible affordances alongside
shortcuts), "when to use `keyboard-shortcuts` instead" cross-link (registry,
scopes, cheatsheet — and note the engine is the same code), testing-this-
drop-in, decisions made.

## Demo page sketch

A small task-list card: `j`/`k` move the selection, `Enter` toggles done,
`mod+k` focuses the filter input (editable guard demo: `j`/`k` typed in the
filter don't move the selection), `g i` jumps selection to the first item
(sequence demo). Demo wrapper imports via `#hooks/...` exactly as a
consumer would.
