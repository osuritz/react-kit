/**
 * Tiny, self-contained shortcut formatter for the palette's row glyphs.
 *
 * The keyboard-shortcuts drop-in has a richer parser/formatter (sequences,
 * alternates, scopes, the works). The palette only needs to *display* a
 * shortcut next to a row, so we ship a small subset here so this drop-in
 * stays self-contained — copy this folder without dragging the shortcuts
 * package along. Apps using both can swap `formatShortcutCaps` for
 * `formatShortcut` from keyboard-shortcuts; the row markup is identical.
 *
 * Pure: no React, no DOM events. The platform check (`isMacLike`) is
 * lazily evaluated and overridable so tests can pin a platform.
 */

const MAC_GLYPHS: Record<string, string> = {
  ctrl: "⌃",
  control: "⌃",
  meta: "⌘",
  cmd: "⌘",
  command: "⌘",
  super: "⌘",
  win: "⌘",
  alt: "⌥",
  option: "⌥",
  opt: "⌥",
  shift: "⇧",
};

const PC_LABELS: Record<string, string> = {
  ctrl: "Ctrl",
  control: "Ctrl",
  meta: "Win",
  cmd: "Win",
  command: "Win",
  super: "Win",
  win: "Win",
  alt: "Alt",
  option: "Alt",
  opt: "Alt",
  shift: "Shift",
};

const SPECIAL_MAC: Record<string, string> = {
  enter: "↵",
  return: "↵",
  escape: "Esc",
  esc: "Esc",
  arrowup: "↑",
  up: "↑",
  arrowdown: "↓",
  down: "↓",
  arrowleft: "←",
  left: "←",
  arrowright: "→",
  right: "→",
  backspace: "⌫",
  delete: "⌦",
  del: "⌦",
  tab: "⇥",
  space: "Space",
};

const SPECIAL_PC: Record<string, string> = {
  enter: "Enter",
  return: "Enter",
  escape: "Esc",
  esc: "Esc",
  arrowup: "↑",
  up: "↑",
  arrowdown: "↓",
  down: "↓",
  arrowleft: "←",
  left: "←",
  arrowright: "→",
  right: "→",
  backspace: "Backspace",
  delete: "Del",
  del: "Del",
  tab: "Tab",
  space: "Space",
};

const MODIFIER_NAMES = new Set([
  "mod",
  "ctrl",
  "control",
  "meta",
  "cmd",
  "command",
  "super",
  "win",
  "alt",
  "option",
  "opt",
  "shift",
]);

export function isMacLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    "";
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

export interface KeyCap {
  /** Visible glyph or word. */
  label: string;
  /** Stable identifier for React `key={}`. */
  id: string;
}

/**
 * Format a single chord (`"mod+k"`, `"shift+/"`) into ordered key caps.
 * Modifier order is normalized to `ctrl, alt, shift, meta` so that
 * `"shift+mod+k"` and `"mod+shift+k"` render identically.
 */
export function formatChord(chord: string, mac = isMacLike()): KeyCap[] {
  const parts = chord
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return [];

  const mods = { ctrl: false, alt: false, shift: false, meta: false };
  let keyPart = "";

  for (const raw of parts) {
    const lower = raw.toLowerCase();
    if (lower === "mod") {
      if (mac) mods.meta = true;
      else mods.ctrl = true;
      continue;
    }
    if (MODIFIER_NAMES.has(lower)) {
      if (lower === "ctrl" || lower === "control") mods.ctrl = true;
      else if (lower === "alt" || lower === "option" || lower === "opt") mods.alt = true;
      else if (lower === "shift") mods.shift = true;
      else mods.meta = true; // meta/cmd/command/super/win
      continue;
    }
    keyPart = lower;
  }

  const caps: KeyCap[] = [];
  const order: Array<keyof typeof mods> = ["ctrl", "alt", "shift", "meta"];
  for (const role of order) {
    if (!mods[role]) continue;
    const label = mac ? MAC_GLYPHS[role] : PC_LABELS[role];
    caps.push({ id: `mod:${role}`, label });
  }
  if (keyPart) {
    const specials = mac ? SPECIAL_MAC : SPECIAL_PC;
    const label =
      specials[keyPart] ??
      (keyPart.length === 1
        ? keyPart.toUpperCase()
        : keyPart.charAt(0).toUpperCase() + keyPart.slice(1));
    caps.push({ id: `key:${keyPart}`, label });
  }
  return caps;
}

/**
 * Resolve a shortcut value (string, array, or sequence) into a flat list of
 * chord-cap groups for inline display. We collapse alternates by taking the
 * first variant (the palette only has horizontal room for one spelling) and
 * we render sequences chord-by-chord with no "then" separator — the row UI
 * is a glance, not the cheatsheet. Apps that need richer rendering should
 * import `formatShortcut` from keyboard-shortcuts instead.
 */
export function formatShortcutCaps(
  shortcut: string | string[],
  mac = isMacLike(),
): KeyCap[][] {
  const first = Array.isArray(shortcut) ? shortcut[0] : shortcut;
  if (!first) return [];
  // Sequences are whitespace-separated chords ("g i").
  const chords = first.split(/\s+/).filter((c) => c.length > 0);
  return chords.map((c) => formatChord(c, mac));
}
