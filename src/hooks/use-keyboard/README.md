# use-keyboard

Local, component-lifetime keyboard bindings: map shortcut strings to
handlers. Chords (`mod+shift+k`), multi-key sequences (`g i`), platform
`mod` resolution, and an editable-target guard — the same engine that
powers the `keyboard-shortcuts` drop-in, without the registry, scopes, or
cheatsheet.

## What to copy

- `use-keyboard.ts` — the whole drop-in, one file.

Everything else in this folder (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-keyboard.test.tsx`) is the
verification harness — it stays here.

## Peer requirements

- `react >= 18`

No UI library, no styling peers, no runtime dependencies.

## Quick start

```tsx
import { useKeyboard } from './use-keyboard';

function Drawer({ onClose }: { onClose: () => void }) {
  useKeyboard({
    escape: onClose,
    'mod+enter': submit,
    'g i': () => navigate('/inbox'), // multi-key sequence
  });
  // ...
}
```

One binding? There's a sugar overload — `string[]` means alternates:

```tsx
useKeyboard('escape', onClose);
useKeyboard(['mod+s', 'ctrl+s'], save); // both forms, even on a Mac
```

## Shortcut grammar

Same grammar as the `keyboard-shortcuts` drop-in:

| Form     | Example                                | Meaning                                |
| -------- | -------------------------------------- | -------------------------------------- |
| chord    | `mod+shift+k`                          | modifiers + one key, all held together |
| sequence | `g i`                                  | chords typed one after another         |
| `mod`    | `mod+k`                                | Cmd on macOS, Ctrl elsewhere           |
| aliases  | `esc`, `return`, `space`, `up`, `plus` | normalized key spellings               |

Punctuation that needs Shift just works: write `'?'`, not `'shift+/'`.
Letters stay strict — `'k'` does not fire on Shift+K; write `'shift+k'`.

## Options

| Option              | Default    | What it does                                                                                                 |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| `target`            | `document` | DOM target the keydown listener attaches to. Pass an element to gate bindings by focus.                      |
| `enabled`           | `true`     | When false, no listener is attached at all. Toggling drops any in-progress sequence.                         |
| `allowInInput`      | `false`    | Fire even while typing in inputs/textareas/contenteditable. Hook-wide — call the hook twice for mixed needs. |
| `sequenceTimeoutMs` | `1000`     | Window for the next chord in a sequence. `0` disables sequences (multi-chord bindings become inert).         |
| `mac`               | auto       | Platform override for `mod` resolution. Tests only.                                                          |

## Behavior notes

- **`preventDefault` only on claimed keystrokes.** A keystroke is claimed
  when it completes a binding or advances a sequence. Unmatched keys are
  untouched.
- **Editable guard is on by default.** Bindings are suppressed while the
  user types in an input, textarea, select, or contenteditable.
  Pseudo-button inputs (checkbox, radio, …) don't suppress. Opt in with
  `allowInInput` — e.g. an `escape` binding that should blur the field:

  ```tsx
  useKeyboard({ j: down, k: up }); // guarded
  useKeyboard('escape', blurFilter, { allowInInput: true }); // not
  ```

- **Auto-repeat is ignored.** Holding `mod+s` fires once.
- **First completed binding wins** within one `useKeyboard` call (map
  insertion order). Separate calls are independent listeners — two hooks
  bound to the same chord **both fire**.
- **Author bugs don't break the page.** An unparseable shortcut warns once
  (dev console) and is skipped; a handler that throws or rejects is logged
  and the listener keeps working.
- **SSR-safe.** No DOM access during render; the listener attaches in an
  effect.

## When to use `keyboard-shortcuts` instead

If you want an app-wide registry of actions with shortcut strings, scopes,
and a rendered cheatsheet dialog, copy the `action-registry` +
`keyboard-shortcuts` drop-ins instead. The matching engine is the same
code — this hook is the local primitive, those are the app-level system.

## Testing this drop-in

From this folder: `pnpm install` once at the repo root, then
`pnpm run test` and `pnpm run typecheck` here.

## Decisions made

- The parse/match core is lifted verbatim from
  `src/components/keyboard-shortcuts/parse.ts` (only the error-message
  prefix differs) and folded into the hook file so consumers copy one file.
  If you maintain both drop-ins, keep the copies in sync manually.
- `sequenceTimeoutMs: 0` makes multi-chord bindings inert rather than
  letting a half-typed sequence claim keystrokes it can never complete.
- No printable-character catch-all (`onKey`) in v1 — the options bag can
  grow one later without an API break.
