import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ActionsProvider, useAction, type Action } from '../../hooks/action-registry/actions';
import { CommandPalette, type CommandSource } from './command-palette';

/**
 * Two suites live here:
 *
 *   1. "CommandPalette" — drop-in-specific behaviour the cmdk port
 *      doesn't speak to: registry adaptation, hotkey binding, recents
 *      persistence, source debounce + abort, `enabled()===false`
 *      filtering, run-ctx attribution, throw/reject handling.
 *
 *   2. "cmdk behavior parity (spirit port)" — vitest equivalents of
 *      cmdk's Playwright suite (basic / group / numeric / item /
 *      keybind / props), restricted to behaviours that survive the
 *      cmdk → BaseUI Combobox rewrite. Each test names the cmdk
 *      source case it ports so a future bump of `command-score.ts`
 *      can be cross-checked against upstream. Skipped intentionally:
 *      `forceMount` as a public per-item prop (we don't expose it),
 *      `shouldFilter`/`customFilter`/`controlledValue`/`controlledSearch`
 *      (not props of `<CommandPalette>`), cmdk's vim keybinds
 *      (BaseUI Combobox has its own keymap and we don't claim parity
 *      on chord grammar).
 */

const STORAGE_KEY = 'command-palette:test-recents';

function clearStorage() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

beforeEach(() => {
  clearStorage();
});

afterEach(() => {
  clearStorage();
});

function Register({ action }: { action: Action }) {
  useAction(action);
  return null;
}

function Harness({
  actions,
  sources,
  hotkey,
  open: openProp,
  onOpenChange,
}: {
  actions: Action[];
  sources?: CommandSource[];
  hotkey?: Parameters<typeof CommandPalette>[0]['hotkey'];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ActionsProvider>
      {actions.map((a) => (
        <Register key={a.id} action={a} />
      ))}
      <CommandPalette
        sources={sources}
        hotkey={hotkey}
        recentsStorageKey={STORAGE_KEY}
        open={openProp}
        onOpenChange={onOpenChange}
        // pin platform so glyphs are deterministic across CI machines
        mac
        sourceDebounceMs={50}
      />
    </ActionsProvider>
  );
}

describe('CommandPalette', () => {
  it('renders registered actions grouped by Action.group when opened', async () => {
    const settings = vi.fn();
    const newDoc = vi.fn();
    render(
      <Harness
        open
        actions={[
          {
            id: 'nav.settings',
            label: 'Open Settings',
            group: 'Navigation',
            run: settings,
          },
          {
            id: 'doc.new',
            label: 'New document',
            group: 'Documents',
            run: newDoc,
          },
        ]}
      />
    );

    expect(await screen.findByText('Open Settings')).toBeInTheDocument();
    expect(screen.getByText('New document')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('filters out actions where enabled() === false', () => {
    render(
      <Harness
        open
        actions={[
          {
            id: 'ok',
            label: 'Allowed',
            group: 'Test',
            run: () => {},
          },
          {
            id: 'blocked',
            label: 'Disallowed',
            group: 'Test',
            enabled: () => false,
            run: () => {},
          },
        ]}
      />
    );
    expect(screen.getByText('Allowed')).toBeInTheDocument();
    expect(screen.queryByText('Disallowed')).not.toBeInTheDocument();
  });

  it('invokes Action.run on selection and pushes a recent into localStorage', async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          actions={[
            {
              id: 'do.thing',
              label: 'Do the thing',
              group: 'Test',
              run: onSelect,
            },
          ]}
        />
      );
    }
    render(<Controlled />);

    const row = await screen.findByText('Do the thing');
    fireEvent.click(row);

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toEqual(['do.thing']);
    });
  });

  it("passes source: 'palette' (and no event) in the run ctx", async () => {
    const captured: Array<{ source: string | undefined; event: unknown }> = [];
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={setOpen}
          actions={[
            {
              id: 'ctx.capture',
              label: 'Capture ctx',
              group: 'Test',
              run: (ctx) => {
                captured.push({ source: ctx.source, event: ctx.event });
              },
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText('Capture ctx'));
    await waitFor(() => expect(captured).toHaveLength(1));
    expect(captured[0].source).toBe('palette');
    expect(captured[0].event).toBeUndefined();
  });

  it('does not push a recent when Action.run throws', async () => {
    // The README documents that recents persist on success, not on
    // intent — a throwing action should leave the list untouched.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={setOpen}
          actions={[
            {
              id: 'boom',
              label: 'Boom',
              group: 'Test',
              run: () => {
                throw new Error('kaboom');
              },
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText('Boom'));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    consoleError.mockRestore();
  });

  it('does not push a recent when Action.run rejects', async () => {
    // Async equivalent of the throw-test — a rejected promise also
    // counts as failure, so the recent slot stays empty.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={setOpen}
          actions={[
            {
              id: 'async-boom',
              label: 'Async boom',
              group: 'Test',
              run: () => Promise.reject(new Error('async kaboom')),
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText('Async boom'));
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    consoleError.mockRestore();
  });

  it('opens on its built-in hotkey (mod+k → meta+k on mac)', async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <Harness
          actions={[
            {
              id: 'noop',
              label: 'Noop',
              group: 'Test',
              run: () => {},
            },
          ]}
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        />
      );
    }
    render(<Controlled />);

    expect(screen.queryByText('Noop')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByText('Noop')).toBeInTheDocument();
  });

  it('does not bind a hotkey when hotkey={false}', () => {
    const onOpenChange = vi.fn();
    render(
      <Harness
        hotkey={false}
        onOpenChange={onOpenChange}
        actions={[{ id: 'noop', label: 'Noop', group: 'Test', run: () => {} }]}
      />
    );

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('debounces async sources and surfaces results in their own group', async () => {
    // Real timers throughout: vitest's fake timers interfere with
    // `findBy*` polling, and cmdk's render lifecycle has its own
    // RAF/microtask scheduling. The 50ms harness debounce keeps this
    // fast even on real timers.
    const search = vi.fn(async (query: string) => {
      return [
        {
          id: `doc:${query}`,
          label: `Doc about ${query}`,
          run: () => {},
        },
      ] as Action[];
    });
    const source: CommandSource = {
      id: 'docs',
      heading: 'Search docs',
      search,
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[{ id: 'ignored', label: 'Static row', group: 'Static', run: () => {} }]}
      />
    );

    expect(search).not.toHaveBeenCalled();

    const input = await screen.findByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'auth' } });

    // Loading row appears synchronously after the change event. Match
    // with a regex because Base UI's Combobox.Status node appends an
    // invisible word-joiner (U+2060) inside the live region.
    expect(screen.getByText(/Searching/)).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith('auth', expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByText('Doc about auth')).toBeInTheDocument();
    });
    expect(screen.getByText('Search docs')).toBeInTheDocument();
  });

  it('shows source results even when the local filter would not match the row text', async () => {
    const search = vi.fn(async () => {
      return [
        {
          id: 'doc:billing',
          label: 'Invoices and receipts',
          run: () => {},
        },
      ] as Action[];
    });
    const source: CommandSource = {
      id: 'docs',
      heading: 'Search docs',
      search,
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[{ id: 'ignored', label: 'Static row', group: 'Static', run: () => {} }]}
      />
    );

    const input = await screen.findByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'billing' } });

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith('billing', expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByText('Invoices and receipts')).toBeVisible();
    });
    expect(screen.getByText('Search docs')).toBeVisible();
  });

  it('aborts in-flight source requests when the query changes', async () => {
    const aborted: string[] = [];
    const source: CommandSource = {
      id: 'docs',
      search: (query, signal) =>
        new Promise<Action[]>((resolve, reject) => {
          // Long delay so the abort always lands first.
          const t = setTimeout(() => resolve([]), 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(t);
            aborted.push(query);
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    };

    render(
      <Harness
        open
        sources={[source]}
        actions={[{ id: 'noop', label: 'Noop', group: 'Test', run: () => {} }]}
      />
    );
    const input = await screen.findByPlaceholderText('Search…');

    fireEvent.change(input, { target: { value: 'first' } });
    // Wait for the debounce to elapse + the source to fire the search.
    await waitFor(() => expect(aborted).toEqual([])); // sanity: not aborted yet
    await new Promise((r) => setTimeout(r, 80));
    fireEvent.change(input, { target: { value: 'second' } });
    await waitFor(() => expect(aborted).toContain('first'));
  });

  it('shows a Recent group on reopen for the most recently invoked action', async () => {
    const handler = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            reopen
          </button>
          <Harness
            open={open}
            onOpenChange={setOpen}
            actions={[
              { id: 'go.inbox', label: 'Go to inbox', group: 'Nav', run: handler },
              { id: 'go.archive', label: 'Go to archive', group: 'Nav', run: () => {} },
            ]}
          />
        </>
      );
    }

    render(<Controlled />);
    fireEvent.click(await screen.findByText('Go to inbox'));
    await waitFor(() => expect(handler).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'reopen' }));
    expect(await screen.findByText('Recent')).toBeInTheDocument();
    // The recent action shows under "Recent" (and is suppressed from "Nav").
    expect(screen.getAllByText('Go to inbox')).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */
/*  cmdk behavior parity (spirit port)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Each test names the cmdk test file + case it ports. Source:
 *   https://github.com/pacocoursey/cmdk/tree/main/test
 *
 * We assert against our drop-in's public surface (registered actions
 * via the registry, the search input, visible row text, group
 * headings). cmdk-specific selectors (`[cmdk-item]`, `[cmdk-group]`,
 * `aria-selected="true"`) are translated to text matches and BaseUI's
 * `[data-highlighted]` attribute as appropriate.
 */
describe('cmdk behavior parity (spirit port)', () => {
  /** Type into the palette's search input. The Harness already renders
   * the input synchronously when `open`. */
  function type(value: string) {
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value } });
  }

  /** Locate the action row by its label and return the enclosing
   * Combobox.Item element so attribute assertions are stable. */
  function row(label: string): HTMLElement {
    const el = screen.getByText(label).closest('[role="option"]');
    if (!el) throw new Error(`No option row for ${label}`);
    return el as HTMLElement;
  }

  // ---- basic.test.ts ----

  it('filters non-matching actions by label substring (basic: items filter when searching)', () => {
    // cmdk's source test gives the surviving item `value="xxx"`,
    // which doubles as a search alias in cmdk. Our drop-in's
    // equivalent search alias is `keywords` — the action's id is not
    // part of the haystack.
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Item', group: 'Demo', run: () => {} },
          { id: 'b', label: 'Value', group: 'Demo', keywords: ['xxx'], run: () => {} },
        ]}
      />
    );
    expect(screen.getByText('Item')).toBeVisible();
    expect(screen.getByText('Value')).toBeVisible();

    type('x');

    // "Item" has no `x` in label/keywords/group; command-score drops
    // it. "Value" stays — its `xxx` keyword matches.
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
    expect(screen.getByText('Value')).toBeVisible();
  });

  it('matches actions by their keywords (basic: items filter when searching by keywords)', () => {
    render(
      <Harness
        open
        actions={[
          {
            id: 'a',
            label: 'Item',
            group: 'Test',
            keywords: ['keyword'],
            run: () => {},
          },
          { id: 'b', label: 'Value', group: 'Test', run: () => {} },
        ]}
      />
    );
    type('key');
    expect(screen.queryByText('Value')).not.toBeInTheDocument();
    expect(screen.getByText('Item')).toBeVisible();
  });

  it('matches actions by their group name (drop-in addition over cmdk: group aliases score)', () => {
    // Our scorer feeds `[...keywords, action.group]` as aliases, so a
    // user who types "Nav" finds rows in the Navigation group even if
    // their labels don't contain "nav". No direct cmdk equivalent —
    // cmdk doesn't search group names.
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Inbox', group: 'Navigation', run: () => {} },
          { id: 'b', label: 'Settings', group: 'Preferences', run: () => {} },
        ]}
      />
    );
    type('Naviga');
    expect(screen.getByText('Inbox')).toBeVisible();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows the empty state when the query matches nothing (basic: empty renders when no results)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Item', group: 'Test', run: () => {} },
          { id: 'b', label: 'Value', group: 'Test', run: () => {} },
        ]}
      />
    );
    type('zzzz');
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
    expect(screen.queryByText('Value')).not.toBeInTheDocument();
    // BaseUI Combobox.Empty appends a U+2060 word-joiner inside its
    // aria-live region — match with regex (same reason as the
    // "Searching…" assertion above).
    expect(screen.getByText(/No results\./)).toBeVisible();
  });

  // ---- basic.test.ts: highlight ----

  it('highlights the first row by default (basic: first item is selected by default)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Item', group: 'Test', run: () => {} },
          { id: 'b', label: 'Value', group: 'Test', run: () => {} },
        ]}
      />
    );
    // Empty query: first row is "Item".
    expect(row('Item')).toHaveAttribute('data-highlighted');
    expect(row('Value')).not.toHaveAttribute('data-highlighted');
  });

  it('re-highlights the first row when the query narrows results (basic: first item is selected when search changes)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Item', group: 'Test', run: () => {} },
          { id: 'b', label: 'Value', group: 'Test', run: () => {} },
        ]}
      />
    );
    type('v');
    // "Item" is dropped; "Value" is now the first (and only) row.
    expect(row('Value')).toHaveAttribute('data-highlighted');
  });

  // ---- group.test.ts ----

  it('hides a group when none of its actions match the query (group: shown/hidden based on item matches)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Aardvark', group: 'Animals', run: () => {} },
          { id: 'b', label: 'Bear', group: 'Animals', run: () => {} },
          { id: 'c', label: 'Zinc', group: 'Letters', run: () => {} },
        ]}
      />
    );
    expect(screen.getByText('Animals')).toBeVisible();
    expect(screen.getByText('Letters')).toBeVisible();

    type('z');

    expect(screen.queryByText('Animals')).not.toBeInTheDocument();
    expect(screen.getByText('Letters')).toBeVisible();
    expect(screen.getByText('Zinc')).toBeVisible();
  });

  it('renders only the group with matching rows when the query narrows further (group: progressive rendering)', () => {
    // Group names are intentionally chosen so none contain `t` —
    // otherwise our scorer (which searches `action.group` as an alias)
    // would keep a row alive via its group name and the test would be
    // checking the wrong thing.
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Aardvark', group: 'Animals', run: () => {} },
          { id: 'b', label: 'Bear', group: 'Animals', run: () => {} },
          { id: 'c', label: 'Lima', group: 'Roman', run: () => {} },
          { id: 'd', label: 'Three', group: 'Numbers', run: () => {} },
        ]}
      />
    );
    type('t');
    // "Three" is the only row that scores above zero on `t` — its
    // label has a `t`; no other label or group does.
    expect(screen.queryByText('Animals')).not.toBeInTheDocument();
    expect(screen.queryByText('Roman')).not.toBeInTheDocument();
    expect(screen.getByText('Numbers')).toBeVisible();
    expect(screen.getByText('Three')).toBeVisible();
  });

  // ---- numeric.test.ts ----

  it('matches numeric tokens inside a dotted label (numeric: filter on numeric inputs)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'foo.bar112.value', group: 'Test', run: () => {} },
          { id: 'b', label: 'unrelated', group: 'Test', run: () => {} },
        ]}
      />
    );
    type('112');
    expect(screen.getByText('foo.bar112.value')).toBeVisible();
    expect(screen.queryByText('unrelated')).not.toBeInTheDocument();
  });

  it('matches non-numeric tokens inside a dotted label (numeric: filter on non-numeric inputs)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'foo.bar112.value', group: 'Test', run: () => {} },
          { id: 'b', label: 'unrelated', group: 'Test', run: () => {} },
        ]}
      />
    );
    type('bar');
    expect(screen.getByText('foo.bar112.value')).toBeVisible();
    expect(screen.queryByText('unrelated')).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/*  Filter scoring (extended)                                                 */
/* -------------------------------------------------------------------------- */

describe('filter scoring (extended)', () => {
  function type(value: string) {
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value } });
  }

  it('matches case-insensitively', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Open Settings', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Close window', group: 'Nav', run: () => {} },
        ]}
      />
    );
    type('SETTINGS');
    expect(screen.getByText('Open Settings')).toBeVisible();
    expect(screen.queryByText('Close window')).not.toBeInTheDocument();
  });

  it('ranks better-matching rows above worse-matching rows', () => {
    // command-score gives prefix/word-start matches a much higher
    // score than mid-string character jumps. A row whose label
    // starts with the query should render before one that only
    // contains the characters scattered.
    render(
      <Harness
        open
        actions={[
          // "settings" matches "set" as a prefix (score ~= 1)
          { id: 'a', label: 'settings', group: 'Nav', run: () => {} },
          // "asset list" has s,e,t scattered → much lower score
          { id: 'b', label: 'asset list', group: 'Nav', run: () => {} },
        ]}
      />
    );
    type('set');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('settings');
    expect(options[1]).toHaveTextContent('asset list');
  });

  it('matches with non-contiguous character runs (fuzzy gap match)', () => {
    // "open settings" should match "ops" via o + p + s — letters in
    // order but with gaps. cmdk's scorer (and ours) returns > 0 here.
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'open settings', group: 'Nav', run: () => {} },
          { id: 'b', label: 'xyz', group: 'Nav', run: () => {} },
        ]}
      />
    );
    type('ops');
    expect(screen.getByText('open settings')).toBeVisible();
    expect(screen.queryByText('xyz')).not.toBeInTheDocument();
  });

  it("re-evaluates the filter when an action's label changes (item-advanced: re-rendering re-matches)", () => {
    // BaseUI Dialog aria-hides everything outside its Popup once
    // open, so test buttons outside the dialog become unclickable
    // through accessible queries. Capture setState via ref instead.
    let bump: (() => void) | undefined;
    function Controlled() {
      const [n, setN] = React.useState(2);
      bump = () => setN((x) => x + 1);
      return (
        <Harness open actions={[{ id: 'a', label: `count-${n}`, group: 'Nav', run: () => {} }]} />
      );
    }
    render(<Controlled />);
    type('2');
    expect(screen.getByText('count-2')).toBeVisible();
    act(() => bump!());
    // Label is now "count-3", which no longer contains "2".
    expect(screen.queryByText('count-2')).not.toBeInTheDocument();
    expect(screen.queryByText('count-3')).not.toBeInTheDocument();
  });

  it('scopes the query — empty query shows all registered rows', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'One', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Two', group: 'Nav', run: () => {} },
          { id: 'c', label: 'Three', group: 'Nav', run: () => {} },
        ]}
      />
    );
    // Sanity: the empty-query path bypasses the scorer; every action
    // is visible in registration order.
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['One', 'Two', 'Three']);
  });
});

/* -------------------------------------------------------------------------- */
/*  Action lifecycle (registry integration)                                   */
/* -------------------------------------------------------------------------- */

describe('action lifecycle', () => {
  function type(value: string) {
    const input = screen.getByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value } });
  }

  // All lifecycle tests use a captured `setState` ref instead of an
  // in-DOM toggle button: BaseUI Dialog aria-hides every node outside
  // its Popup once open, so `getByRole("button")` would not find an
  // outside toggle. This pattern mirrors what real apps do (state
  // mutations come from route changes / external events, not from a
  // button rendered next to the palette).

  it('shows a newly registered action while the palette is open (item: mount matches)', () => {
    let setExtra: ((v: boolean) => void) | undefined;
    function Controlled() {
      const [extra, setExtraState] = React.useState(false);
      setExtra = setExtraState;
      return (
        <Harness
          open
          actions={[
            { id: 'a', label: 'Anchor', group: 'Nav', run: () => {} },
            ...(extra ? [{ id: 'b', label: 'Beacon', group: 'Nav', run: () => {} }] : []),
          ]}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByText('Anchor')).toBeVisible();
    expect(screen.queryByText('Beacon')).not.toBeInTheDocument();
    act(() => setExtra!(true));
    expect(screen.getByText('Beacon')).toBeVisible();
  });

  it('hides an unregistered action while the palette is open (item: unmount removes)', () => {
    let setKeep: ((v: boolean) => void) | undefined;
    function Controlled() {
      const [keep, setKeepState] = React.useState(true);
      setKeep = setKeepState;
      return (
        <Harness
          open
          actions={
            keep
              ? [
                  { id: 'a', label: 'Anchor', group: 'Nav', run: () => {} },
                  { id: 'b', label: 'Beacon', group: 'Nav', run: () => {} },
                ]
              : [{ id: 'a', label: 'Anchor', group: 'Nav', run: () => {} }]
          }
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByText('Beacon')).toBeVisible();
    act(() => setKeep!(false));
    expect(screen.queryByText('Beacon')).not.toBeInTheDocument();
    expect(screen.getByText('Anchor')).toBeVisible();
  });

  it('shows the empty state when the only matching action is unregistered (item: unmount only result)', () => {
    let setKeep: ((v: boolean) => void) | undefined;
    function Controlled() {
      const [keep, setKeepState] = React.useState(true);
      setKeep = setKeepState;
      return (
        <Harness
          open
          actions={keep ? [{ id: 'a', label: 'Only', group: 'Nav', run: () => {} }] : []}
        />
      );
    }
    render(<Controlled />);
    type('only');
    expect(screen.getByText('Only')).toBeVisible();
    act(() => setKeep!(false));
    expect(screen.queryByText('Only')).not.toBeInTheDocument();
    expect(screen.getByText(/No results\./)).toBeVisible();
  });

  it('removes the empty state when an action that matches the query is registered (item: mount only result)', () => {
    let setMount: ((v: boolean) => void) | undefined;
    function Controlled() {
      const [mount, setMountState] = React.useState(false);
      setMount = setMountState;
      return (
        <Harness
          open
          actions={mount ? [{ id: 'a', label: 'Matchme', group: 'Nav', run: () => {} }] : []}
        />
      );
    }
    render(<Controlled />);
    type('match');
    expect(screen.getByText(/No results\./)).toBeVisible();
    act(() => setMount!(true));
    expect(screen.queryByText(/No results\./)).not.toBeInTheDocument();
    expect(screen.getByText('Matchme')).toBeVisible();
  });

  it('evaluates enabled() on every render (toggle flips visibility live)', () => {
    let toggle: (() => void) | undefined;
    function Controlled() {
      const [allowed, setAllowed] = React.useState(true);
      toggle = () => setAllowed((x) => !x);
      return (
        <Harness
          open
          actions={[
            {
              id: 'guarded',
              label: 'Guarded',
              group: 'Nav',
              enabled: () => allowed,
              run: () => {},
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByText('Guarded')).toBeVisible();
    act(() => toggle!());
    expect(screen.queryByText('Guarded')).not.toBeInTheDocument();
    act(() => toggle!());
    expect(screen.getByText('Guarded')).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */
/*  Keyboard navigation (arrow/Enter/Escape)                                  */
/* -------------------------------------------------------------------------- */

describe('keyboard navigation', () => {
  function input() {
    return screen.getByPlaceholderText('Search…');
  }
  function highlighted() {
    return document.querySelector('[role="option"][data-highlighted]');
  }

  it('ArrowDown moves the highlight to the next row (keybind: arrow up/down)', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Row A', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Row B', group: 'Nav', run: () => {} },
          { id: 'c', label: 'Row C', group: 'Nav', run: () => {} },
        ]}
      />
    );
    expect(highlighted()).toHaveTextContent('Row A');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(highlighted()).toHaveTextContent('Row B');
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(highlighted()).toHaveTextContent('Row C');
  });

  it('ArrowUp moves the highlight to the previous row', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Row A', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Row B', group: 'Nav', run: () => {} },
          { id: 'c', label: 'Row C', group: 'Nav', run: () => {} },
        ]}
      />
    );
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(highlighted()).toHaveTextContent('Row C');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(highlighted()).toHaveTextContent('Row B');
  });

  it('Enter runs the highlighted action (basic: item onSelect on Enter)', async () => {
    // BaseUI's Enter handler does `activeListItem.click()` internally.
    // Use userEvent so focus + the keyboard event are simulated more
    // faithfully than fireEvent.keyDown (which doesn't drive React's
    // focus-aware paths the same way).
    const user = userEvent.setup();
    const top = vi.fn();
    const middle = vi.fn();
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Top', group: 'Nav', run: top },
          { id: 'b', label: 'Middle', group: 'Nav', run: middle },
        ]}
      />
    );
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(middle).toHaveBeenCalledTimes(1));
    expect(top).not.toHaveBeenCalled();
  });

  it('Escape closes the dialog', async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          actions={[{ id: 'a', label: 'Row A', group: 'Nav', run: () => {} }]}
        />
      );
    }
    render(<Controlled />);
    expect(screen.getByText('Row A')).toBeVisible();
    fireEvent.keyDown(input(), { key: 'Escape' });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    await waitFor(() => {
      expect(screen.queryByText('Row A')).not.toBeInTheDocument();
    });
  });
});

/* -------------------------------------------------------------------------- */
/*  Recents (extended)                                                        */
/* -------------------------------------------------------------------------- */

describe('recents (extended)', () => {
  it('trims the recents list to maxRecents', async () => {
    // Pass `open` as a literal (not controlled) so each click's
    // implicit setOpen(false) is a no-op — the palette stays open and
    // we can click successive rows.
    render(
      <ActionsProvider>
        {[1, 2, 3, 4, 5].map((n) => (
          <Register
            key={n}
            action={{
              id: `act-${n}`,
              label: `Action ${n}`,
              group: 'Nav',
              run: () => {},
            }}
          />
        ))}
        <CommandPalette
          open
          recentsStorageKey={STORAGE_KEY}
          maxRecents={3}
          mac
          sourceDebounceMs={50}
        />
      </ActionsProvider>
    );
    for (const n of [1, 2, 3, 4, 5]) {
      fireEvent.click(screen.getByText(`Action ${n}`));
      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        expect(stored[0]).toBe(`act-${n}`);
      });
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    // Most recent first; trimmed to 3 entries; oldest (act-1, act-2)
    // dropped.
    expect(stored).toEqual(['act-5', 'act-4', 'act-3']);
  });

  it('bumps a re-invoked action to the top of recents (no duplicates)', async () => {
    render(
      <ActionsProvider>
        {['a', 'b'].map((id) => (
          <Register
            key={id}
            action={{
              id,
              label: id.toUpperCase(),
              group: 'Nav',
              run: () => {},
            }}
          />
        ))}
        <CommandPalette
          open
          recentsStorageKey={STORAGE_KEY}
          maxRecents={5}
          mac
          sourceDebounceMs={50}
        />
      </ActionsProvider>
    );
    fireEvent.click(screen.getByText('A'));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['a']);
    });
    fireEvent.click(screen.getByText('B'));
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['b', 'a']);
    });
    fireEvent.click(screen.getByText('A'));
    await waitFor(() => {
      // "a" moves to the top — no duplicate "a" entry.
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['a', 'b']);
    });
  });

  it('hides stale recent ids whose action is unregistered but keeps them in storage', async () => {
    // Seed storage with an id whose action will not be registered —
    // simulates an action that lived in a previous session but isn't
    // mounted now.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['ghost', 'live']));
    render(
      <Harness open actions={[{ id: 'live', label: 'Live action', group: 'Nav', run: () => {} }]} />
    );
    expect(screen.getByText('Recent')).toBeVisible();
    expect(screen.getByText('Live action')).toBeVisible();
    // Storage is untouched on read — ghost id stays so it reappears
    // if the action remounts in a future session.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['ghost', 'live']);
  });
});

/* -------------------------------------------------------------------------- */
/*  Hotkeys (extended)                                                        */
/* -------------------------------------------------------------------------- */

describe('hotkeys (extended)', () => {
  it('binds a custom chord (mod+shift+p)', () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <Harness
          hotkey="mod+shift+p"
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          actions={[{ id: 'n', label: 'Noop', group: 'Nav', run: () => {} }]}
        />
      );
    }
    render(<Controlled />);
    // The default mod+k chord should NOT open it.
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();
    // The custom chord should.
    fireEvent.keyDown(document, {
      key: 'p',
      metaKey: true,
      shiftKey: true,
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('accepts an array of alternate chords', () => {
    // `parseHotkey` does not normalize "space" → " "; documented
    // examples that pass "ctrl+space" depend on a follow-up fix to
    // the parser. Use a plain alternate ("ctrl+i") here so the test
    // exercises the array branch without depending on that fix.
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <Harness
          hotkey={['mod+k', 'ctrl+i']}
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          actions={[{ id: 'n', label: 'Noop', group: 'Nav', run: () => {} }]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.keyDown(document, { key: 'i', ctrlKey: true });
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('toggles the palette closed when its hotkey fires while open', async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <Harness
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          actions={[{ id: 'n', label: 'Noop', group: 'Nav', run: () => {} }]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(screen.getByText('Noop')).toBeVisible());
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

/* -------------------------------------------------------------------------- */
/*  Sources (extended)                                                        */
/* -------------------------------------------------------------------------- */

describe('sources (extended)', () => {
  it("surfaces a source error inside that source's group", async () => {
    const source: CommandSource = {
      id: 'docs',
      heading: 'Docs',
      search: async () => {
        throw new Error('backend exploded');
      },
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[{ id: 'x', label: 'Other', group: 'Other', run: () => {} }]}
      />
    );
    const input = await screen.findByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'q' } });
    await waitFor(() => {
      expect(screen.getByText('backend exploded')).toBeVisible();
    });
    // The error renders alongside its source's heading, even though
    // there are no result rows in the group.
    expect(screen.getByText('Docs')).toBeVisible();
  });

  it('renders multiple sources in the order they were passed', async () => {
    const sourceA: CommandSource = {
      id: 'a',
      heading: 'Alpha',
      search: async () => [{ id: 'a:1', label: 'Alpha hit', run: () => {} }],
    };
    const sourceB: CommandSource = {
      id: 'b',
      heading: 'Bravo',
      search: async () => [{ id: 'b:1', label: 'Bravo hit', run: () => {} }],
    };
    render(<Harness open sources={[sourceA, sourceB]} actions={[]} />);
    const input = await screen.findByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'hit' } });
    await waitFor(() => {
      expect(screen.getByText('Alpha hit')).toBeVisible();
      expect(screen.getByText('Bravo hit')).toBeVisible();
    });
    const alpha = screen.getByText('Alpha');
    const bravo = screen.getByText('Bravo');
    // Alpha precedes Bravo in DOM order — sources render in
    // registration order, not by id, response time, or label.
    expect(alpha.compareDocumentPosition(bravo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('fires sources immediately when sourceDebounceMs is 0', async () => {
    const search = vi.fn(async (q: string) => [
      { id: `r:${q}`, label: `Result ${q}`, run: () => {} },
    ]);
    const source: CommandSource = {
      id: 'fast',
      heading: 'Fast source',
      search,
    };
    function Controlled() {
      return (
        <ActionsProvider>
          <CommandPalette
            open
            sources={[source]}
            recentsStorageKey={STORAGE_KEY}
            sourceDebounceMs={0}
            mac
          />
        </ActionsProvider>
      );
    }
    render(<Controlled />);
    const input = await screen.findByPlaceholderText('Search…');
    fireEvent.change(input, { target: { value: 'now' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('now', expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByText('Result now')).toBeVisible());
  });
});

/* -------------------------------------------------------------------------- */
/*  Accessibility wiring                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The palette consumes BaseUI's a11y primitives — these tests assert
 * the consumption is correct, not that BaseUI itself works. Concretely
 * they catch: someone deleting the sr-only `Dialog.Title` /
 * `Dialog.Description` (they look unused but they wire the dialog's
 * accessible name); a stray attribute that overrides BaseUI's wiring;
 * a future BaseUI bump that regresses combobox / listbox /
 * activedescendant plumbing. Focus management is asserted only at the
 * level jsdom can simulate (initial-focus into the dialog, focus
 * return on close).
 */
describe('accessibility wiring', () => {
  it('renders the popup as role=dialog', () => {
    // Note: Base UI's Dialog.Popup does not emit `aria-modal="true"`
    // even though our dialog is modal. ATs key off `role="dialog"`
    // and Base UI's focus trap, which is fine for the common case.
    // If Base UI adds aria-modal in a future bump, tighten this
    // test to assert it.
    render(<Harness open actions={[{ id: 'a', label: 'A', group: 'Nav', run: () => {} }]} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeVisible();
  });

  it('labels the dialog via aria-labelledby pointing at the sr-only Title', () => {
    render(<Harness open actions={[{ id: 'a', label: 'A', group: 'Nav', run: () => {} }]} />);
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const labelNode = document.getElementById(labelledBy!);
    expect(labelNode).toBeTruthy();
    expect(labelNode).toHaveTextContent('Command palette');
  });

  it('describes the dialog via aria-describedby pointing at the sr-only Description', () => {
    render(<Harness open actions={[{ id: 'a', label: 'A', group: 'Nav', run: () => {} }]} />);
    const dialog = screen.getByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const descNode = document.getElementById(describedBy!);
    expect(descNode).toBeTruthy();
    // Description text spells out the in-dialog keyboard contract so
    // screen readers can announce it on open.
    expect(descNode).toHaveTextContent(/arrow keys|enter|escape/i);
  });

  it('marks the input as role=combobox with aria-autocomplete=list', () => {
    // Note: Base UI deliberately omits `aria-expanded` /
    // `aria-controls` on combobox inputs rendered in `inline` mode —
    // the assumption is that an always-visible inline list doesn't
    // need expansion semantics. Strict WAI-ARIA combobox pattern
    // expects aria-expanded; assert what Base UI actually emits and
    // tighten if/when upstream wires more.
    render(<Harness open actions={[{ id: 'a', label: 'A', group: 'Nav', run: () => {} }]} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('renders a role=listbox region inside the dialog', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Alpha', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Bravo', group: 'Nav', run: () => {} },
        ]}
      />
    );
    // Base UI's inline combobox does not link input → listbox via
    // `aria-controls`, but the listbox is still rendered with the
    // correct role. ATs that traverse the dialog will reach it.
    const listbox = screen.getByRole('listbox');
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(listbox)).toBe(true);
  });

  it('tracks the highlighted row via aria-activedescendant and updates it on ArrowDown', () => {
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Alpha', group: 'Nav', run: () => {} },
          { id: 'b', label: 'Bravo', group: 'Nav', run: () => {} },
        ]}
      />
    );
    const input = screen.getByRole('combobox');

    // Initial highlight (autoHighlight="always") is the first option.
    const initialId = input.getAttribute('aria-activedescendant');
    expect(initialId).toBeTruthy();
    const initialOption = document.getElementById(initialId!);
    expect(initialOption).toHaveTextContent('Alpha');
    expect(initialOption).toHaveAttribute('data-highlighted');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const nextId = input.getAttribute('aria-activedescendant');
    expect(nextId).toBeTruthy();
    expect(nextId).not.toBe(initialId);
    const nextOption = document.getElementById(nextId!);
    expect(nextOption).toHaveTextContent('Bravo');
    expect(nextOption).toHaveAttribute('data-highlighted');
  });

  it("renders the 'Searching…' status as a polite live region", async () => {
    const source: CommandSource = {
      id: 'docs',
      heading: 'Docs',
      search: () =>
        // Never resolves during this assertion — we only need the
        // loading row to be in the DOM.
        new Promise(() => {}),
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[{ id: 'x', label: 'Other', group: 'Other', run: () => {} }]}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'q' },
    });
    // The text is inside a styled child; the live region is the
    // (naked) Combobox.Status wrapper one level up.
    const textNode = await screen.findByText(/Searching/);
    const liveRegion = textNode.closest('[aria-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('keeps the empty live region naked so it consumes no vertical space when not empty', () => {
    // Regression for the "48px gap under the search input" bug:
    // Combobox.Empty's wrapper must stay mounted (BaseUI requirement
    // for consistent AT announcements), so applying padding /
    // text-size classes directly to it leaves a 48px ghost block
    // visible whenever the list is non-empty. Styling belongs on the
    // inner content; the wrapper stays naked.
    render(<Harness open actions={[{ id: 'a', label: 'Alpha', group: 'Nav', run: () => {} }]} />);
    // Find the empty-state live region by structural traversal:
    // there are two role=status nodes (Combobox.Status for
    // "Searching…", Combobox.Empty for "No results.") — the empty
    // one is the only one whose textContent is empty right now (no
    // search in flight, list non-empty).
    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    const naked = Array.from(liveRegions).filter((n) => (n.textContent ?? '').trim() === '');
    expect(naked.length).toBeGreaterThan(0);
    for (const n of naked) {
      expect(n.className).not.toMatch(/py-\d/);
      expect(n.className).not.toMatch(/p-\d/);
    }
  });

  it('renders the empty state as a polite live region', () => {
    render(<Harness open actions={[{ id: 'a', label: 'Alpha', group: 'Nav', run: () => {} }]} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'zzzz' },
    });
    const textNode = screen.getByText(/No results\./);
    const liveRegion = textNode.closest('[aria-live]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('moves focus to the search input when the dialog opens', async () => {
    render(<Harness open actions={[{ id: 'a', label: 'Alpha', group: 'Nav', run: () => {} }]} />);
    const input = screen.getByRole('combobox');
    // BaseUI's Dialog focus management runs in an effect — wait a
    // tick before asserting.
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('labels each group section via aria-labelledby resolving to the heading text', () => {
    // Issue 1 from review: groups are real Combobox.Group elements
    // (role=group + aria-labelledby), not unnamed sections. ATs
    // announce "Navigation, group, …" when arrowing into a group.
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Inbox', group: 'Navigation', run: () => {} },
          { id: 'b', label: 'Save', group: 'Documents', run: () => {} },
        ]}
      />
    );
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const headings = groups
      .map((g) => {
        const id = g.getAttribute('aria-labelledby');
        return id ? (document.getElementById(id)?.textContent ?? null) : null;
      })
      .filter((x): x is string => x !== null);
    expect(headings).toContain('Navigation');
    expect(headings).toContain('Documents');
  });

  it('suppresses the empty state while a source is loading (no contradictory live regions)', async () => {
    // Issue 3 from review: when the local registry filter returns
    // zero rows AND a source is still loading, the old code rendered
    // both Combobox.Status ("Searching…") and Combobox.Empty ("No
    // results.") as polite live regions — two contradictory
    // announcements. Empty is now suppressed while loading.
    const source: CommandSource = {
      id: 'docs',
      heading: 'Docs',
      // Never resolves — the loading state is what we want to assert
      // against, and the test cleans up by unmounting.
      search: () => new Promise(() => {}),
    };
    render(<Harness open sources={[source]} actions={[]} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'anything' },
    });
    await screen.findByText(/Searching/);
    expect(screen.queryByText(/No results\./)).not.toBeInTheDocument();
  });

  it('Enter on the input commits the highlighted row via the value-change path', async () => {
    // Issue 4 from review: pin an explicit assertion that Enter
    // routes through Combobox.Root's onValueChange, the single hook
    // we use to run actions. In jsdom, BaseUI's Enter handler
    // delegates to `activeListItem.click()`, which fires both
    // onValueChange and any per-item onClick — so this test can't
    // distinguish between the two implementations, but it does fail
    // immediately if the dispatch path is removed entirely. The
    // userEvent setup mirrors the existing keyboard-nav Enter test
    // because fireEvent.keyDown for Enter (alone) doesn't reach
    // BaseUI's selection commit reliably in jsdom — userEvent does.
    const user = userEvent.setup();
    const top = vi.fn();
    const middle = vi.fn();
    render(
      <Harness
        open
        actions={[
          { id: 'a', label: 'Top', group: 'Nav', run: top },
          { id: 'b', label: 'Middle', group: 'Nav', run: middle },
        ]}
      />
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(middle).toHaveBeenCalledTimes(1));
    expect(top).not.toHaveBeenCalled();
  });

  it('returns focus to the previously-focused element when the dialog closes', async () => {
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <ActionsProvider>
          <button type="button" onClick={() => setOpen(true)} data-testid="trigger">
            Open
          </button>
          <CommandPalette
            open={open}
            onOpenChange={setOpen}
            recentsStorageKey={STORAGE_KEY}
            mac
            sourceDebounceMs={50}
          />
        </ActionsProvider>
      );
    }
    render(<Controlled />);

    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const input = await screen.findByRole('combobox');
    await waitFor(() => expect(document.activeElement).toBe(input));

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
