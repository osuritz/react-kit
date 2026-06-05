import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  type Chord,
  chordMatches,
  parseSequence,
  parseShortcut,
  useKeyboard,
} from './use-keyboard';

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
    ['spacebar', ' '],
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

  it('parses a multi-modifier chord', () => {
    expect(parseSequence('mod+shift+k', true)).toEqual([chord('k', { meta: true, shift: true })]);
    expect(parseSequence('mod+shift+k', false)).toEqual([chord('k', { ctrl: true, shift: true })]);
  });

  it('throws on an empty string', () => {
    expect(() => parseSequence('', false)).toThrow(/use-keyboard:/);
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
    expect(chordMatches(chord('k'), kbd('k', { metaKey: true }))).toBe(false);
    expect(chordMatches(chord('k'), kbd('k', { altKey: true }))).toBe(false);
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
