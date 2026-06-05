# `use-keyboard` Drop-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `src/hooks/use-keyboard/` — a registry-free, single-file hook for local keyboard bindings (chords, sequences, editable-target guard), with the matching engine lifted verbatim from the `keyboard-shortcuts` drop-in.

**Architecture:** One copyable file (`use-keyboard.ts`) containing the lifted parse/match core plus the hook; a per-folder vitest harness mirroring `use-debounce`; an MDX demo page wired per `AGENTS.md`. Spec: `docs/superpowers/specs/2026-06-04-use-keyboard-design.md`.

**Tech Stack:** React 18 (peer), TypeScript, vitest + jsdom + @testing-library/react, pnpm workspace, oxlint/oxfmt.

**Execution context:** Work happens in the existing worktree on branch `use-keyboard`. All commands run from the repo root unless a task says otherwise. This repo is **pnpm-only** — never `npm`/`yarn`.

**A note on TDD shape:** Tasks 2–4 are classic red→green. Tasks 5–7 are _behavioral verification_ of code lifted from the battle-tested `ShortcutsProvider` — their tests are expected to pass on first run because the engine already implements the behavior; they exist to pin it in this folder's own harness. If any of them fail, that's a real bug in the lift — stop and fix before moving on.

---

### Task 1: Scaffold the drop-in harness

**Files:**

- Create: `src/hooks/use-keyboard/package.json`
- Create: `src/hooks/use-keyboard/tsconfig.json`
- Create: `src/hooks/use-keyboard/vitest.config.ts`
- Create: `src/hooks/use-keyboard/vitest.setup.ts`

These mirror `src/hooks/use-debounce/` exactly, with the name and coverage target swapped.

- [ ] **Step 1: Create `src/hooks/use-keyboard/package.json`**

```json
{
  "name": "use-keyboard",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitest/coverage-v8": "^2.1.4",
    "jsdom": "^29.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.5.4",
    "vitest": "^2.1.4"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create `src/hooks/use-keyboard/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["*.ts", "*.tsx"]
}
```

- [ ] **Step 3: Create `src/hooks/use-keyboard/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['use-keyboard.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
```

- [ ] **Step 4: Create `src/hooks/use-keyboard/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
```

- [ ] **Step 5: Install (registers the new workspace package)**

Run from repo root: `pnpm install`
Expected: succeeds; lockfile picks up the `use-keyboard` workspace package (the `src/hooks/*` glob in `pnpm-workspace.yaml` covers it — no config edit needed).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-keyboard pnpm-lock.yaml
git commit -m "chore(use-keyboard): scaffold drop-in harness"
```

---

### Task 2: Lifted parse/match core (grammar TDD)

**Files:**

- Create: `src/hooks/use-keyboard/use-keyboard.test.tsx` (grammar section)
- Create: `src/hooks/use-keyboard/use-keyboard.ts` (lifted core only — the hook comes in Task 3)

The core is **lifted verbatim** from `src/components/keyboard-shortcuts/parse.ts`, with exactly one change: error-message prefixes say `use-keyboard:` instead of `keyboard-shortcuts:` (three occurrences). Do not "improve" anything else.

- [ ] **Step 1: Write the failing grammar tests**

Create `src/hooks/use-keyboard/use-keyboard.test.tsx` with:

Imports and helpers are introduced in the task that first uses them — `noUnusedLocals` is on, so don't import ahead of need.

```tsx
import { describe, expect, it } from 'vitest';
import { type Chord, chordMatches, parseSequence, parseShortcut } from './use-keyboard';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const chord = (key: string, mods: Partial<Chord> = {}): Chord => ({
  ctrl: false,
  meta: false,
  alt: false,
  shift: false,
  key,
  ...mods,
});

const kbd = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key, ...init });

/* ------------------------------------------------------------------ */
/*  Grammar (pure helpers, lifted from keyboard-shortcuts)             */
/* ------------------------------------------------------------------ */

describe('parseSequence', () => {
  it('parses a bare key', () => {
    expect(parseSequence('k', false)).toEqual([chord('k')]);
  });

  it('resolves mod to meta on mac', () => {
    expect(parseSequence('mod+k', true)).toEqual([chord('k', { meta: true })]);
  });

  it('resolves mod to ctrl elsewhere', () => {
    expect(parseSequence('mod+k', false)).toEqual([chord('k', { ctrl: true })]);
  });

  it.each([
    ['meta+k', { meta: true }],
    ['cmd+k', { meta: true }],
    ['command+k', { meta: true }],
    ['super+k', { meta: true }],
    ['win+k', { meta: true }],
    ['ctrl+k', { ctrl: true }],
    ['control+k', { ctrl: true }],
    ['alt+k', { alt: true }],
    ['option+k', { alt: true }],
    ['opt+k', { alt: true }],
    ['shift+k', { shift: true }],
  ] as const)('modifier alias %s', (raw, mods) => {
    expect(parseSequence(raw, false)).toEqual([chord('k', mods)]);
  });

  it.each([
    ['esc', 'escape'],
    ['return', 'enter'],
    ['space', ' '],
    ['up', 'arrowup'],
    ['down', 'arrowdown'],
    ['left', 'arrowleft'],
    ['right', 'arrowright'],
    ['del', 'delete'],
    ['plus', '+'],
  ] as const)('key alias %s -> %s', (raw, key) => {
    expect(parseSequence(raw, false)).toEqual([chord(key)]);
  });

  it('parses a two-chord sequence', () => {
    expect(parseSequence('g i', false)).toEqual([chord('g'), chord('i')]);
  });

  it('throws on an empty string', () => {
    expect(() => parseSequence('', false)).toThrow();
  });

  it('throws on an unknown modifier', () => {
    expect(() => parseSequence('bogus+x', false)).toThrow(/unknown modifier/);
  });
});

describe('parseShortcut', () => {
  it('wraps a single string into one sequence', () => {
    expect(parseShortcut('mod+k', false)).toEqual([[chord('k', { ctrl: true })]]);
  });

  it('parses alternates into multiple sequences', () => {
    expect(parseShortcut(['mod+s', 'ctrl+s'], true)).toEqual([
      [chord('s', { meta: true })],
      [chord('s', { ctrl: true })],
    ]);
  });
});

describe('chordMatches', () => {
  it('matches an exact chord', () => {
    expect(chordMatches(chord('k', { ctrl: true }), kbd('k', { ctrlKey: true }))).toBe(true);
  });

  it('rejects a missing modifier', () => {
    expect(chordMatches(chord('k', { ctrl: true }), kbd('k'))).toBe(false);
  });

  it('rejects an extra modifier', () => {
    expect(chordMatches(chord('k'), kbd('k', { ctrlKey: true }))).toBe(false);
  });

  it('allows shift-produced punctuation: "?" matches Shift+/', () => {
    expect(chordMatches(chord('?'), kbd('?', { shiftKey: true }))).toBe(true);
  });

  it('keeps letters strict: "k" does not match Shift+K', () => {
    expect(chordMatches(chord('k'), kbd('K', { shiftKey: true }))).toBe(false);
  });

  it('"shift+k" matches Shift+K', () => {
    expect(chordMatches(chord('k', { shift: true }), kbd('K', { shiftKey: true }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: FAIL — cannot resolve `./use-keyboard`.

- [ ] **Step 3: Create `src/hooks/use-keyboard/use-keyboard.ts` with the lifted core**

Full file content (this is `parse.ts` verbatim apart from the file header, the section banners, and the three `use-keyboard:` error prefixes):

```ts
// Peer requirements: react >=18. Nothing else — no UI library, no styling
// peers. The drop-in is a single headless hook.
//
// Local, component-lifetime keyboard bindings: "escape closes this drawer",
// "mod+enter submits", "j/k navigates this list". For an app-wide system
// with a registry, scopes, and a cheatsheet, use the keyboard-shortcuts
// drop-in instead — it runs this exact engine.

/* -------------------------------------------------------------------------- */
/*  Parse/match core                                                          */
/*                                                                            */
/*  Lifted verbatim from src/components/keyboard-shortcuts/parse.ts; only    */
/*  the error-message prefix differs. If you maintain both drop-ins, keep    */
/*  the copies in sync manually.                                             */
/*                                                                            */
/*  Grammar:                                                                  */
/*    shortcut := chord ( WS chord )*       // sequence (e.g. "g i")          */
/*    chord    := ( modifier "+" )* key     // e.g. "mod+shift+k"             */
/*    modifier := "mod" | "ctrl" | "control" | "meta" | "cmd" | "command"     */
/*              | "super" | "win" | "alt" | "option" | "opt" | "shift"        */
/*    key      := single character | named key (Escape, Enter, ArrowUp, ...)  */
/*                                                                            */
/*  `mod` resolves to `meta` on macOS and `ctrl` elsewhere.                   */
/* -------------------------------------------------------------------------- */

export interface Chord {
  /** Whether the `Control` modifier must be held. */
  ctrl: boolean;
  /** Whether the `Meta` modifier (Cmd on macOS, Win/Super elsewhere) must be held. */
  meta: boolean;
  /** Whether the `Alt`/`Option` modifier must be held. */
  alt: boolean;
  /** Whether the `Shift` modifier must be held. */
  shift: boolean;
  /** Normalized key name (lowercase). Matches `KeyboardEvent.key.toLowerCase()`. */
  key: string;
}

export type Sequence = Chord[];

/** Result of parsing a shortcut — one or more equivalent sequences. */
export type ParsedShortcut = Sequence[];

const MODIFIER_ALIASES: Record<string, 'ctrl' | 'meta' | 'alt' | 'shift'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  shift: 'shift',
};

/**
 * Map a few common KeyboardEvent.key spellings to a single canonical form.
 * Keep this minimal — most keys (`a`, `?`, `,`, `Enter`, `Escape`, …) round-
 * trip via lowercase. The map exists for cases where authors write `"esc"`
 * but the event delivers `"Escape"`, or `"space"` vs `" "`.
 */
const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  escape: 'escape',
  enter: 'enter',
  return: 'enter',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  arrowup: 'arrowup',
  arrowdown: 'arrowdown',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
  del: 'delete',
  delete: 'delete',
  backspace: 'backspace',
  tab: 'tab',
  plus: '+',
};

/** True when running on macOS / iOS-style platforms where `mod` should mean Meta. */
export function isMacLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  // `navigator.platform` is deprecated but still the most reliable signal in
  // browsers we target. Fall back to userAgent if it's missing.
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function parseChord(raw: string, mac: boolean): Chord {
  const parts = raw
    .split('+')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    throw new Error(`use-keyboard: empty chord in "${raw}"`);
  }

  const chord: Chord = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: '',
  };

  // Last segment is the key; everything before is a modifier.
  const keyRaw = parts[parts.length - 1].toLowerCase();
  const modParts = parts.slice(0, -1);

  for (const m of modParts) {
    const norm = m.toLowerCase();
    if (norm === 'mod') {
      if (mac) chord.meta = true;
      else chord.ctrl = true;
      continue;
    }
    const mapped = MODIFIER_ALIASES[norm];
    if (!mapped) {
      throw new Error(`use-keyboard: unknown modifier "${m}" in chord "${raw}"`);
    }
    chord[mapped] = true;
  }

  chord.key = KEY_ALIASES[keyRaw] ?? keyRaw;
  return chord;
}

/**
 * Parse a single shortcut string into a sequence of chords. A sequence is
 * one chord (`"mod+k"`) or several whitespace-separated ones (`"g i"`).
 */
export function parseSequence(raw: string, mac = isMacLike()): Sequence {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('use-keyboard: empty shortcut string');
  }
  return trimmed.split(/\s+/).map((c) => parseChord(c, mac));
}

/**
 * Parse a shortcut — accepts `string` (one sequence) or `string[]`
 * (alternates), returns the list of sequences.
 *
 * Alternates are useful for cross-platform spellings: `["mod+s", "ctrl+s"]`
 * binds both forms even on a Mac, where `mod+s` already maps to Meta.
 */
export function parseShortcut(shortcut: string | string[], mac = isMacLike()): ParsedShortcut {
  const list = Array.isArray(shortcut) ? shortcut : [shortcut];
  return list.map((s) => parseSequence(s, mac));
}

/**
 * True when a `KeyboardEvent` matches a single chord.
 *
 * Modifier comparison is exact for `ctrl` / `meta` / `alt` and *almost*
 * exact for `shift`. The shift exception:
 *
 *   - chord requires shift, event doesn't have it → reject.
 *   - event has shift but chord doesn't → reject only if the event's
 *     `key` is an *uppercase letter*; otherwise allow.
 *
 * The exception exists because punctuation like `?`, `!`, `@` requires
 * Shift on most keyboards but the browser delivers them via the shifted
 * value (`event.key === "?"`). Authors write the chord as `"?"`, not
 * `"shift+?"`, and we'd be unmatchable without the relaxation. Uppercase
 * ASCII letters keep strict semantics so `"k"` doesn't fire on
 * Shift+K — that case has to be written `"shift+k"` (or `"K"`, which
 * parses to `"k"` after our lowercasing — strict by design).
 */
export function chordMatches(chord: Chord, event: KeyboardEvent): boolean {
  if (event.ctrlKey !== chord.ctrl) return false;
  if (event.metaKey !== chord.meta) return false;
  if (event.altKey !== chord.alt) return false;
  if (event.shiftKey !== chord.shift) {
    if (chord.shift) return false; // chord wanted shift, event lacks it
    // Event has shift but chord doesn't. Allow only when the key value
    // isn't itself an uppercase letter (i.e. shift didn't change the
    // key's case). `event.key` could be `"?"`, `"!"`, `"@"`, `"K"`, etc.
    // Uppercase ASCII letters round-trip through `toLowerCase()`; a key
    // like `"?"` is its own lowercase — that's the discriminator.
    if (event.key !== event.key.toLowerCase()) return false;
  }
  const k = event.key.toLowerCase();
  return k === chord.key;
}

/** True when the event corresponds to a modifier key by itself
 *  (e.g. user pressed `Shift` in isolation). Used to ignore keystrokes
 *  that shouldn't reset an in-progress sequence. */
export function isModifierOnly(event: KeyboardEvent): boolean {
  const k = event.key;
  return (
    k === 'Shift' ||
    k === 'Control' ||
    k === 'Alt' ||
    k === 'Meta' ||
    k === 'OS' ||
    k === 'Hyper' ||
    k === 'Super'
  );
}
```

- [ ] **Step 4: Run the grammar tests to verify they pass**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS (all `parseSequence` / `parseShortcut` / `chordMatches` tests green).

- [ ] **Step 5: Typecheck**

Run: `cd src/hooks/use-keyboard && pnpm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "feat(use-keyboard): lift parse/match core from keyboard-shortcuts"
```

---

### Task 3: The hook — chord matching (TDD)

**Files:**

- Modify: `src/hooks/use-keyboard/use-keyboard.test.tsx` (append hook section)
- Modify: `src/hooks/use-keyboard/use-keyboard.ts` (replace placeholder with the real hook)

- [ ] **Step 1: Append failing hook tests**

In `use-keyboard.test.tsx`, replace the two import lines with:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  type Chord,
  chordMatches,
  parseSequence,
  parseShortcut,
  useKeyboard,
} from './use-keyboard';
```

Add the `press` helper next to `chord`/`kbd`:

```tsx
/** Dispatch a cancelable, bubbling keydown and return the event. */
function press(
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}
```

Then append:

```tsx
/* ------------------------------------------------------------------ */
/*  Hook — chords                                                      */
/* ------------------------------------------------------------------ */

describe('useKeyboard — chords', () => {
  it('fires the handler and claims the keystroke on a match (map form)', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ 'mod+k': onK }, { mac: false }));
    const event = press('k', { ctrlKey: true });
    expect(onK).toHaveBeenCalledTimes(1);
    expect(onK).toHaveBeenCalledWith(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not claim keystrokes it did not bind', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ 'mod+k': onK }, { mac: false }));
    const event = press('k'); // no modifier held
    expect(onK).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('sugar overload: single string', () => {
    const onEsc = vi.fn();
    renderHook(() => useKeyboard('escape', onEsc));
    press('Escape');
    expect(onEsc).toHaveBeenCalledTimes(1);
  });

  it('sugar overload: string[] alternates both fire', () => {
    const save = vi.fn();
    renderHook(() => useKeyboard(['mod+s', 'ctrl+s'], save, { mac: true }));
    press('s', { metaKey: true });
    press('s', { ctrlKey: true });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('first completed binding wins when two entries share a chord', () => {
    const a = vi.fn();
    const b = vi.fn();
    // 'K' parses to the same chord as 'k' (keys are lowercased), giving two
    // map entries for one chord without an object-literal key collision.
    renderHook(() => useKeyboard({ k: a, K: b }));
    press('k');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });

  it('ignores auto-repeat', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }));
    press('k', { repeat: true });
    expect(onK).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: FAIL — `use-keyboard.ts` has no `useKeyboard` export yet, so the suite fails at import time.

- [ ] **Step 3: Implement the hook**

In `use-keyboard.ts`: add the React import at the top of the file (first line after the header comment), and replace the placeholder `useKeyboard` with the following. The keydown loop is lifted from `ShortcutsProvider` in `src/components/keyboard-shortcuts/keyboard-shortcuts.tsx` (the `cursorRef` / `tryConsume` / claim-on-fire structure), minus registry/scopes/enabled-closures; `isEditableTarget` is lifted verbatim from the same file.

At the top:

```ts
import * as React from 'react';
```

Replacing the placeholder:

```ts
/* -------------------------------------------------------------------------- */
/*  Editable-target detection                                                 */
/*  Lifted verbatim from keyboard-shortcuts.tsx (isEditableTarget).           */
/* -------------------------------------------------------------------------- */

/** True when the keystroke is happening inside an editable surface. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT') {
    // Some <input> types are pseudo-buttons — checkboxes, radios, etc. —
    // and shouldn't suppress shortcuts. We special-case those because
    // most apps want `space` and `enter` to pass through, but `?` to fire.
    const type = (target as HTMLInputElement).type?.toLowerCase();
    if (
      type === 'checkbox' ||
      type === 'radio' ||
      type === 'button' ||
      type === 'submit' ||
      type === 'reset' ||
      type === 'file' ||
      type === 'image' ||
      type === 'color' ||
      type === 'range'
    ) {
      return false;
    }
    return true;
  }
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export type KeyHandler = (event: KeyboardEvent) => void | Promise<void>;

export interface UseKeyboardOptions {
  /**
   * The DOM target the keydown listener attaches to. Defaults to `document`
   * so events from inside React/Radix/Base-UI portals are still caught
   * (portals are still part of the document). Pass a specific element to
   * gate bindings by focus.
   */
  target?: Document | HTMLElement;
  /** When false, the listener is not attached at all. Defaults to `true`. */
  enabled?: boolean;
  /**
   * Fire even while the user types in an input/textarea/select/
   * contenteditable. Defaults to `false` (bindings are suppressed there).
   * Hook-wide — call the hook twice if two groups of bindings need
   * different values.
   */
  allowInInput?: boolean;
  /**
   * How long (ms) to wait for the next chord in a multi-key sequence before
   * resetting the buffer. Defaults to `1000`. Set to `0` to disable
   * sequences entirely (multi-chord bindings become inert; single chords
   * are unaffected).
   */
  sequenceTimeoutMs?: number;
  /**
   * Override the platform detection used for `mod` resolution. Mostly
   * useful for tests — leave undefined in production.
   */
  mac?: boolean;
}

interface ParsedBinding {
  handler: KeyHandler;
  sequences: ParsedShortcut;
}

/**
 * Bind keyboard shortcuts for the lifetime of the calling component.
 *
 * Map form: keys are shortcut-grammar strings —
 *
 *   useKeyboard({
 *     'mod+k':  () => setOpen(true),
 *     'escape': () => setOpen(false),
 *     'g i':    () => navigate('/inbox'),
 *   });
 *
 * Sugar form binds one handler; `string[]` means alternates —
 *
 *   useKeyboard(['mod+s', 'ctrl+s'], save);
 *
 * Within one call, the first completed binding wins (map insertion order).
 * Separate `useKeyboard` calls are independent listeners — two hooks bound
 * to the same chord BOTH fire.
 */
export function useKeyboard(
  bindings: Record<string, KeyHandler>,
  options?: UseKeyboardOptions
): void;
export function useKeyboard(
  shortcut: string | string[],
  handler: KeyHandler,
  options?: UseKeyboardOptions
): void;
export function useKeyboard(
  bindingsOrShortcut: Record<string, KeyHandler> | string | string[],
  handlerOrOptions?: KeyHandler | UseKeyboardOptions,
  maybeOptions?: UseKeyboardOptions
): void {
  const sugar = typeof bindingsOrShortcut === 'string' || Array.isArray(bindingsOrShortcut);
  const options =
    (sugar ? maybeOptions : (handlerOrOptions as UseKeyboardOptions | undefined)) ?? {};
  const { target, enabled = true, allowInInput = false, sequenceTimeoutMs = 1000, mac } = options;
  const macResolved = mac ?? isMacLike();

  // Bindings are re-parsed on every render — the same trade ShortcutsProvider
  // makes: callers pass inline literals whose identity changes per render, so
  // memoizing would never hit; parsing is cheap and the list is small. Bad
  // shortcut strings are author bugs — warn once per string, skip the binding.
  const warnedRef = React.useRef<Set<string>>(new Set());
  const entries: Array<[string | string[], KeyHandler]> = sugar
    ? [[bindingsOrShortcut as string | string[], handlerOrOptions as KeyHandler]]
    : Object.entries(bindingsOrShortcut as Record<string, KeyHandler>);
  const parsed: ParsedBinding[] = [];
  for (const [source, handler] of entries) {
    try {
      parsed.push({ handler, sequences: parseShortcut(source, macResolved) });
    } catch (err) {
      const key = Array.isArray(source) ? source.join(', ') : source;
      if (!warnedRef.current.has(key)) {
        warnedRef.current.add(key);
        if (typeof console !== 'undefined') {
          console.warn(
            `use-keyboard: failed to parse shortcut "${key}": ${(err as Error).message}`
          );
        }
      }
    }
  }

  // Live values read by the long-lived listener — kept in a ref so the
  // listener doesn't re-attach when inline literals change identity (the
  // ref read picks the new bindings up immediately, no event is missed).
  const latestRef = React.useRef({ parsed, allowInInput });
  React.useEffect(() => {
    latestRef.current = { parsed, allowInInput };
  });

  // In-progress sequence buffer.
  const cursorRef = React.useRef<{
    /** Bindings still in the running for the current sequence. */
    candidates: Array<{ handler: KeyHandler; remaining: Chord[] }>;
    /** Timer that resets the cursor after sequenceTimeoutMs of silence. */
    timer: ReturnType<typeof setTimeout> | null;
  }>({ candidates: [], timer: null });

  React.useEffect(() => {
    if (!enabled) return;
    const targetEl: EventTarget | null =
      target ?? (typeof document !== 'undefined' ? document : null);
    if (!targetEl) return;

    const resetCursor = () => {
      if (cursorRef.current.timer !== null) {
        clearTimeout(cursorRef.current.timer);
      }
      cursorRef.current.candidates = [];
      cursorRef.current.timer = null;
    };

    const armTimer = () => {
      if (cursorRef.current.timer !== null) {
        clearTimeout(cursorRef.current.timer);
      }
      if (sequenceTimeoutMs > 0) {
        cursorRef.current.timer = setTimeout(resetCursor, sequenceTimeoutMs);
      }
    };

    const onKeyDown = (raw: Event) => {
      const event = raw as KeyboardEvent;
      // Skip auto-repeats. Holding `mod+s` should fire once, and it
      // definitely shouldn't advance a `g i` sequence on every repeat tick.
      if (event.repeat) return;
      // Pressing Shift on its own shouldn't reset an in-progress `g i`.
      if (isModifierOnly(event)) return;

      const { parsed, allowInInput } = latestRef.current;
      // Hook-wide editable guard. Return without touching the cursor — the
      // sequence timer handles cleanup if the user starts typing mid-sequence.
      if (!allowInInput && isEditableTarget(event.target)) return;

      const cursor = cursorRef.current;
      const startingFresh = cursor.candidates.length === 0;

      // Build the candidate list for this keystroke. When starting fresh we
      // walk every binding's sequences; when continuing we filter the prior
      // candidate set.
      const next: Array<{ handler: KeyHandler; remaining: Chord[] }> = [];

      const tryConsume = (handler: KeyHandler, seq: Chord[]) => {
        const head = seq[0];
        if (!head) return;
        if (!chordMatches(head, event)) return;
        next.push({ handler, remaining: seq.slice(1) });
      };

      if (startingFresh) {
        for (const binding of parsed) {
          for (const seq of binding.sequences) {
            tryConsume(binding.handler, seq);
          }
        }
      } else {
        for (const cand of cursor.candidates) {
          tryConsume(cand.handler, cand.remaining);
        }
      }

      if (next.length === 0) {
        // No candidate matched this keystroke. If we were mid-sequence,
        // drop the cursor silently — the user mistyped or moved on. We do
        // not preventDefault: we never claimed the key.
        resetCursor();
        return;
      }

      // Find a candidate that completed (no remaining chords).
      const completed = next.find((c) => c.remaining.length === 0);
      if (completed) {
        // Fire and reset. preventDefault only when we actually claim the
        // keystroke.
        event.preventDefault();
        resetCursor();
        try {
          const result = completed.handler(event);
          if (result instanceof Promise) {
            result.catch((err) => {
              if (typeof console !== 'undefined') {
                console.error('use-keyboard: handler failed:', err);
              }
            });
          }
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error('use-keyboard: handler threw:', err);
          }
        }
        return;
      }

      // Still mid-sequence: stash the surviving candidates, claim the
      // keystroke (so `g` doesn't surface to the page), arm the timer.
      event.preventDefault();
      cursor.candidates = next;
      armTimer();
    };

    // Bubble phase, same as ShortcutsProvider: input-level handlers see the
    // event first; the editable guard stops us claiming keystrokes that
    // belong to them.
    targetEl.addEventListener('keydown', onKeyDown as EventListener);
    return () => {
      targetEl.removeEventListener('keydown', onKeyDown as EventListener);
      resetCursor();
    };
  }, [target, enabled, sequenceTimeoutMs]);
}
```

(Note: `mac` deliberately affects parsing only, which flows through `latestRef` — it is not an effect dependency, so changing it never re-attaches the listener. The spec listed it as a dep; this is the lint-clean refinement of the same intent.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS — all grammar + chord tests green.

- [ ] **Step 5: Typecheck**

Run: `cd src/hooks/use-keyboard && pnpm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "feat(use-keyboard): chord-map hook with sugar overload"
```

---

### Task 4: Sequences (TDD for the `sequenceTimeoutMs: 0` rule)

**Files:**

- Modify: `src/hooks/use-keyboard/use-keyboard.test.tsx` (append)
- Modify: `src/hooks/use-keyboard/use-keyboard.ts` (two-line change)

- [ ] **Step 1: Append sequence tests**

```tsx
/* ------------------------------------------------------------------ */
/*  Hook — sequences                                                   */
/* ------------------------------------------------------------------ */

describe('useKeyboard — sequences', () => {
  it('completes a two-chord sequence and claims both keystrokes', () => {
    const go = vi.fn();
    renderHook(() => useKeyboard({ 'g i': go }));
    const g = press('g');
    expect(g.defaultPrevented).toBe(true);
    expect(go).not.toHaveBeenCalled();
    const i = press('i');
    expect(i.defaultPrevented).toBe(true);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('a mistype resets the sequence and is not claimed', () => {
    const go = vi.fn();
    renderHook(() => useKeyboard({ 'g i': go }));
    press('g');
    const x = press('x');
    expect(x.defaultPrevented).toBe(false);
    press('i'); // after the reset, a bare "i" matches nothing
    expect(go).not.toHaveBeenCalled();
  });

  it('a bare modifier press does not reset an in-progress sequence', () => {
    const go = vi.fn();
    renderHook(() => useKeyboard({ 'g i': go }));
    press('g');
    press('Shift', { shiftKey: true });
    press('i');
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('the sequence buffer times out after sequenceTimeoutMs', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    renderHook(() => useKeyboard({ 'g i': go }));
    press('g');
    vi.advanceTimersByTime(1001);
    press('i');
    expect(go).not.toHaveBeenCalled();
  });

  it('sequenceTimeoutMs: 0 disables sequences without claiming their first chord', () => {
    const go = vi.fn();
    const onJ = vi.fn();
    renderHook(() => useKeyboard({ 'g i': go, j: onJ }, { sequenceTimeoutMs: 0 }));
    const g = press('g');
    expect(g.defaultPrevented).toBe(false); // the inert binding never seeds
    press('i');
    expect(go).not.toHaveBeenCalled();
    press('j');
    expect(onJ).toHaveBeenCalledTimes(1); // single chords are unaffected
  });
});
```

- [ ] **Step 2: Run tests; expect exactly one failure**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: everything passes EXCEPT `sequenceTimeoutMs: 0 disables sequences…` — `g` gets `defaultPrevented === true` because the multi-chord binding seeds the cursor.

(Background: `ShortcutsProvider` documents `0` as "disable sequences" but its implementation merely never arms the reset timer, so sequences never expire instead. We implement the documented behavior; the provider's doc/impl mismatch is noted for a separate follow-up, not fixed here.)

- [ ] **Step 3: Implement the seeding filter**

In the `startingFresh` branch of `onKeyDown`, skip multi-chord sequences when sequences are disabled:

```ts
      if (startingFresh) {
        for (const binding of parsed) {
          for (const seq of binding.sequences) {
            // `sequenceTimeoutMs <= 0` disables sequences: multi-chord
            // bindings never seed the cursor (a claimed-then-dropped first
            // chord would be worse than an inert binding).
            if (seq.length > 1 && sequenceTimeoutMs <= 0) continue;
            tryConsume(binding.handler, seq);
          }
        }
      } else {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "feat(use-keyboard): sequence support with documented timeout-0 semantics"
```

---

### Task 5: Editable-target guard (verification)

**Files:**

- Modify: `src/hooks/use-keyboard/use-keyboard.test.tsx` (append)

- [ ] **Step 1: Append guard tests**

Update the vitest import line first (this task is the first to use `afterEach`):

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
```

Then append:

```tsx
/* ------------------------------------------------------------------ */
/*  Hook — editable-target guard                                       */
/* ------------------------------------------------------------------ */

describe('useKeyboard — editable-target guard', () => {
  function mount<T extends HTMLElement>(el: T): T {
    document.body.appendChild(el);
    return el;
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('suppresses bindings while typing in a text input', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }));
    const input = mount(document.createElement('input'));
    press('k', {}, input);
    expect(onK).not.toHaveBeenCalled();
  });

  it('still fires from pseudo-button inputs (checkbox)', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }));
    const checkbox = mount(document.createElement('input'));
    checkbox.type = 'checkbox';
    press('k', {}, checkbox);
    expect(onK).toHaveBeenCalledTimes(1);
  });

  it('suppresses in a textarea', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }));
    const textarea = mount(document.createElement('textarea'));
    press('k', {}, textarea);
    expect(onK).not.toHaveBeenCalled();
  });

  it('suppresses in contenteditable', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }));
    const div = mount(document.createElement('div'));
    // jsdom doesn't implement isContentEditable — pin the property so we're
    // testing OUR guard logic, not jsdom's gap.
    Object.defineProperty(div, 'isContentEditable', { value: true });
    press('k', {}, div);
    expect(onK).not.toHaveBeenCalled();
  });

  it('allowInInput: true fires from a text input', () => {
    const onK = vi.fn();
    renderHook(() => useKeyboard({ k: onK }, { allowInInput: true }));
    const input = mount(document.createElement('input'));
    press('k', {}, input);
    expect(onK).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS (this behavior shipped with the lifted loop in Task 3). A failure here means the lift broke — fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "test(use-keyboard): pin editable-target guard behavior"
```

---

### Task 6: Lifecycle (verification)

**Files:**

- Modify: `src/hooks/use-keyboard/use-keyboard.test.tsx` (append)

- [ ] **Step 1: Append lifecycle tests**

```tsx
/* ------------------------------------------------------------------ */
/*  Hook — lifecycle                                                   */
/* ------------------------------------------------------------------ */

describe('useKeyboard — lifecycle', () => {
  it('enabled: false attaches no listener; toggling true attaches', () => {
    const onK = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useKeyboard({ k: onK }, { enabled }),
      { initialProps: { enabled: false } }
    );
    press('k');
    expect(onK).not.toHaveBeenCalled();
    rerender({ enabled: true });
    press('k');
    expect(onK).toHaveBeenCalledTimes(1);
  });

  it('toggling enabled off drops an in-progress sequence', () => {
    const go = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useKeyboard({ 'g i': go }, { enabled }),
      { initialProps: { enabled: true } }
    );
    press('g');
    rerender({ enabled: false });
    rerender({ enabled: true });
    press('i');
    expect(go).not.toHaveBeenCalled();
  });

  it('unmount removes the listener and clears the pending sequence timer', () => {
    vi.useFakeTimers();
    const go = vi.fn();
    const onK = vi.fn();
    const { unmount } = renderHook(() => useKeyboard({ 'g i': go, k: onK }));
    press('g');
    unmount();
    press('k');
    expect(onK).not.toHaveBeenCalled();
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('attaches once across re-renders with inline literals; the latest handler wins', () => {
    const calls: number[] = [];
    const addSpy = vi.spyOn(document, 'addEventListener');
    const { rerender } = renderHook(
      ({ n }: { n: number }) => useKeyboard({ k: () => calls.push(n) }),
      { initialProps: { n: 1 } }
    );
    rerender({ n: 2 });
    const keydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown');
    expect(keydownAdds).toHaveLength(1);
    press('k');
    expect(calls).toEqual([2]);
  });

  it('two instances binding the same chord BOTH fire', () => {
    const a = vi.fn();
    const b = vi.fn();
    renderHook(() => {
      useKeyboard({ k: a });
      useKeyboard({ k: b });
    });
    press('k');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('an element target only hears events dispatched within it', () => {
    const onK = vi.fn();
    const box = document.createElement('div');
    document.body.appendChild(box);
    renderHook(() => useKeyboard({ k: onK }, { target: box }));
    press('k'); // dispatched on document — never reaches box
    expect(onK).not.toHaveBeenCalled();
    press('k', {}, box);
    expect(onK).toHaveBeenCalledTimes(1);
    box.remove();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS. (The attach-once test is the one most likely to catch a regression if anyone "simplifies" `latestRef` away.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "test(use-keyboard): pin lifecycle semantics (enabled, unmount, attach-once, multi-instance)"
```

---

### Task 7: Robustness (verification)

**Files:**

- Modify: `src/hooks/use-keyboard/use-keyboard.test.tsx` (append)

- [ ] **Step 1: Append robustness tests**

```tsx
/* ------------------------------------------------------------------ */
/*  Hook — robustness                                                  */
/* ------------------------------------------------------------------ */

describe('useKeyboard — robustness', () => {
  it('warns once per invalid shortcut and keeps other bindings working', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onK = vi.fn();
    const { rerender } = renderHook(() =>
      useKeyboard({ 'bogus+x': vi.fn(), 'mod+k': onK }, { mac: false })
    );
    rerender();
    rerender();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('bogus+x');
    press('k', { ctrlKey: true });
    expect(onK).toHaveBeenCalledTimes(1);
  });

  it('contains a throwing handler and keeps working', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onJ = vi.fn();
    renderHook(() =>
      useKeyboard({
        k: () => {
          throw new Error('boom');
        },
        j: onJ,
      })
    );
    expect(() => press('k')).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    press('j');
    expect(onJ).toHaveBeenCalledTimes(1);
  });

  it('contains a rejecting async handler', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useKeyboard({ k: () => Promise.reject(new Error('boom')) }));
    press('k');
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run the full suite**

Run: `cd src/hooks/use-keyboard && pnpm run test`
Expected: PASS, all sections.

- [ ] **Step 3: Typecheck**

Run: `cd src/hooks/use-keyboard && pnpm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-keyboard
git commit -m "test(use-keyboard): pin warn-once parsing and handler error containment"
```

---

### Task 8: Drop-in README

**Files:**

- Create: `src/hooks/use-keyboard/README.md`

- [ ] **Step 1: Write the README**

````markdown
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
````

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

````

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-keyboard/README.md
git commit -m "docs(use-keyboard): drop-in README"
````

---

### Task 9: Demo page + catalog wiring

**Files:**

- Create: `app/components/demos/use-keyboard.tsx`
- Create: `app/routes/use-keyboard.mdx`
- Modify: `README.md` (root catalog — insert after the `use-autocomplete` entry, before `action-registry`)

Per `AGENTS.md`, the route table and nav are generated from MDX frontmatter — no router or nav edits.

- [ ] **Step 1: Create the demo wrapper `app/components/demos/use-keyboard.tsx`**

```tsx
import { useRef, useState } from 'react';
import { useKeyboard } from '#hooks/use-keyboard/use-keyboard.ts';

const TASKS = ['Triage the inbox', 'Review PR #42', 'Update the changelog', 'Cut the release'];

export function KeyboardDemo() {
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [filter, setFilter] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);

  const visible = TASKS.map((label, id) => ({ label, id })).filter(({ label }) =>
    label.toLowerCase().includes(filter.trim().toLowerCase())
  );
  // Clamp: the filter can shrink the list under the cursor.
  const selected = Math.min(cursor, Math.max(visible.length - 1, 0));

  useKeyboard({
    j: () => setCursor(Math.min(selected + 1, Math.max(visible.length - 1, 0))),
    k: () => setCursor(Math.max(selected - 1, 0)),
    'g g': () => setCursor(0),
    'mod+k': () => filterRef.current?.focus(),
    enter: () => {
      const id = visible[selected]?.id;
      if (id === undefined) return;
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
  });
  // Escape should work *while typing* in the filter — the editable-target
  // guard (on by default) would swallow it, so it gets its own opted-in call.
  useKeyboard('escape', () => filterRef.current?.blur(), { allowInInput: true });

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <input
        ref={filterRef}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter tasks… (mod+k)"
        aria-label="Filter tasks"
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
      />
      <ul aria-label="Tasks" className="flex flex-col gap-1">
        {visible.map(({ label, id }, i) => (
          <li
            key={id}
            aria-current={i === selected || undefined}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              i === selected ? 'bg-muted' : ''
            }`}
          >
            <span
              aria-hidden
              className={`inline-block size-1.5 rounded-full ${
                done.has(id) ? 'bg-foreground' : 'border-muted-foreground border'
              }`}
            />
            <span className={done.has(id) ? 'text-muted-foreground line-through' : ''}>
              {label}
            </span>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-sm">No tasks match.</li>
        ) : null}
      </ul>
      <p className="text-muted-foreground text-xs">
        <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> move ·{' '}
        <kbd className="font-mono">Enter</kbd> toggle · <kbd className="font-mono">g g</kbd> top ·{' '}
        <kbd className="font-mono">mod+k</kbd> filter · <kbd className="font-mono">Esc</kbd> leave
        the filter. While typing in the filter, <kbd className="font-mono">j</kbd>/
        <kbd className="font-mono">k</kbd> just type — the editable-target guard is on by default.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/routes/use-keyboard.mdx`**

(Hooks group orders today: color-scheme 10, use-clipboard 20, use-debounce 23, use-autocomplete 25, action-registry 30 → this takes 27.)

```mdx
---
title: useKeyboard
group: Hooks
order: 27
blurb: Local keyboard bindings — chords, sequences, and an editable-target guard.
description: >-
  Registry-free keyboard bindings for one component: map shortcut strings
  ("mod+k", "?", "g i") to handlers. The same battle-tested engine as the
  keyboard-shortcuts drop-in — chords, multi-key sequences, platform mod
  resolution — without the registry, scopes, or cheatsheet.
dropInPath: src/hooks/use-keyboard
---

import { KeyboardDemo } from '~/components/demos/use-keyboard';
import keyboardSrc from '~/components/demos/use-keyboard.tsx?shiki';

<DemoCard
  title="Task list with local bindings"
  description="j/k move the selection, Enter toggles done, g g jumps to the top, mod+k focuses the filter. While you're typing in the filter, j/k don't move the selection — the editable-target guard is on by default; Escape (bound with allowInInput) blurs back out."
  source={keyboardSrc}
  render={<KeyboardDemo />}
/>
```

- [ ] **Step 3: Add the root `README.md` catalog entry**

Insert between the `use-autocomplete` and `action-registry` bullets:

```markdown
- **[use-keyboard](src/hooks/use-keyboard/README.md)** — drop-in local
  keyboard bindings: map shortcut strings (`mod+k`, `?`, `g i`) to handlers
  for one component's lifetime. Chords, multi-key sequences, platform `mod`
  resolution, and an editable-target guard — the same engine that powers
  keyboard-shortcuts, without the registry/scopes/cheatsheet. No runtime
  dependencies.
```

- [ ] **Step 4: Verify the site builds and the page renders**

Run from repo root: `pnpm build`
Expected: build succeeds (the MDX page is picked up by the generated route table).
Optionally `pnpm dev` and load `/use-keyboard` to try the demo by hand.

- [ ] **Step 5: Commit**

```bash
git add app/components/demos/use-keyboard.tsx app/routes/use-keyboard.mdx README.md
git commit -m "feat(app): use-keyboard demo page and catalog entry"
```

---

### Task 10: Repo-wide verification sweep

- [ ] **Step 1: Format**

Run from repo root: `pnpm run format:fix`
Expected: exits 0. If it rewrites files, eyeball the diff (it should only be formatting).

- [ ] **Step 2: Lint**

Run: `pnpm run lint`
Expected: clean. Pay attention to `react-hooks-js` findings on the new hook — `rules-of-hooks`/`exhaustive-deps` are errors in this repo. The implementation in Task 3 is written to be lint-clean (refs for live values; effect deps exactly `[target, enabled, sequenceTimeoutMs]`); if the linter disagrees, fix the code, don't suppress.

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: every drop-in's suite green, including the new `use-keyboard` package.

- [ ] **Step 4: Commit any formatting fallout**

```bash
git add -A
git commit -m "build(use-keyboard): format/lint sweep"
```

(Skip the commit if the sweep produced no changes.)
