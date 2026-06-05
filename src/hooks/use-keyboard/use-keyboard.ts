// Peer requirements: react >=18. Nothing else — no UI library, no styling
// peers. The drop-in is a single headless hook.
//
// Local, component-lifetime keyboard bindings: "escape closes this drawer",
// "mod+enter submits", "j/k navigates this list". For an app-wide system
// with a registry, scopes, and a cheatsheet, use the keyboard-shortcuts
// drop-in instead — it runs this exact engine.

import * as React from 'react';

/* -------------------------------------------------------------------------- */
/*  Parse/match core                                                          */
/*                                                                            */
/*  Lifted verbatim from src/components/keyboard-shortcuts/parse.ts; only    */
/*  the error-message prefix differs. If you maintain both drop-ins, keep    */
/*  the copies in sync manually.                                              */
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
