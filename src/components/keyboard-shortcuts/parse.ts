/**
 * Pure (no React, no DOM-event) helpers for parsing shortcut strings into
 * normalized chord sequences and matching `KeyboardEvent`s against them.
 *
 * Grammar:
 *
 *   shortcut := chord ( WS chord )*       // sequence (e.g. "g i")
 *   chord    := ( modifier "+" )* key     // e.g. "mod+shift+k"
 *   modifier := "mod" | "ctrl" | "control" | "meta" | "cmd" | "command"
 *             | "super" | "win" | "alt" | "option" | "opt" | "shift"
 *   key      := single character | named key (Escape, Enter, ArrowUp, ...)
 *
 * `mod` resolves to `meta` on macOS and `ctrl` elsewhere — the canonical
 * "this is the platform's primary modifier" alias. All other modifier
 * names map literally.
 *
 * The parsed shape is intentionally tiny: a `Sequence` is `Chord[]`, a
 * `Chord` is `{ ctrl, meta, alt, shift, key }`. `key` is normalized to
 * lowercase so it matches `KeyboardEvent.key.toLowerCase()` directly.
 */

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

/** Result of parsing a `shortcut` field — one or more equivalent sequences. */
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
    throw new Error(`keyboard-shortcuts: empty chord in "${raw}"`);
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
      throw new Error(`keyboard-shortcuts: unknown modifier "${m}" in chord "${raw}"`);
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
    throw new Error('keyboard-shortcuts: empty shortcut string');
  }
  return trimmed.split(/\s+/).map((c) => parseChord(c, mac));
}

/**
 * Parse the `shortcut` field on an `Action` — accepts `string` (one
 * sequence) or `string[]` (alternates), returns the list of sequences.
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
