import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  ActionsProvider,
  useAction,
  type Action,
} from "../../hooks/action-registry/actions";
import {
  CommandPalette,
  type CommandSource,
} from "./command-palette";

/**
 * Smoke-level verification harness. cmdk has its own thorough test
 * suite — we don't re-test arrow keys / filtering — but we *do* test
 * the things this drop-in adds on top: registry adaptation, hotkey
 * binding, recents persistence, source debounce, and the
 * "enabled()===false" filter.
 */

const STORAGE_KEY = "command-palette:test-recents";

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
  hotkey?: Parameters<typeof CommandPalette>[0]["hotkey"];
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

describe("CommandPalette", () => {
  it("renders registered actions grouped by Action.group when opened", async () => {
    const settings = vi.fn();
    const newDoc = vi.fn();
    render(
      <Harness
        open
        actions={[
          {
            id: "nav.settings",
            label: "Open Settings",
            group: "Navigation",
            run: settings,
          },
          {
            id: "doc.new",
            label: "New document",
            group: "Documents",
            run: newDoc,
          },
        ]}
      />,
    );

    expect(await screen.findByText("Open Settings")).toBeInTheDocument();
    expect(screen.getByText("New document")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("filters out actions where enabled() === false", () => {
    render(
      <Harness
        open
        actions={[
          {
            id: "ok",
            label: "Allowed",
            group: "Test",
            run: () => {},
          },
          {
            id: "blocked",
            label: "Disallowed",
            group: "Test",
            enabled: () => false,
            run: () => {},
          },
        ]}
      />,
    );
    expect(screen.getByText("Allowed")).toBeInTheDocument();
    expect(screen.queryByText("Disallowed")).not.toBeInTheDocument();
  });

  it("invokes Action.run on selection and pushes a recent into localStorage", async () => {
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
              id: "do.thing",
              label: "Do the thing",
              group: "Test",
              run: onSelect,
            },
          ]}
        />
      );
    }
    render(<Controlled />);

    const row = await screen.findByText("Do the thing");
    fireEvent.click(row);

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      expect(stored).toEqual(["do.thing"]);
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
              id: "ctx.capture",
              label: "Capture ctx",
              group: "Test",
              run: (ctx) => {
                captured.push({ source: ctx.source, event: ctx.event });
              },
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText("Capture ctx"));
    await waitFor(() => expect(captured).toHaveLength(1));
    expect(captured[0].source).toBe("palette");
    expect(captured[0].event).toBeUndefined();
  });

  it("does not push a recent when Action.run throws", async () => {
    // The README documents that recents persist on success, not on
    // intent — a throwing action should leave the list untouched.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={setOpen}
          actions={[
            {
              id: "boom",
              label: "Boom",
              group: "Test",
              run: () => {
                throw new Error("kaboom");
              },
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText("Boom"));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    consoleError.mockRestore();
  });

  it("does not push a recent when Action.run rejects", async () => {
    // Async equivalent of the throw-test — a rejected promise also
    // counts as failure, so the recent slot stays empty.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function Controlled() {
      const [open, setOpen] = React.useState(true);
      return (
        <Harness
          open={open}
          onOpenChange={setOpen}
          actions={[
            {
              id: "async-boom",
              label: "Async boom",
              group: "Test",
              run: () => Promise.reject(new Error("async kaboom")),
            },
          ]}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(await screen.findByText("Async boom"));
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    consoleError.mockRestore();
  });

  it("opens on its built-in hotkey (mod+k → meta+k on mac)", async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = React.useState(false);
      return (
        <Harness
          actions={[
            {
              id: "noop",
              label: "Noop",
              group: "Test",
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

    expect(screen.queryByText("Noop")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByText("Noop")).toBeInTheDocument();
  });

  it("does not bind a hotkey when hotkey={false}", () => {
    const onOpenChange = vi.fn();
    render(
      <Harness
        hotkey={false}
        onOpenChange={onOpenChange}
        actions={[
          { id: "noop", label: "Noop", group: "Test", run: () => {} },
        ]}
      />,
    );

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("debounces async sources and surfaces results in their own group", async () => {
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
      id: "docs",
      heading: "Search docs",
      search,
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[
          { id: "ignored", label: "Static row", group: "Static", run: () => {} },
        ]}
      />,
    );

    expect(search).not.toHaveBeenCalled();

    const input = await screen.findByPlaceholderText("Search…");
    fireEvent.change(input, { target: { value: "auth" } });

    // Loading row appears synchronously after the change event.
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith("auth", expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByText("Doc about auth")).toBeInTheDocument();
    });
    expect(screen.getByText("Search docs")).toBeInTheDocument();
  });

  it("shows source results even when cmdk would not match the row text", async () => {
    const search = vi.fn(async () => {
      return [
        {
          id: "doc:billing",
          label: "Invoices and receipts",
          run: () => {},
        },
      ] as Action[];
    });
    const source: CommandSource = {
      id: "docs",
      heading: "Search docs",
      search,
    };
    render(
      <Harness
        open
        sources={[source]}
        actions={[
          { id: "ignored", label: "Static row", group: "Static", run: () => {} },
        ]}
      />,
    );

    const input = await screen.findByPlaceholderText("Search…");
    fireEvent.change(input, { target: { value: "billing" } });

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith("billing", expect.any(AbortSignal));
    });
    await waitFor(() => {
      expect(screen.getByText("Invoices and receipts")).toBeVisible();
    });
    expect(screen.getByText("Search docs")).toBeVisible();
  });

  it("aborts in-flight source requests when the query changes", async () => {
    const aborted: string[] = [];
    const source: CommandSource = {
      id: "docs",
      search: (query, signal) =>
        new Promise<Action[]>((resolve, reject) => {
          // Long delay so the abort always lands first.
          const t = setTimeout(() => resolve([]), 5000);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            aborted.push(query);
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    };

    render(
      <Harness
        open
        sources={[source]}
        actions={[
          { id: "noop", label: "Noop", group: "Test", run: () => {} },
        ]}
      />,
    );
    const input = await screen.findByPlaceholderText("Search…");

    fireEvent.change(input, { target: { value: "first" } });
    // Wait for the debounce to elapse + the source to fire the search.
    await waitFor(() => expect(aborted).toEqual([])); // sanity: not aborted yet
    await new Promise((r) => setTimeout(r, 80));
    fireEvent.change(input, { target: { value: "second" } });
    await waitFor(() => expect(aborted).toContain("first"));
  });

  it("shows a Recent group on reopen for the most recently invoked action", async () => {
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
              { id: "go.inbox", label: "Go to inbox", group: "Nav", run: handler },
              { id: "go.archive", label: "Go to archive", group: "Nav", run: () => {} },
            ]}
          />
        </>
      );
    }

    render(<Controlled />);
    fireEvent.click(await screen.findByText("Go to inbox"));
    await waitFor(() => expect(handler).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "reopen" }));
    expect(await screen.findByText("Recent")).toBeInTheDocument();
    // The recent action shows under "Recent" (and is suppressed from "Nav").
    expect(screen.getAllByText("Go to inbox")).toHaveLength(1);
  });
});
