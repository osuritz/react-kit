/**
 * Display-formatting helpers for the cheatsheet — turns parsed chords into
 * platform-correct visible glyphs (⌘ on macOS, `Ctrl` elsewhere). Pure: no
 * React, no DOM. The cheatsheet imports `formatShortcut` to render rows;
 * apps building their own UI can import the same function for consistency.
 */

import type { Chord, Sequence } from './parse';
import { isMacLike, parseShortcut } from './parse';

/** Glyph table for macOS (the canonical Apple-style HIG glyphs). */
const MAC_MODIFIER_GLYPHS = {
  ctrl: '⌃',
  meta: '⌘',
  alt: '⌥',
  shift: '⇧',
} as const;

/** Word-form modifier labels for non-macOS platforms. */
const PC_MODIFIER_LABELS = {
  ctrl: 'Ctrl',
  meta: 'Win',
  alt: 'Alt',
  shift: 'Shift',
} as const;

/** Pretty labels for special keys, both platforms. */
const SPECIAL_KEY_LABELS_MAC: Record<string, string> = {
  enter: '↵',
  escape: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  ' ': 'Space',
};

const SPECIAL_KEY_LABELS_PC: Record<string, string> = {
  enter: 'Enter',
  escape: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  backspace: 'Backspace',
  delete: 'Del',
  tab: 'Tab',
  ' ': 'Space',
};

/** A single key-cap label, e.g. `"⌘"`, `"K"`, `"Esc"`. */
export interface KeyCap {
  /** Visible text/glyph for the cap. */
  label: string;
  /** Stable identifier for React `key={}`. Combination of role + value. */
  id: string;
}

/** A formatted chord — the modifier caps plus the final key cap. */
export interface FormattedChord {
  caps: KeyCap[];
}

/** A formatted sequence — one or more `FormattedChord`s. */
export interface FormattedSequence {
  chords: FormattedChord[];
}

/** A formatted alternates list — what `parseShortcut` returns, formatted. */
export interface FormattedShortcut {
  sequences: FormattedSequence[];
}

function formatKey(key: string, mac: boolean): string {
  const labels = mac ? SPECIAL_KEY_LABELS_MAC : SPECIAL_KEY_LABELS_PC;
  if (labels[key] !== undefined) return labels[key];
  // Single-character keys: uppercase for display ("k" → "K"). Multi-char
  // unknown keys (e.g. "f1", "home") get title-case for readability.
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Format one chord. Modifiers come in canonical order: ctrl, alt, shift, meta. */
export function formatChord(chord: Chord, mac = isMacLike()): FormattedChord {
  const caps: KeyCap[] = [];
  // On Mac the Apple-canonical order is ⌃⌥⇧⌘. On Windows/Linux the common
  // order is Ctrl + Alt + Shift + Win. Both reduce to "ctrl, alt, shift,
  // meta" when expressed by role.
  const order: Array<keyof typeof MAC_MODIFIER_GLYPHS> = ['ctrl', 'alt', 'shift', 'meta'];
  for (const role of order) {
    if (!chord[role]) continue;
    const label = mac ? MAC_MODIFIER_GLYPHS[role] : PC_MODIFIER_LABELS[role];
    caps.push({ id: `mod:${role}`, label });
  }
  caps.push({ id: `key:${chord.key}`, label: formatKey(chord.key, mac) });
  return { caps };
}

/** Format one sequence (`g i` → two `FormattedChord`s). */
export function formatSequence(seq: Sequence, mac = isMacLike()): FormattedSequence {
  return { chords: seq.map((c) => formatChord(c, mac)) };
}

/**
 * Format an `Action.shortcut` value end-to-end. Convenience wrapper around
 * `parseShortcut` + `formatSequence` for the common "given a registered
 * action, render its keys" path.
 */
export function formatShortcut(shortcut: string | string[], mac = isMacLike()): FormattedShortcut {
  const parsed = parseShortcut(shortcut, mac);
  return { sequences: parsed.map((s) => formatSequence(s, mac)) };
}
