/**
 * Verification harness for the keyboard-shortcuts drop-in. Covers:
 *
 *   - parse.ts: chord/sequence parsing, mod normalization, alternates
 *   - format.ts: mac vs PC glyphs, ordering, special-key labels
 *   - ShortcutsProvider: single chord, sequence, scope, allowInInput,
 *     enabled(), preventDefault, key-repeat, sequence timeout, mid-sequence
 *     bail-out
 *   - ShortcutCheatsheet: groups by Action.group, shows alternates, opens
 *     via ? and via controlled `open` prop
 */

import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import {
  ActionsProvider,
  useAction,
  useActions,
} from "../../hooks/action-registry/actions";
import {
  ShortcutCheatsheet,
  ShortcutsProvider,
  useShortcutScope,
} from "./keyboard-shortcuts";
import {
  chordMatches,
  isMacLike,
  parseShortcut,
  parseSequence,
} from "./parse";
import { formatChord, formatShortcut } from "./format";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function dispatchKey(opts: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  target?: HTMLElement;
}) {
  const target = opts.target ?? document.body;
  // fireEvent.keyDown lets us provide native KeyboardEvent fields, including
  // `repeat` which userEvent doesn't expose directly.
  fireEvent.keyDown(target, {
    key: opts.key,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    repeat: opts.repeat ?? false,
  });
}

function Register({
  id,
  shortcut,
  onRun,
  group,
  label = id,
  scope,
  enabled,
  allowInInput,
}: {
  id: string;
  shortcut?: string | string[];
  onRun: (e?: KeyboardEvent) => void;
  group?: string;
  label?: string;
  scope?: string;
  enabled?: () => boolean;
  allowInInput?: boolean;
}) {
  useAction({
    id,
    label,
    group,
    shortcut,
    scope,
    enabled,
    allowInInput,
    run: ({ event }) => onRun(event),
  });
  return null;
}

/* -------------------------------------------------------------------------- */
/*  parse.ts                                                                  */
/* -------------------------------------------------------------------------- */

describe("parseSequence", () => {
  it("parses a single chord with mod = meta on mac", () => {
    expect(parseSequence("mod+k", true)).toEqual([
      { ctrl: false, meta: true, alt: false, shift: false, key: "k" },
    ]);
  });

  it("parses a single chord with mod = ctrl on non-mac", () => {
    expect(parseSequence("mod+k", false)).toEqual([
      { ctrl: true, meta: false, alt: false, shift: false, key: "k" },
    ]);
  });

  it("parses a multi-chord sequence", () => {
    expect(parseSequence("g i", false)).toEqual([
      { ctrl: false, meta: false, alt: false, shift: false, key: "g" },
      { ctrl: false, meta: false, alt: false, shift: false, key: "i" },
    ]);
  });

  it("normalizes alt/option, ctrl/control, cmd/meta", () => {
    expect(parseSequence("option+x", false)[0].alt).toBe(true);
    expect(parseSequence("control+x", false)[0].ctrl).toBe(true);
    expect(parseSequence("cmd+x", false)[0].meta).toBe(true);
    expect(parseSequence("command+x", false)[0].meta).toBe(true);
  });

  it("normalizes special-key aliases", () => {
    expect(parseSequence("esc", false)[0].key).toBe("escape");
    expect(parseSequence("space", false)[0].key).toBe(" ");
    expect(parseSequence("up", false)[0].key).toBe("arrowup");
  });

  it("throws on empty input", () => {
    expect(() => parseSequence("", false)).toThrow();
  });

  it("throws on unknown modifier", () => {
    expect(() => parseSequence("hyperdrive+k", false)).toThrow();
  });
});

describe("parseShortcut", () => {
  it("accepts a single string", () => {
    expect(parseShortcut("mod+k", false)).toHaveLength(1);
  });

  it("accepts an array of alternates", () => {
    const parsed = parseShortcut(["mod+s", "ctrl+s"], true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0][0].meta).toBe(true); // mod → meta on mac
    expect(parsed[1][0].ctrl).toBe(true); // explicit ctrl
  });
});

describe("chordMatches", () => {
  it("requires exact modifier match (no shift creep)", () => {
    const chord = parseSequence("mod+k", true)[0];
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    expect(chordMatches(chord, ev)).toBe(true);
    const evShift = new KeyboardEvent("keydown", {
      key: "K",
      metaKey: true,
      shiftKey: true,
    });
    expect(chordMatches(chord, evShift)).toBe(false);
  });

  it("allows shift-produced punctuation to match without explicit shift+", () => {
    // "?" requires Shift on US keyboards; the browser delivers
    // {key: "?", shiftKey: true}. Author writes the chord as "?", not
    // "shift+?", and we should still match.
    const chord = parseSequence("?", false)[0];
    const ev = new KeyboardEvent("keydown", { key: "?", shiftKey: true });
    expect(chordMatches(chord, ev)).toBe(true);
  });

  it("rejects uppercase-letter mismatches even when shift is held", () => {
    // Bare "k" must not match Shift+K — otherwise selecting `mod+k`
    // would also catch `mod+shift+k` and so on.
    const chord = parseSequence("k", false)[0];
    const ev = new KeyboardEvent("keydown", { key: "K", shiftKey: true });
    expect(chordMatches(chord, ev)).toBe(false);
  });

  it("matches case-insensitively on the key value", () => {
    const chord = parseSequence("k", false)[0];
    const ev = new KeyboardEvent("keydown", { key: "k" });
    expect(chordMatches(chord, ev)).toBe(true);
    const evShift = new KeyboardEvent("keydown", { key: "K", shiftKey: true });
    // A bare `k` chord has shift=false, so a shift-held event must not
    // match — otherwise `?` (shift+/) and `/` would collide.
    expect(chordMatches(chord, evShift)).toBe(false);
  });
});

describe("isMacLike", () => {
  it("returns a boolean without crashing", () => {
    expect(typeof isMacLike()).toBe("boolean");
  });
});

/* -------------------------------------------------------------------------- */
/*  format.ts                                                                 */
/* -------------------------------------------------------------------------- */

describe("formatChord", () => {
  it("renders ⌘ on mac and Ctrl on non-mac for `mod`", () => {
    const chord = parseSequence("mod+k", true)[0];
    const macFmt = formatChord(chord, true);
    expect(macFmt.caps.map((c) => c.label)).toEqual(["⌘", "K"]);

    const chordPc = parseSequence("mod+k", false)[0];
    const pcFmt = formatChord(chordPc, false);
    expect(pcFmt.caps.map((c) => c.label)).toEqual(["Ctrl", "K"]);
  });

  it("orders modifiers ctrl, alt, shift, meta", () => {
    const chord = parseSequence("shift+meta+alt+ctrl+x", true)[0];
    const labels = formatChord(chord, true).caps.map((c) => c.label);
    expect(labels).toEqual(["⌃", "⌥", "⇧", "⌘", "X"]);
  });

  it("uses pretty labels for special keys", () => {
    expect(formatChord(parseSequence("escape", true)[0], true).caps[0].label).toBe(
      "Esc",
    );
    expect(formatChord(parseSequence("up", false)[0], false).caps[0].label).toBe(
      "↑",
    );
  });
});

describe("formatShortcut", () => {
  it("returns one formatted sequence per alternate", () => {
    const fmt = formatShortcut(["mod+s", "ctrl+s"], true);
    expect(fmt.sequences).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  ShortcutsProvider                                                         */
/* -------------------------------------------------------------------------- */

describe("ShortcutsProvider — single chord", () => {
  it("fires the action for mod+k and prevents default", async () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="palette" shortcut="mod+k" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );

    // The action-registry registers via useEffect, which Testing Library
    // flushes during render, so we're safe to dispatch immediately.
    const ev = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(ev);
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("respects array-of-alternates", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={true}>
          <Register id="save" shortcut={["mod+s", "ctrl+s"]} onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "s", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
    dispatchKey({ key: "s", metaKey: true });
    expect(onRun).toHaveBeenCalledTimes(2);
  });

  it("ignores key-repeat events", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="palette" shortcut="mod+k" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "k", ctrlKey: true });
    dispatchKey({ key: "k", ctrlKey: true, repeat: true });
    dispatchKey({ key: "k", ctrlKey: true, repeat: true });
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("does not fire when typing in an input — unless allowInInput", async () => {
    const guarded = vi.fn();
    const allowed = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="open" shortcut="?" onRun={guarded} />
          <Register
            id="palette"
            shortcut="mod+k"
            onRun={allowed}
            allowInInput
          />
          <input data-testid="text" />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    const input = screen.getByTestId("text") as HTMLInputElement;
    input.focus();

    dispatchKey({ key: "?", shiftKey: true, target: input });
    expect(guarded).not.toHaveBeenCalled();

    dispatchKey({ key: "k", ctrlKey: true, target: input });
    expect(allowed).toHaveBeenCalledTimes(1);
  });

  it("respects enabled() — disabled actions don't fire", () => {
    const onRun = vi.fn();
    let allow = false;
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register
            id="save"
            shortcut="mod+s"
            onRun={onRun}
            enabled={() => allow}
          />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "s", ctrlKey: true });
    expect(onRun).not.toHaveBeenCalled();
    allow = true;
    dispatchKey({ key: "s", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("does not preventDefault on unmatched keystrokes", () => {
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false} />
      </ActionsProvider>,
    );
    const ev = new KeyboardEvent("keydown", { key: "x", cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe("ShortcutsProvider — sequences", () => {
  it("fires after both chords of a `g i` sequence", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="goto-inbox" shortcut="g i" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "g" });
    expect(onRun).not.toHaveBeenCalled();
    dispatchKey({ key: "i" });
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("claims the first chord of a sequence (preventDefault)", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="goto-inbox" shortcut="g i" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    const ev = new KeyboardEvent("keydown", { key: "g", cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("does not claim the first chord when no sequence starts with it", () => {
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="goto-inbox" shortcut="g i" onRun={() => {}} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    const ev = new KeyboardEvent("keydown", { key: "x", cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("resets the sequence after the timeout", () => {
    vi.useFakeTimers();
    try {
      const onRun = vi.fn();
      render(
        <ActionsProvider>
          <ShortcutsProvider mac={false} sequenceTimeoutMs={500}>
            <Register id="goto-inbox" shortcut="g i" onRun={onRun} />
          </ShortcutsProvider>
        </ActionsProvider>,
      );
      dispatchKey({ key: "g" });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      dispatchKey({ key: "i" });
      expect(onRun).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a wrong second chord aborts the sequence without firing", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="goto-inbox" shortcut="g i" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "g" });
    dispatchKey({ key: "x" });
    expect(onRun).not.toHaveBeenCalled();
    // After the abort a fresh sequence still works.
    dispatchKey({ key: "g" });
    dispatchKey({ key: "i" });
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("modifier-only keystrokes don't reset the sequence", () => {
    const onRun = vi.fn();
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register id="goto-inbox" shortcut="g i" onRun={onRun} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    dispatchKey({ key: "g" });
    dispatchKey({ key: "Shift" });
    dispatchKey({ key: "i" });
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  Scopes                                                                    */
/* -------------------------------------------------------------------------- */

describe("useShortcutScope", () => {
  it("gates scoped actions until the scope is active", () => {
    const onRun = vi.fn();

    function ScopedShell({ active }: { active: boolean }) {
      return (
        <ActionsProvider>
          <ShortcutsProvider mac={false}>
            <Register
              id="editor.save"
              shortcut="mod+s"
              scope="editor"
              onRun={onRun}
            />
            {active ? <ScopeActivator scope="editor" /> : null}
          </ShortcutsProvider>
        </ActionsProvider>
      );
    }
    function ScopeActivator({ scope }: { scope: string }) {
      useShortcutScope(scope);
      return null;
    }

    const { rerender } = render(<ScopedShell active={false} />);
    dispatchKey({ key: "s", ctrlKey: true });
    expect(onRun).not.toHaveBeenCalled();

    rerender(<ScopedShell active={true} />);
    dispatchKey({ key: "s", ctrlKey: true });
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  ShortcutCheatsheet                                                        */
/* -------------------------------------------------------------------------- */

describe("ShortcutCheatsheet", () => {
  it("opens via ? and lists registered actions grouped by Action.group", async () => {
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <Register
            id="nav.settings"
            shortcut="mod+,"
            label="Settings"
            group="Navigation"
            onRun={() => {}}
          />
          <Register
            id="theme.toggle"
            shortcut="mod+shift+l"
            label="Toggle theme"
            group="Appearance"
            onRun={() => {}}
          />
          <ShortcutCheatsheet mac={false} />
        </ShortcutsProvider>
      </ActionsProvider>,
    );

    dispatchKey({ key: "?", shiftKey: true });

    expect(await screen.findByText("Keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    // The cheatsheet's own binding is registered under "Help" → "Show
    // keyboard shortcuts".
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
  });

  it("supports controlled open state via the open prop", async () => {
    const user = userEvent.setup();
    function Shell() {
      const [open, setOpen] = React.useState(false);
      return (
        <ActionsProvider>
          <ShortcutsProvider mac={false}>
            <button onClick={() => setOpen(true)}>Open</button>
            <ShortcutCheatsheet
              mac={false}
              open={open}
              onOpenChange={setOpen}
            />
          </ShortcutsProvider>
        </ActionsProvider>
      );
    }
    render(<Shell />);

    expect(screen.queryByText("Keyboard shortcuts")).not.toBeInTheDocument();
    await user.click(screen.getByText("Open"));
    expect(await screen.findByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  it("does not self-register a binding when shortcut={false}", () => {
    function Probe() {
      const { getById } = useActions();
      return (
        <span data-testid="cs">
          {String(!!getById("system.cheatsheet"))}
        </span>
      );
    }
    render(
      <ActionsProvider>
        <ShortcutsProvider mac={false}>
          <ShortcutCheatsheet mac={false} shortcut={false} />
          <Probe />
        </ShortcutsProvider>
      </ActionsProvider>,
    );
    expect(screen.getByTestId("cs")).toHaveTextContent("false");
  });
});
