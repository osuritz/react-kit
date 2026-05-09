# keyboard-shortcuts

A drop-in keybinding layer + cheatsheet for React. Subscribes to the
[action-registry](../../hooks/action-registry/README.md) and binds any
registered action that has a `shortcut` field. Single chords (`mod+k`),
arrays of alternates (`["mod+s", "ctrl+s"]`), and Gmail-style two-key
sequences (`g i`) all work. Ships a `<ShortcutCheatsheet>` that lists every
registered action with platform-correct glyphs (⌘ on macOS, `Ctrl`
elsewhere). No npm package, no build step — copy the folder into your app.

> **You don't need this drop-in for one or two `cmd+k`-style listeners.**
> A hand-rolled `addEventListener("keydown", …)` is fine for that. Reach for
> this when you have a real shortcut surface — multiple groups, sequences,
> a cheatsheet that has to stay in sync with what's actually registered, and
> the same action being triggered from a palette and a key.

## What to copy

Copy these files into your project (e.g. `src/components/keyboard-shortcuts/`):

- `keyboard-shortcuts.tsx` — `<ShortcutsProvider>`, `<ShortcutCheatsheet>`,
  `useShortcutScope()`, `formatShortcut()`
- `parse.ts` — pure chord/sequence parser, `chordMatches()`, `isMacLike()`
- `format.ts` — display helpers (`formatChord`, `formatSequence`,
  `formatShortcut`)
- `lib/cn.ts` — local class-name composer (shadcn idiom)
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `keyboard-shortcuts.test.tsx`) are
the **verification harness** — they live alongside the drop-in so
`npm test` works here, but they're not part of what you copy into your app.

This drop-in *consumes* the action-registry drop-in — it does not redefine
the `Action` contract. Make sure
[`src/hooks/action-registry/`](../../hooks/action-registry/README.md) is in
your project too (or wired to wherever you're keeping the registry).

Peer requirements:

- React 18+ (works in 18 and 19, uses `useSyncExternalStore`)
- `@base-ui/react` (≥ 1.4) — only for the cheatsheet's `Dialog`. Delete
  the cheatsheet (and the import) if you don't want it and the peer
  drops away.
- `clsx` (≥ 2), `tailwind-merge` (≥ 2) — for the local `cn()` helper
- Tailwind CSS v4 + the standard shadcn theme tokens (`bg-popover`,
  `text-popover-foreground`, `border-border`, …) on `:root` — see
  [`shadcn/tailwind.css`](https://ui.shadcn.com/docs/tailwind-v4).
  Without these tokens the cheatsheet renders unstyled.

## Setup

1. **Wrap your app** in both providers, in this order:

   ```tsx
   import { ActionsProvider } from "./hooks/action-registry/actions";
   import { ShortcutsProvider, ShortcutCheatsheet } from "./components/keyboard-shortcuts/keyboard-shortcuts";

   export function App() {
     return (
       <ActionsProvider>
         <ShortcutsProvider>
           <Routes />
           <ShortcutCheatsheet />
         </ShortcutsProvider>
       </ActionsProvider>
     );
   }
   ```

   `<ShortcutsProvider>` attaches one `keydown` listener to `document`
   (overridable via the `target` prop). It re-evaluates on every
   keystroke — there's no per-action listener.

2. **Register actions** with `useAction` from anywhere inside the
   provider. Add a `shortcut` field and the binding lights up:

   ```tsx
   import { useAction } from "./hooks/action-registry/actions";
   import { useNavigate } from "react-router-dom";

   export function NavShortcuts() {
     const navigate = useNavigate();
     useAction({
       id: "nav.settings",
       label: "Open Settings",
       group: "Navigation",
       shortcut: "mod+,",
       run: () => navigate("/settings"),
     });
     useAction({
       id: "nav.inbox",
       label: "Go to inbox",
       group: "Navigation",
       shortcut: "g i", // two-key sequence
       run: () => navigate("/inbox"),
     });
     return null;
   }
   ```

3. **Render the cheatsheet.** It's a shadcn-styled dialog bound to `?` by
   default; override with `shortcut="mod+/"` or `shortcut={false}` to
   disable. The list updates live when actions are added or removed.

   ```tsx
   <ShortcutCheatsheet />
   // or controlled:
   <ShortcutCheatsheet open={open} onOpenChange={setOpen} />
   ```

## Shortcut grammar

```
shortcut := chord ( WS chord )*       // sequence, e.g. "g i"
chord    := ( modifier "+" )* key     // e.g. "mod+shift+k"
```

- **Modifiers**: `mod` (⌘ on macOS, `Ctrl` elsewhere), `ctrl` / `control`,
  `meta` / `cmd` / `command`, `alt` / `option`, `shift`. Order doesn't
  matter when authoring; the cheatsheet always renders them in
  `ctrl-alt-shift-meta` order so the visual is stable.
- **Keys**: any single character (`k`, `?`, `,`) or a named key
  (`Enter`, `Escape`, `ArrowUp`, `Space`, …). Aliases: `esc` →
  `Escape`, `up` → `ArrowUp`, `space` → ` `, etc.
- **Sequences**: whitespace-separated chords. `"g i"` fires only when `g`
  is pressed and `i` is pressed within `sequenceTimeoutMs` (default 1
  second).
- **Alternates**: `shortcut: ["mod+s", "ctrl+s"]` binds both — useful when
  the platform-resolved `mod` would already cover one but you want the
  literal spelling too.

### Shift handling for punctuation

Punctuation like `?`, `!`, `@` requires Shift on most keyboards, but the
browser delivers them as `event.key === "?"` (already shifted). The
matcher relaxes its shift comparison for those: a chord that says `"?"`
matches whether or not `shiftKey` is reported. Uppercase ASCII letters
keep strict semantics — `"k"` will *not* fire on Shift+K. Write
`"shift+k"` (or `"K"`, which parses to the same thing after lowercasing)
when you actually want the shift-modifier form.

## Inputs and editable surfaces

The provider checks `event.target` against `<input>`, `<textarea>`, and
`contenteditable` before firing. Actions with `allowInInput: true` opt out
of the check — the canonical case is `mod+k` for a command palette, which
should fire even when the user is mid-search. Pseudo-inputs that don't
take text (`<input type="checkbox">`, `<input type="radio">`, etc.) are
not treated as editable.

`<input type="search">` is treated as editable. If your app uses one for
a top-bar palette and you want shortcuts to fire from inside it, add
`allowInInput` to the relevant action.

## Scopes

Every action has an optional `scope` field. `undefined`, `""`, and
`"global"` are equivalent — always active. Anything else is a named
scope, gated by `useShortcutScope`:

```tsx
import { useShortcutScope } from "./components/keyboard-shortcuts/keyboard-shortcuts";

function EditorRoute() {
  useShortcutScope("editor"); // active for the lifetime of this component
  // …
}

useAction({
  id: "editor.save",
  label: "Save",
  scope: "editor",
  shortcut: "mod+s",
  run: save,
});
```

Scopes are reference-counted — the same scope can be activated by several
components and stays active until the last one unmounts. v1 is
intentionally minimal (no exclusive scopes, no priority); the hook exists
so apps can start tagging actions today and the wiring expands without an
API break.

## API

### `<ShortcutsProvider>`

| Prop                | Type                       | Default      |
|---------------------|----------------------------|--------------|
| `target`            | `Document \| HTMLElement`  | `document`   |
| `sequenceTimeoutMs` | `number`                   | `1000`       |
| `mac`               | `boolean`                  | autodetected |

Must be inside an `<ActionsProvider>`. Attaches one `keydown` listener,
ignores `event.repeat`, calls `preventDefault()` only when a chord
matched (a single chord that fires, or the first chord of a still-live
sequence). Modifier-only keystrokes (Shift / Control / …) don't reset
in-progress sequences.

### `<ShortcutCheatsheet>`

| Prop           | Type                                    | Default                |
|----------------|-----------------------------------------|------------------------|
| `shortcut`     | `string \| string[] \| false`           | `"?"`                  |
| `title`        | `ReactNode`                             | `"Keyboard shortcuts"` |
| `description`  | `ReactNode`                             | —                      |
| `open`         | `boolean`                               | uncontrolled           |
| `onOpenChange` | `(open: boolean) => void`               | —                      |
| `className`    | `string`                                | —                      |
| `mac`          | `boolean`                               | autodetected           |

Lists every registered action with a `shortcut`, grouped by
`Action.group` (with an "Other" bucket for ungrouped actions, pinned
last). The cheatsheet self-registers a `system.cheatsheet` action under
the "Help" group so its own binding shows up in the listing — pass
`shortcut={false}` to suppress that.

### `useShortcutScope(scope?: string): void`

Activates `scope` for the calling component's lifetime.

### `formatShortcut(shortcut, mac?): FormattedShortcut`

Pure helper for rendering keys outside the cheatsheet (e.g. menu items,
tooltips, an "ⓘ" hint next to a button). Returns `{ sequences:
FormattedSequence[] }`; each `FormattedChord` carries `caps: KeyCap[]`
where `cap.label` is the visible glyph (`"⌘"`, `"K"`, `"Esc"`, …).

## Testing this drop-in

This directory ships a Vitest harness so you can verify the code before
copying it:

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```

The harness covers parsing, formatting, single chords, sequences,
sequence timeout, `enabled()`, `allowInInput`, scope gating, key-repeat
suppression, and the cheatsheet (auto-listing, `shortcut={false}`,
controlled open). The vitest config dedupes `react`, `react-dom`, and
`@base-ui/react` because the action-registry source resolves through the
worktree-root `node_modules/` while the harness installs its own — same
dedupe the root `vite.config.ts` applies for the same reason.

## Decisions made (where the spec left a choice)

- **One global listener, not per-action.** The provider attaches a single
  `keydown` listener on `document` (overridable via `target`). Per-action
  listeners would scale poorly when you have a `g a`/`g b`/`g c`/… family
  — the matcher's per-keystroke walk over registered chords is cheaper
  and keeps sequence handling in one place.

- **Scopes are designed in but minimal in v1.** Only the implicit
  `"global"` scope and reference-counted named scopes are wired. No
  priority, no exclusive scopes, no per-target activation. The
  `useShortcutScope` API is the seam for that future without breaking
  callers.

- **Shift relaxation for punctuation.** A `"?"` chord matches `shift+/`
  events because the browser delivers `event.key === "?"`; uppercase ASCII
  letters keep strict semantics. The alternative — forcing authors to
  write `"shift+/"` for `?` — is what every "why doesn't this work"
  Stack Overflow thread is about, and we'd rather absorb the complexity
  here than push it into every `useAction`.

- **`allowInInput` on the `Action` type, not a separate registration
  argument.** It's a property of the action, not of the binding — a
  palette-open action wants to fire from inputs whether you bind it via
  this drop-in, a button, or a context menu. The registry treats it as
  opaque metadata; only this drop-in reads it.

- **`event.repeat` is suppressed unconditionally.** Holding `mod+s` should
  fire once, and a `g i` sequence shouldn't advance every 30 ms. Apps
  that want repeat semantics (like `j`/`k` for list navigation) should
  reach for a focused per-list listener; that's not what a global
  shortcut surface is for.

- **`preventDefault()` only on match.** Both the firing chord and the
  in-progress first chord of a sequence claim the keystroke. Unmatched
  keys flow through normally — typing `a` doesn't get clobbered just
  because some action somewhere binds `g i`.

- **Cheatsheet self-registers its own binding.** Otherwise the
  cheatsheet's `?` shortcut wouldn't appear in the cheatsheet itself,
  which is the kind of inconsistency that erodes trust in the listing.
  Pass `shortcut={false}` if you want to register your own.
