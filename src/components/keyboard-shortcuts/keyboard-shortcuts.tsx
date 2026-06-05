// Peer requirements: react >=18, react-dom >=18, @base-ui/react >=1.4,
// clsx >=2, tailwind-merge >=2. Tailwind v4 + the standard shadcn theme
// tokens (`bg-popover`, `text-popover-foreground`, `border-input`, ...)
// are expected at the host-app level — see `index.css` in the demo or
// the shadcn `tailwind.css` import.
//
// The drop-in is a pure consumer of the action-registry drop-in (sibling
// folder `src/hooks/action-registry/`). It does not redefine the `Action`
// contract.

import * as React from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { type Action, useActions } from '../../hooks/action-registry/actions';
import {
  type Chord,
  type ParsedShortcut,
  chordMatches,
  isMacLike,
  isModifierOnly,
  parseShortcut,
} from './parse';
import { formatShortcut, type FormattedSequence } from './format';
import { cn } from './lib/cn';

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export interface ShortcutsProviderProps {
  children?: React.ReactNode;
  /**
   * The DOM target the global key listener attaches to. Defaults to
   * `document` so events from inside React/Radix/Base-UI portals are still
   * caught (portals are still part of the document). Pass a specific element
   * to scope the listener — e.g. an iframe's `document`, or a focusable
   * shell `<div tabIndex={-1}>` if you want shortcuts gated by focus.
   */
  target?: Document | HTMLElement;
  /**
   * How long (ms) to wait for the next chord in a multi-key sequence before
   * resetting the buffer. Defaults to `1000`. Set to `0` to disable
   * sequences entirely (multi-chord bindings become inert; single chords
   * are unaffected).
   */
  sequenceTimeoutMs?: number;
  /**
   * Override the platform detection used for `mod` resolution and cheatsheet
   * glyphs. Mostly useful for tests — leave undefined in production.
   */
  mac?: boolean;
}

export interface ShortcutCheatsheetProps {
  /**
   * Shortcut that toggles the cheatsheet open. Defaults to `"?"`. Pass
   * `false` to disable the binding entirely (you'll then need to drive
   * `open` yourself).
   */
  shortcut?: string | string[] | false;
  /** Heading shown at the top of the dialog. Defaults to "Keyboard shortcuts". */
  title?: React.ReactNode;
  /** Optional sub-heading rendered under the title. */
  description?: React.ReactNode;
  /** Controlled open state. If omitted, the dialog manages its own state. */
  open?: boolean;
  /** Controlled-state change handler. */
  onOpenChange?: (open: boolean) => void;
  /** Caller class for the dialog `Popup`. Merged with `tailwind-merge`. */
  className?: string;
  /**
   * Override platform detection for the displayed glyphs. Mostly for tests.
   */
  mac?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Scope context                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Scopes are designed in but only the implicit "global" scope is wired up
 * for v1. An action whose `scope` is `undefined` (or matches a value
 * present in the active set) is bound; everything else is ignored.
 *
 * `useShortcutScope("editor")` activates the named scope for the lifetime
 * of the calling component. Multiple components can activate the same scope
 * — it's reference-counted, so a scope stays active until the last consumer
 * unmounts. Apps that don't use scopes can ignore this entirely.
 */
interface ScopeStore {
  isActive: (scope: string | undefined) => boolean;
  activate: (scope: string) => () => void;
}

const ScopesContext = React.createContext<ScopeStore | null>(null);
ScopesContext.displayName = 'ShortcutScopesContext';

function createScopeStore(): ScopeStore {
  // Reference-counted set: a scope is active while ≥1 consumer holds it.
  // The matcher reads `isActive` lazily on each keystroke (via a ref), so no
  // subscriber plumbing is needed — flipping a scope active takes effect on
  // the very next keypress.
  const counts = new Map<string, number>();
  return {
    isActive: (scope) => {
      if (scope === undefined || scope === '' || scope === 'global') return true;
      return (counts.get(scope) ?? 0) > 0;
    },
    activate: (scope) => {
      counts.set(scope, (counts.get(scope) ?? 0) + 1);
      return () => {
        const n = (counts.get(scope) ?? 0) - 1;
        if (n <= 0) counts.delete(scope);
        else counts.set(scope, n);
      };
    },
  };
}

/**
 * Activate a named shortcut scope for the lifetime of the calling component.
 * Actions registered with `scope: "<name>"` only fire while at least one
 * consumer is keeping that scope active. Multiple activations stack, so a
 * route + a modal both calling `useShortcutScope("editor")` is fine.
 *
 * v1 is intentionally minimal — no exclusive scopes, no priority. The hook
 * exists so apps can start tagging actions today and the wiring expands
 * without an API break.
 */
export function useShortcutScope(scope: string | undefined): void {
  const store = React.useContext(ScopesContext);
  React.useEffect(() => {
    if (!scope || scope === 'global' || !store) return;
    return store.activate(scope);
  }, [scope, store]);
}

/* -------------------------------------------------------------------------- */
/*  Default-target detection                                                  */
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
/*  ShortcutsProvider                                                         */
/* -------------------------------------------------------------------------- */

interface BoundAction {
  action: Action;
  parsed: ParsedShortcut;
}

/**
 * Compute the list of actions that have a `shortcut` field, parsed once per
 * subscribe-tick. We intentionally do not memoize across the registry's
 * field-level updates — see action-registry's "Subscriber semantics"
 * section: live getters mean fields read fresh, but `subscribe` only fires
 * on add/remove or `id` change. Re-parsing on every render of the provider
 * is fine; parsing is cheap, the list is small, and we'd rather avoid
 * subtle staleness than save a few microseconds.
 */
function collectBindings(actions: Action[], mac: boolean): BoundAction[] {
  const out: BoundAction[] = [];
  for (const action of actions) {
    const sc = action.shortcut;
    if (sc === undefined || sc === '' || (Array.isArray(sc) && sc.length === 0)) {
      continue;
    }
    try {
      out.push({ action, parsed: parseShortcut(sc, mac) });
    } catch (err) {
      // Bad shortcut strings are author bugs — surface them in dev without
      // blowing up production. The action stays in the registry, just
      // unbound.
      if (typeof console !== 'undefined') {
        console.warn(
          `keyboard-shortcuts: failed to parse shortcut for action "${action.id}": ${(err as Error).message}`
        );
      }
    }
  }
  return out;
}

export function ShortcutsProvider({
  children,
  target,
  sequenceTimeoutMs = 1000,
  mac,
}: ShortcutsProviderProps) {
  const { getAll, subscribe } = useActions();
  const macResolved = mac ?? isMacLike();

  // Subscribe to the registry so we re-render (and recompute bindings)
  // whenever an action is added or removed. Field-level updates flow
  // through the live getters — no extra plumbing needed.
  const actions = React.useSyncExternalStore(subscribe, getAll, getAll);
  const bindings = React.useMemo(
    () => collectBindings(actions, macResolved),
    [actions, macResolved]
  );

  const scopeStore = React.useMemo(() => createScopeStore(), []);

  // Mutable per-listener state — kept in refs so the listener doesn't
  // re-attach when `bindings` changes (the ref read picks the new list up
  // immediately, with no event being missed).
  const bindingsRef = React.useRef(bindings);
  React.useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);
  const scopeRef = React.useRef(scopeStore);

  // In-progress sequence buffer.
  const cursorRef = React.useRef<{
    /** Bindings still in the running for the current sequence. */
    candidates: Array<{ action: Action; remaining: Chord[] }>;
    /** Timer that resets the cursor after sequenceTimeoutMs of silence. */
    timer: ReturnType<typeof setTimeout> | null;
  }>({ candidates: [], timer: null });

  React.useEffect(() => {
    const targetEl: EventTarget = target ?? (typeof document !== 'undefined' ? document : window);

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

    const handler = (raw: Event) => {
      const event = raw as KeyboardEvent;
      // Skip auto-repeats. Holding `mod+s` should fire once, and it
      // definitely shouldn't advance a `g i` sequence on every repeat tick.
      if (event.repeat) return;
      // Pressing Shift on its own shouldn't reset an in-progress `g i`.
      if (isModifierOnly(event)) return;

      const editable = isEditableTarget(event.target);
      const cursor = cursorRef.current;
      const startingFresh = cursor.candidates.length === 0;

      // Build the candidate list for this keystroke. When starting fresh we
      // walk every binding's sequences; when continuing we filter the prior
      // candidate set.
      const next: Array<{ action: Action; remaining: Chord[] }> = [];

      const tryConsume = (action: Action, seq: Chord[]) => {
        const head = seq[0];
        if (!head) return;
        if (!chordMatches(head, event)) return;
        // Defer enabled() / scope checks until we're ready to fire so a
        // disabled action still consumes a sequence step (otherwise a
        // partially-typed sequence with one disabled binding could leak
        // through). Practically we filter scope/enabled before *firing*,
        // not before *matching*, but to keep things predictable we filter
        // when seeding the candidates from the full registry too.
        next.push({ action, remaining: seq.slice(1) });
      };

      if (startingFresh) {
        for (const b of bindingsRef.current) {
          // Pre-filter at sequence start: actions whose scope is inactive
          // or that are disabled never seed the cursor. This avoids
          // "consumed sequence then nothing fired" mystery dead-ends.
          if (!scopeRef.current.isActive(b.action.scope)) continue;
          if (b.action.enabled && !b.action.enabled()) continue;
          // Editable check applied per-action: actions that haven't opted
          // in are skipped when typing.
          if (editable && !b.action.allowInInput) continue;
          for (const seq of b.parsed) {
            // `sequenceTimeoutMs <= 0` disables sequences: multi-chord
            // bindings never seed the cursor (a claimed-then-dropped first
            // chord would be worse than an inert binding).
            if (seq.length > 1 && sequenceTimeoutMs <= 0) continue;
            tryConsume(b.action, seq);
          }
        }
      } else {
        for (const cand of cursor.candidates) {
          if (!scopeRef.current.isActive(cand.action.scope)) continue;
          if (cand.action.enabled && !cand.action.enabled()) continue;
          if (editable && !cand.action.allowInInput) continue;
          tryConsume(cand.action, cand.remaining);
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
        // keystroke — the spec point in the brief.
        event.preventDefault();
        resetCursor();
        try {
          const result = completed.action.run({ event, source: 'shortcut' });
          if (result instanceof Promise) {
            result.catch((err) => {
              if (typeof console !== 'undefined') {
                console.error(`keyboard-shortcuts: action "${completed.action.id}" failed:`, err);
              }
            });
          }
        } catch (err) {
          if (typeof console !== 'undefined') {
            console.error(`keyboard-shortcuts: action "${completed.action.id}" threw:`, err);
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

    // We attach in the bubble phase so input-level handlers (form submit,
    // contenteditable IME composition, etc.) see the event first. The
    // editable check stops us from claiming keystrokes that belong to
    // those handlers.
    targetEl.addEventListener('keydown', handler as EventListener);
    return () => {
      targetEl.removeEventListener('keydown', handler as EventListener);
      resetCursor();
    };
  }, [target, sequenceTimeoutMs]);

  return <ScopesContext.Provider value={scopeStore}>{children}</ScopesContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/*  ShortcutCheatsheet                                                        */
/* -------------------------------------------------------------------------- */

interface CheatsheetGroup {
  name: string;
  rows: Array<{
    action: Action;
    sequences: FormattedSequence[];
  }>;
}

const DEFAULT_GROUP_NAME = 'Other';

function groupActionsForCheatsheet(actions: Action[], mac: boolean): CheatsheetGroup[] {
  const groups = new Map<string, CheatsheetGroup>();
  for (const action of actions) {
    if (!action.shortcut) continue;
    const groupName = action.group ?? DEFAULT_GROUP_NAME;
    let group = groups.get(groupName);
    if (!group) {
      group = { name: groupName, rows: [] };
      groups.set(groupName, group);
    }
    let formatted: FormattedSequence[];
    try {
      formatted = formatShortcut(action.shortcut, mac).sequences;
    } catch {
      // Don't render rows we couldn't parse — the parser already warned.
      continue;
    }
    group.rows.push({ action, sequences: formatted });
  }
  // Stable order: actions sorted by label within each group, groups sorted
  // by name with the "Other" bucket pinned last.
  for (const group of groups.values()) {
    group.rows.sort((a, b) => a.action.label.localeCompare(b.action.label));
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.name === DEFAULT_GROUP_NAME) return 1;
    if (b.name === DEFAULT_GROUP_NAME) return -1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Visible drop-in: a shadcn-styled dialog that lists every registered
 * action with a shortcut, grouped by `Action.group`, with platform-correct
 * key glyphs. Self-managed open state by default; pass `open`+`onOpenChange`
 * to drive it from outside.
 *
 * The cheatsheet registers its own `system.cheatsheet` action with the
 * given `shortcut` (default `"?"`) so it shows up in its own listing —
 * delete or override that action by passing `shortcut={false}` and
 * registering your own.
 */
export function ShortcutCheatsheet({
  shortcut = '?',
  title = 'Keyboard shortcuts',
  description,
  open: controlledOpen,
  onOpenChange,
  className,
  mac,
}: ShortcutCheatsheetProps) {
  const macResolved = mac ?? isMacLike();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const toggle = React.useCallback(() => setOpen(!open), [open, setOpen]);

  // Register a `system.cheatsheet` action so the cheatsheet's own binding
  // shows up in the cheatsheet — and so it picks up scopes / enabled
  // semantics like everything else. Skipped when `shortcut` is `false`.
  useShortcutSelfRegister({
    enabled: shortcut !== false,
    shortcut: shortcut === false ? undefined : shortcut,
    run: toggle,
  });

  const { getAll, subscribe } = useActions();
  const actions = React.useSyncExternalStore(subscribe, getAll, getAll);
  const groups = React.useMemo(
    () => groupActionsForCheatsheet(actions, macResolved),
    [actions, macResolved]
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            'transition-opacity duration-150'
          )}
        />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
            'outline-none',
            'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
            'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
            'transition-all duration-150',
            className
          )}
        >
          <header className="border-b border-border px-5 py-4">
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </Dialog.Description>
            ) : null}
          </header>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shortcuts registered.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {groups.map((group) => (
                  <section key={group.name} className="flex flex-col gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.name}
                    </h3>
                    <ul className="flex flex-col gap-1">
                      {group.rows.map(({ action, sequences }) => {
                        const disabled = action.enabled?.() === false;
                        return (
                          <li
                            key={action.id}
                            aria-disabled={disabled || undefined}
                            className={cn(
                              'flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-muted/40',
                              disabled && 'opacity-50'
                            )}
                          >
                            <span className="truncate text-sm">{action.label}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {sequences.map((seq, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 ? (
                                    <span className="text-xs text-muted-foreground">or</span>
                                  ) : null}
                                  <SequenceCaps sequence={seq} />
                                </React.Fragment>
                              ))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
          <footer className="flex items-center justify-end border-t border-border px-5 py-3">
            <Dialog.Close
              className={cn(
                'inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium',
                'shadow-xs transition-colors hover:bg-muted hover:text-foreground',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
              )}
            >
              Close
            </Dialog.Close>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SequenceCaps({ sequence }: { sequence: FormattedSequence }) {
  return (
    <span className="flex items-center gap-1">
      {sequence.chords.map((chord, ci) => (
        <React.Fragment key={ci}>
          {ci > 0 ? <span className="text-[10px] text-muted-foreground">then</span> : null}
          <span className="flex items-center gap-0.5">
            {chord.caps.map((cap) => (
              <kbd
                key={cap.id}
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5',
                  'font-mono text-[10px] font-medium text-foreground shadow-xs'
                )}
              >
                {cap.label}
              </kbd>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Internal helper: register a `system.cheatsheet` action that toggles the
 * dialog. Pulled out from the component so we can disable it cleanly when
 * `shortcut === false` (an unconditional `useAction` would still register
 * an entry with no shortcut, polluting the cheatsheet).
 */
function useShortcutSelfRegister({
  enabled,
  shortcut,
  run,
}: {
  enabled: boolean;
  shortcut: string | string[] | undefined;
  run: () => void;
}) {
  const { register } = useActions();
  // Run is captured by ref so the registered Action object stays stable —
  // we want one register call per (enabled, shortcut) tuple, not one per
  // render.
  const runRef = React.useRef(run);

  React.useEffect(() => {
    runRef.current = run;
  }, [run]);

  React.useEffect(() => {
    if (!enabled || shortcut === undefined) return;
    return register({
      id: 'system.cheatsheet',
      label: 'Show keyboard shortcuts',
      group: 'Help',
      shortcut,
      run: () => runRef.current(),
    });
  }, [enabled, shortcut, register]);
}

/* -------------------------------------------------------------------------- */
/*  Re-exports                                                                */
/* -------------------------------------------------------------------------- */

export { formatShortcut } from './format';
export type { FormattedShortcut, FormattedSequence, FormattedChord, KeyCap } from './format';
export { isMacLike, parseShortcut } from './parse';
export type { Chord, Sequence, ParsedShortcut } from './parse';
