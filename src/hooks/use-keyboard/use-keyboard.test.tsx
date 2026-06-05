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
