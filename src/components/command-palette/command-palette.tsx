// Peer requirements: react >=18, react-dom >=18, @base-ui/react >=1.4,
// clsx >=2, tailwind-merge >=2. Tailwind v4 + the standard shadcn theme
// tokens (`bg-popover`, `text-popover-foreground`, `border-border`, ...) are
// expected at the host-app level — see `index.css` in the demo or the
// shadcn `tailwind.css` import.
//
// The drop-in is a pure consumer of the action-registry drop-in (sibling
// folder `src/hooks/action-registry/`). It does not redefine the `Action`
// contract and it does not bind shortcuts on behalf of individual actions
// — that's the keyboard-shortcuts drop-in's job. The palette only owns
// its own open-hotkey listener.

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import {
  type Action,
  useActions,
} from "../../hooks/action-registry/actions";
import { commandScore } from "./lib/command-score";
import { cn } from "./lib/cn";
import { formatShortcutCaps, isMacLike, type KeyCap } from "./format-shortcut";

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export interface CommandSource {
  /** Stable id, used for keying React lists and per-source loading state. */
  id: string;
  /** Heading shown above this source's results. Defaults to `id`. */
  heading?: string;
  /**
   * Asynchronous search. Receives the current query and an `AbortSignal`
   * that fires when the query changes (or the palette closes); honor it to
   * cancel in-flight network calls. Return `Action`-shaped rows so the
   * palette can render them with the same row layout as registered
   * actions and execute them via `Action.run`.
   */
  search: (query: string, signal: AbortSignal) => Promise<Action[]>;
}

export interface CommandPaletteProps {
  /**
   * Hotkey that toggles the palette. Defaults to `"mod+k"` (`⌘K` on macOS,
   * `Ctrl+K` elsewhere). Pass an array to bind alternates, or `false` to
   * disable the built-in hotkey entirely (useful when the consumer wants
   * to drive open state from a registered action — register an action with
   * its own shortcut and call `onOpenChange(true)` from its `run`).
   *
   * The palette deliberately does NOT register itself in the action
   * registry — its hotkey is owned here and would double-fire if the
   * keyboard-shortcuts drop-in were also bound to the same chord. Apps
   * that want the palette in their cheatsheet should register a stub
   * action whose `run` toggles `open`.
   */
  hotkey?: string | string[] | false;
  /**
   * Async sources searched in parallel as the user types, debounced. v1
   * fires sources only when the query is non-empty; sources are not used
   * for the empty-state list (recents + registered actions).
   */
  sources?: CommandSource[];
  /**
   * Debounce window for source queries (ms). Defaults to `150`. Set to
   * `0` to fire on every keystroke (mostly useful when sources are
   * cheap, e.g. an in-memory client-side index).
   */
  sourceDebounceMs?: number;
  /** Max number of recents kept in storage. Defaults to `5`. */
  maxRecents?: number;
  /**
   * `localStorage` key used to persist recent action ids. Defaults to
   * `"command-palette:recents"`. Pass `null` to disable persistence (the
   * recents list still works in-memory for the lifetime of the page).
   * Use distinct keys when an app mounts multiple palettes that should
   * not share history.
   */
  recentsStorageKey?: string | null;
  /**
   * Controlled open state. Pair with `onOpenChange`. If omitted, the
   * palette manages its own state and the hotkey toggles it.
   */
  open?: boolean;
  /** Controlled-state change handler. Always called on toggle / close. */
  onOpenChange?: (open: boolean) => void;
  /** Placeholder for the search input. Defaults to "Search…". */
  placeholder?: string;
  /** Extra classes for the dialog popup. Merged with `tailwind-merge`. */
  className?: string;
  /**
   * Override platform detection (used for `mod` resolution and shortcut
   * glyphs). Mostly useful for tests.
   */
  mac?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Hotkey binding                                                            */
/* -------------------------------------------------------------------------- */

interface ParsedChord {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

/**
 * Parse the palette's own hotkey into chord(s). Intentionally a tiny
 * subset of the keyboard-shortcuts grammar — single chords with optional
 * modifiers, no sequences. Sequences for opening a palette would feel
 * weird (`g i` to go to inbox, sure; `g k` to open the palette, no).
 */
function parseHotkey(
  hotkey: string | string[],
  mac: boolean,
): ParsedChord[] {
  const list = Array.isArray(hotkey) ? hotkey : [hotkey];
  const out: ParsedChord[] = [];
  for (const raw of list) {
    const parts = raw.split("+").map((p) => p.trim().toLowerCase()).filter(Boolean);
    const chord: ParsedChord = { ctrl: false, meta: false, alt: false, shift: false, key: "" };
    for (const p of parts) {
      if (p === "mod") {
        if (mac) chord.meta = true;
        else chord.ctrl = true;
      } else if (p === "ctrl" || p === "control") chord.ctrl = true;
      else if (p === "meta" || p === "cmd" || p === "command" || p === "super" || p === "win") chord.meta = true;
      else if (p === "alt" || p === "option" || p === "opt") chord.alt = true;
      else if (p === "shift") chord.shift = true;
      else chord.key = p;
    }
    if (chord.key) out.push(chord);
  }
  return out;
}

function chordMatches(chord: ParsedChord, event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (key !== chord.key) return false;
  if (chord.ctrl !== event.ctrlKey) return false;
  if (chord.meta !== event.metaKey) return false;
  if (chord.alt !== event.altKey) return false;
  // Lenient shift comparison for shift-produced punctuation: when the
  // chord doesn't ask for shift but the key is a non-letter, accept either
  // shiftKey state. Letters keep strict semantics so `"k"` doesn't fire on
  // Shift+K. Same rule the keyboard-shortcuts drop-in uses.
  if (chord.shift !== event.shiftKey) {
    if (chord.shift) return false;
    if (chord.key.length === 1 && /^[a-z]$/.test(chord.key)) return false;
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/*  Recents                                                                   */
/* -------------------------------------------------------------------------- */

function readRecents(key: string | null): string[] {
  if (!key) return [];
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    // Bad JSON / quota / disabled storage — silently fall back to no recents.
    return [];
  }
}

function writeRecents(key: string | null, ids: string[]): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Quota or disabled storage — recents stay in memory only.
  }
}

/* -------------------------------------------------------------------------- */
/*  Async source plumbing                                                     */
/* -------------------------------------------------------------------------- */

interface SourceState {
  /** Loading is "true" while a debounced search is pending OR in flight. */
  loading: boolean;
  /** Last successful query the results correspond to. "" means no query yet. */
  query: string;
  /** Last results returned for `query`. */
  results: Action[];
  /** Last error message, if the last fetch threw. */
  error: string | null;
}

const EMPTY_SOURCE_STATE: SourceState = {
  loading: false,
  query: "",
  results: [],
  error: null,
};

function useSourceResults(
  sources: CommandSource[],
  query: string,
  debounceMs: number,
): Record<string, SourceState> {
  const [state, setState] = React.useState<Record<string, SourceState>>({});

  // Stash sources in a ref so the effect doesn't re-run when the array
  // identity changes for unrelated reasons (a parent that rebuilds the
  // array on every render shouldn't tear down our debounce).
  const sourcesRef = React.useRef(sources);

  React.useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  React.useEffect(() => {
    if (sourcesRef.current.length === 0) return;
    // Empty query = don't fetch. Whatever's in `state` from the previous
    // query stays in memory, but the render layer hides source groups
    // entirely when `query` is empty, so it isn't user-visible. Doing
    // nothing here (instead of an in-effect setState) keeps us out of
    // react-hooks' "cascading renders" footgun.
    if (!query) return;

    // Show a loading row immediately so the user sees feedback during
    // the debounce window — otherwise typing into an empty palette
    // looks frozen until ~150ms in.
    setState((prev) => {
      const next: Record<string, SourceState> = { ...prev };
      for (const s of sourcesRef.current) {
        next[s.id] = {
          ...(prev[s.id] ?? EMPTY_SOURCE_STATE),
          loading: true,
        };
      }
      return next;
    });

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      for (const source of sourcesRef.current) {
        const promise = source.search(query, controller.signal);
        promise
          .then((results) => {
            if (controller.signal.aborted) return;
            setState((prev) => ({
              ...prev,
              [source.id]: {
                loading: false,
                query,
                results,
                error: null,
              },
            }));
          })
          .catch((err: unknown) => {
            if (controller.signal.aborted) return;
            // Sources can decide to reject with the AbortError they got
            // from us; treat that as a no-op rather than a user-facing
            // error.
            const name = (err as { name?: string } | null)?.name;
            if (name === "AbortError") return;
            setState((prev) => ({
              ...prev,
              [source.id]: {
                ...(prev[source.id] ?? EMPTY_SOURCE_STATE),
                loading: false,
                error: (err as Error)?.message ?? "Source failed",
              },
            }));
          });
      }
    }, Math.max(0, debounceMs));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, debounceMs]);

  return state;
}

/* -------------------------------------------------------------------------- */
/*  Filter + grouping                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Unified row shape. Registry rows come from the action registry (split
 * into "recent" + per-group buckets); source rows come from async
 * `CommandSource.search` results and are force-included (no local
 * scoring) — the source already vetted them for this query.
 *
 * `value` is the Combobox.Item identifier and the recent-slot key.
 * Source-row values are namespaced (`${source.id}:${action.id}`) so
 * two sources returning the same `action.id`, or a source returning
 * the same id as a registered action, don't collide on keyboard
 * navigation or recent storage.
 */
type Row =
  | { kind: "registry"; bucket: "recent" | string; action: Action; value: string }
  | { kind: "source"; sourceId: string; action: Action; value: string };

interface VisibleGroup {
  /** Stable React key; not user-visible. */
  id: string;
  heading: string;
  rows: Row[];
  /** Error message for a source group, if its last fetch failed. */
  error: string | null;
}

interface VisibleRowsResult {
  flat: Row[];
  groups: VisibleGroup[];
  anySourceLoading: boolean;
}

function scoreRegistryRows(
  actions: Action[],
  query: string | null,
  bucket: "recent" | string,
): Row[] {
  if (query === null) {
    // Empty query: pass through in registration order, no scoring.
    return actions.map<Row>((a) => ({
      kind: "registry",
      bucket,
      action: a,
      value: a.id,
    }));
  }
  const scored: Array<{ row: Row; score: number; idx: number }> = [];
  actions.forEach((a, idx) => {
    const aliases: string[] = [];
    if (a.keywords) aliases.push(...a.keywords);
    if (a.group) aliases.push(a.group);
    const score = commandScore(a.label, query, aliases);
    if (score > 0) {
      scored.push({
        row: { kind: "registry", bucket, action: a, value: a.id },
        score,
        idx,
      });
    }
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.map((x) => x.row);
}

function buildVisibleRows(args: {
  query: string;
  recents: Action[];
  registryGroups: Array<[string, Action[]]>;
  sources: Array<{ id: string; heading: string; state: SourceState }>;
}): VisibleRowsResult {
  const { query, recents, registryGroups, sources } = args;
  const trimmed = query.trim();
  const filterQuery = trimmed.length > 0 ? trimmed : null;

  const groups: VisibleGroup[] = [];
  const flat: Row[] = [];

  if (recents.length > 0) {
    const rows = scoreRegistryRows(recents, filterQuery, "recent");
    if (rows.length > 0) {
      groups.push({ id: "__recent__", heading: "Recent", rows, error: null });
      flat.push(...rows);
    }
  }

  for (const [name, actions] of registryGroups) {
    const rows = scoreRegistryRows(actions, filterQuery, name);
    if (rows.length > 0) {
      groups.push({ id: `__reg__:${name}`, heading: name, rows, error: null });
      flat.push(...rows);
    }
  }

  let anySourceLoading = false;
  if (filterQuery !== null) {
    for (const s of sources) {
      if (s.state.loading) anySourceLoading = true;
      // Source rows always force-mount through the local filter — the
      // source already vetted them. Show the group whenever there are
      // results or an error to surface; loading-only groups are folded
      // into the global Status row instead of a per-source affordance.
      const rows: Row[] = s.state.results.map((a) => ({
        kind: "source",
        sourceId: s.id,
        action: a,
        value: `${s.id}:${a.id}`,
      }));
      if (rows.length === 0 && !s.state.error) continue;
      groups.push({
        id: `__src__:${s.id}`,
        heading: s.heading,
        rows,
        error: s.state.error,
      });
      flat.push(...rows);
    }
  }

  return { flat, groups, anySourceLoading };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_RECENTS_KEY = "command-palette:recents";
const DEFAULT_GROUP_NAME = "Other";

export function CommandPalette({
  hotkey = "mod+k",
  sources,
  sourceDebounceMs = 150,
  maxRecents = 5,
  recentsStorageKey = DEFAULT_RECENTS_KEY,
  open: controlledOpen,
  onOpenChange,
  placeholder = "Search…",
  className,
  mac,
}: CommandPaletteProps) {
  const macResolved = mac ?? isMacLike();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [query, setQuery] = React.useState("");

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
      // Reset the search field whenever the palette closes — escape,
      // backdrop click, or `runAction` all converge here. Reopen always
      // starts blank, matching the macOS / VSCode cmd+k mental model.
      if (!next) setQuery("");
    },
    [isControlled, onOpenChange],
  );

  // Hotkey listener — owned by the palette, not the action registry. We
  // attach to `document` so events from inside portals are still caught.
  // `event.preventDefault()` only fires when the chord matches — we never
  // claim keystrokes we didn't bind.
  React.useEffect(() => {
    if (hotkey === false) return;
    const chords = parseHotkey(hotkey, macResolved);
    if (chords.length === 0) return;
    const handler = (event: KeyboardEvent) => {
      if (event.repeat) return;
      for (const chord of chords) {
        if (chordMatches(chord, event)) {
          event.preventDefault();
          setOpen(!open);
          return;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hotkey, macResolved, open, setOpen]);

  // Subscribe to the registry. Subscribers don't fire on field-level
  // updates, but the live getters mean reads pick up label/keyword/run
  // changes between renders — and the palette re-renders every time the
  // user types in the input, so derived state is naturally fresh.
  const { getAll, getById, subscribe } = useActions();
  const allActions = React.useSyncExternalStore(subscribe, getAll, getAll);

  // Filter out disabled actions. `enabled()` is a closure that often
  // captures app state outside the registry — we must re-evaluate it
  // on every palette render, not just when `allActions` identity
  // changes (the registry's snapshot only flips on register/unregister,
  // so field-level updates wouldn't otherwise invalidate a memo here).
  // Cost is trivial over a typical action list.
  const enabledActions = allActions.filter((a) => !a.enabled || a.enabled());

  // Recents are seeded from storage once and updated via `pushRecent`.
  // We rehydrate on mount only — subsequent reads come from React state
  // so the palette can echo the change without a storage round-trip.
  const [recents, setRecents] = React.useState<string[]>(() =>
    readRecents(recentsStorageKey),
  );

  const pushRecent = React.useCallback(
    (id: string) => {
      setRecents((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)].slice(0, maxRecents);
        writeRecents(recentsStorageKey, next);
        return next;
      });
    },
    [maxRecents, recentsStorageKey],
  );

  // Resolve recent ids to live Action records. Stale ids (the action was
  // unregistered, or never matched a real id) are filtered out — but kept
  // in storage so they re-appear if the action remounts later.
  const recentActions = React.useMemo<Action[]>(() => {
    const out: Action[] = [];
    for (const id of recents) {
      const a = getById(id);
      if (!a) continue;
      if (a.enabled && !a.enabled()) continue;
      out.push(a);
    }
    return out;
  }, [recents, getById, allActions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recent ids form a Set so we can suppress duplicates from the main
  // groups when the recents bucket is showing them.
  const recentIdSet = React.useMemo(
    () => new Set(recentActions.map((a) => a.id)),
    [recentActions],
  );

  // Group registered actions by Action.group, with "Other" pinned last.
  const registryGroups = React.useMemo<Array<[string, Action[]]>>(() => {
    const map = new Map<string, Action[]>();
    for (const action of enabledActions) {
      if (recentIdSet.has(action.id)) continue;
      const name = action.group ?? DEFAULT_GROUP_NAME;
      const bucket = map.get(name);
      if (bucket) bucket.push(action);
      else map.set(name, [action]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === DEFAULT_GROUP_NAME) return 1;
      if (b === DEFAULT_GROUP_NAME) return -1;
      return a.localeCompare(b);
    });
  }, [enabledActions, recentIdSet]);

  const sourceList = sources ?? EMPTY_SOURCES;
  const sourceState = useSourceResults(sourceList, query, sourceDebounceMs);

  const sourcesForBuild = React.useMemo(
    () =>
      sourceList.map((s) => ({
        id: s.id,
        heading: s.heading ?? s.id,
        state: sourceState[s.id] ?? EMPTY_SOURCE_STATE,
      })),
    [sourceList, sourceState],
  );

  const { flat, groups, anySourceLoading } = React.useMemo(
    () =>
      buildVisibleRows({
        query,
        recents: recentActions,
        registryGroups,
        sources: sourcesForBuild,
      }),
    [query, recentActions, registryGroups, sourcesForBuild],
  );

  const runAction = React.useCallback(
    (action: Action, recentId: string) => {
      // Optimistically close so subsequent focus restoration lands on the
      // trigger element. The action's `run` may itself open another
      // dialog/route; we want the palette out of the way first. (The
      // search field is cleared inside `setOpen` when next=false.)
      setOpen(false);
      // Recents persist on success, not on intent. We only push after
      // a sync `run` returns or an async `run` resolves — a `run` that
      // throws / rejects shouldn't pollute the recents list with a
      // pin that can't be re-invoked. The `recentId` arg lets sources
      // pass a namespaced id so two source rows with the same
      // `action.id` (or a source row colliding with a registered one)
      // don't fight for the same recent slot.
      try {
        const result = action.run({ source: "palette" });
        if (result instanceof Promise) {
          result.then(
            () => pushRecent(recentId),
            (err) => {
              if (typeof console !== "undefined") {
                console.error(
                  `command-palette: action "${action.id}" failed:`,
                  err,
                );
              }
            },
          );
        } else {
          pushRecent(recentId);
        }
      } catch (err) {
        if (typeof console !== "undefined") {
          console.error(
            `command-palette: action "${action.id}" threw:`,
            err,
          );
        }
      }
    },
    [setOpen, pushRecent],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-150",
          )}
        />
        <Dialog.Popup
          aria-label="Command palette"
          className={cn(
            "fixed top-[12vh] left-1/2 z-50 -translate-x-1/2",
            "w-full max-w-xl rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
            "outline-none",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "transition-all duration-150",
            className,
          )}
        >
          {/*
            BaseUI Dialog warns in dev when a `Popup` has no `Title` /
            `Description`. The visible label is the search input itself,
            so we render the title/description sr-only.
          */}
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search and run a command. Use arrow keys to navigate, enter to select, escape to close.
          </Dialog.Description>

          <Combobox.Root
            inline
            items={flat}
            filter={null}
            inputValue={query}
            onInputValueChange={(next: string) => setQuery(next)}
            value={null}
            onValueChange={(committed: Row | null) => {
              // `onValueChange` fires for both pointer clicks AND
              // keyboard Enter — so it's the single hook for "the user
              // picked this row". We never persist the selection
              // (`value` stays null), so this is essentially a
              // "select means run + close" wire. The setOpen(false)
              // inside runAction resets the input.
              if (committed) runAction(committed.action, committed.value);
            }}
            // Combobox.Root narrows `autoHighlight` to boolean in its
            // public type, but the underlying implementation still
            // accepts the string `"always"` and forwards it to the
            // store. We need "always" (not boolean true, which maps to
            // "input-change") so the first row is highlighted on mount
            // — that's the cmdk behaviour, and it makes Enter useful
            // immediately after opening the palette. Drop the directive
            // when BaseUI widens the Root type.
            // @ts-expect-error see comment above
            autoHighlight="always"
          >
            <div className="flex items-center border-b border-border px-3">
              <SearchIcon className="size-4 text-muted-foreground shrink-0" />
              <Combobox.Input
                placeholder={placeholder}
                className={cn(
                  "flex h-11 w-full bg-transparent py-3 pl-2 text-sm outline-none",
                  "placeholder:text-muted-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
            </div>
            <Combobox.List className="max-h-[60vh] overflow-y-auto p-1">
              {anySourceLoading ? (
                <Combobox.Status
                  className="px-3 py-2 text-xs text-muted-foreground"
                  role="status"
                >
                  Searching…
                </Combobox.Status>
              ) : null}

              {/*
                Suppress the empty state while a source is in flight —
                otherwise both Status ("Searching…") and Empty ("No
                results.") render simultaneously as polite live
                regions, sending contradictory announcements to screen
                readers. Once `anySourceLoading` flips back to false,
                Combobox.Empty fires as normal when the filtered item
                list is empty.
              */}
              {anySourceLoading ? null : (
                <Combobox.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results.
                </Combobox.Empty>
              )}

              {groups.map((group) => (
                <Combobox.Group
                  key={group.id}
                  className="flex flex-col"
                >
                  <Combobox.GroupLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                    {group.heading}
                  </Combobox.GroupLabel>
                  {group.rows.map((row) => (
                    <Combobox.Item
                      key={row.value}
                      value={row}
                      className={cn(
                        "flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm",
                        "outline-none select-none",
                        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                      )}
                    >
                      {row.action.icon ? (
                        <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                          {row.action.icon}
                        </span>
                      ) : null}
                      <span className="flex-1 truncate">{row.action.label}</span>
                      {row.action.shortcut ? (
                        <ShortcutCaps shortcut={row.action.shortcut} mac={macResolved} />
                      ) : null}
                    </Combobox.Item>
                  ))}
                  {group.error ? (
                    <div className="px-3 py-2 text-xs text-destructive">
                      {group.error}
                    </div>
                  ) : null}
                </Combobox.Group>
              ))}
            </Combobox.List>
          </Combobox.Root>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const EMPTY_SOURCES: CommandSource[] = [];

/* -------------------------------------------------------------------------- */
/*  Shortcut glyph row                                                        */
/* -------------------------------------------------------------------------- */

function ShortcutCaps({
  shortcut,
  mac,
}: {
  shortcut: string | string[];
  mac: boolean;
}) {
  const chords = React.useMemo(
    () => formatShortcutCaps(shortcut, mac),
    [shortcut, mac],
  );
  if (chords.length === 0) return null;
  return (
    <span className="ml-auto flex items-center gap-1">
      {chords.map((caps, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <span className="text-[10px] text-muted-foreground">then</span>
          ) : null}
          <span className="flex items-center gap-0.5">
            {caps.map((cap: KeyCap) => (
              <kbd
                key={cap.id}
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5",
                  "font-mono text-[10px] font-medium text-foreground shadow-xs",
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Re-exports                                                                */
/* -------------------------------------------------------------------------- */

export { formatShortcutCaps, isMacLike } from "./format-shortcut";
export type { KeyCap } from "./format-shortcut";
