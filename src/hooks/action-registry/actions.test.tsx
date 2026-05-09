import { act, render, renderHook, screen } from "@testing-library/react";
import {
  StrictMode,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  type Action,
  type ActionsContextValue,
  ActionsProvider,
  useAction,
  useActions,
} from "./actions";

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: "test.action",
    label: "Test action",
    run: vi.fn(),
    ...overrides,
  };
}

function ProviderWrapper({ children }: { children: ReactNode }) {
  return <ActionsProvider>{children}</ActionsProvider>;
}

function renderUseActions() {
  return renderHook<ActionsContextValue, void>(() => useActions(), {
    wrapper: ProviderWrapper,
  });
}

describe("ActionRegistry — register / getAll / subscribe", () => {
  it("register adds an action and getAll reflects it", () => {
    const { result } = renderUseActions();
    const a = makeAction({ id: "a", label: "A" });
    act(() => {
      result.current.register(a);
    });
    expect(result.current.getAll()).toEqual([a]);
  });

  it("unregister removes the action; double-unregister is a no-op", () => {
    const { result } = renderUseActions();
    let unregister: () => void = () => {};
    act(() => {
      unregister = result.current.register(makeAction({ id: "a" }));
    });
    expect(result.current.getAll()).toHaveLength(1);
    act(() => unregister());
    expect(result.current.getAll()).toHaveLength(0);
    expect(() => act(() => unregister())).not.toThrow();
    expect(result.current.getAll()).toHaveLength(0);
  });

  it("subscribe fires on register and unregister; unsubscribe detaches", () => {
    const { result } = renderUseActions();
    const listener = vi.fn();
    let unsubscribe: () => void = () => {};
    act(() => {
      unsubscribe = result.current.subscribe(listener);
    });
    let unregister: () => void = () => {};
    act(() => {
      unregister = result.current.register(makeAction({ id: "a" }));
    });
    expect(listener).toHaveBeenCalledTimes(1);
    act(() => unregister());
    expect(listener).toHaveBeenCalledTimes(2);
    act(() => unsubscribe());
    act(() => {
      result.current.register(makeAction({ id: "b" }));
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("re-registering the same id warns and overwrites", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderUseActions();
    const first = makeAction({ id: "dup", label: "first" });
    const second = makeAction({ id: "dup", label: "second" });
    act(() => {
      result.current.register(first);
    });
    let unregisterSecond: () => void = () => {};
    act(() => {
      unregisterSecond = result.current.register(second);
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(result.current.getAll()).toEqual([second]);
    act(() => unregisterSecond());
    expect(result.current.getAll()).toEqual([]);
  });

  it("the first registration's stale unregister fn does not delete a replacement", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderUseActions();
    const first = makeAction({ id: "dup", label: "first" });
    const second = makeAction({ id: "dup", label: "second" });
    let unregisterFirst: () => void = () => {};
    act(() => {
      unregisterFirst = result.current.register(first);
    });
    act(() => {
      result.current.register(second);
    });
    act(() => unregisterFirst());
    expect(result.current.getAll()).toEqual([second]);
  });

  it("getAll returns a stable identity until the next mutation", () => {
    const { result } = renderUseActions();
    act(() => {
      result.current.register(makeAction({ id: "a" }));
    });
    const first = result.current.getAll();
    const second = result.current.getAll();
    expect(first).toBe(second);
    act(() => {
      result.current.register(makeAction({ id: "b" }));
    });
    expect(result.current.getAll()).not.toBe(first);
  });
});

describe("useActions outside a provider", () => {
  it("throws a helpful error", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useActions())).toThrow(
      /useActions must be used inside <ActionsProvider>/,
    );
    err.mockRestore();
  });
});

function RegisterAction({ action }: { action: Action }) {
  useAction(action);
  return null;
}

function ListAndRender() {
  const { getAll, subscribe } = useActions();
  const all = useSyncExternalStore(subscribe, getAll, getAll);
  return (
    <ul>
      {all.map((a) => (
        <li key={a.id} data-testid={a.id}>
          {a.label}
        </li>
      ))}
    </ul>
  );
}

function Subscriber({ listener }: { listener: () => void }) {
  const { subscribe } = useActions();
  useEffect(() => subscribe(listener), [subscribe, listener]);
  return null;
}

describe("useAction lifecycle", () => {
  it("registers on mount and unregisters on unmount", () => {
    const action = makeAction({ id: "nav.settings", label: "Settings" });
    const { rerender } = render(
      <ActionsProvider>
        <RegisterAction action={action} />
        <ListAndRender />
      </ActionsProvider>,
    );
    expect(screen.getByTestId("nav.settings")).toHaveTextContent("Settings");
    rerender(
      <ActionsProvider>
        <ListAndRender />
      </ActionsProvider>,
    );
    expect(screen.queryByTestId("nav.settings")).toBeNull();
  });

  it("does not re-register or fire extra subscribe events when non-id fields change", () => {
    const listener = vi.fn();
    const initial = makeAction({ id: "x", label: "first", run: vi.fn() });
    const { rerender } = render(
      <ActionsProvider>
        <Subscriber listener={listener} />
        <RegisterAction action={initial} />
      </ActionsProvider>,
    );
    // 1 notify on mount-register.
    expect(listener).toHaveBeenCalledTimes(1);
    const updated: Action = { ...initial, label: "second", run: vi.fn() };
    rerender(
      <ActionsProvider>
        <Subscriber listener={listener} />
        <RegisterAction action={updated} />
      </ActionsProvider>,
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("invokes the latest run callback even though no re-register happened", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const captured: { current: Action | null } = { current: null };
    function Capture() {
      const { getAll, subscribe } = useActions();
      const all = useSyncExternalStore(subscribe, getAll, getAll);
      useEffect(() => {
        if (all.length > 0) captured.current = all[0];
      });
      return null;
    }
    const action: Action = makeAction({ id: "x", run: first });
    const { rerender } = render(
      <ActionsProvider>
        <RegisterAction action={action} />
        <Capture />
      </ActionsProvider>,
    );
    expect(captured.current).not.toBeNull();
    rerender(
      <ActionsProvider>
        <RegisterAction action={{ ...action, run: second }} />
        <Capture />
      </ActionsProvider>,
    );
    await captured.current!.run({});
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("exposes all Action fields via the live wrapper, reading the latest values", () => {
    const enabled1 = () => true;
    const enabled2 = () => false;
    const icon1 = <span data-testid="icon-1" />;
    const icon2 = <span data-testid="icon-2" />;
    const initial: Action = {
      id: "x",
      label: "L1",
      group: "G1",
      keywords: ["a"],
      shortcut: "mod+1",
      scope: "s1",
      icon: icon1,
      enabled: enabled1,
      run: vi.fn(),
    };
    const captured: { current: Action | null } = { current: null };
    function Capture() {
      const { getAll, subscribe } = useActions();
      const all = useSyncExternalStore(subscribe, getAll, getAll);
      useEffect(() => {
        if (all.length > 0) captured.current = all[0];
      });
      return null;
    }
    const { rerender } = render(
      <ActionsProvider>
        <RegisterAction action={initial} />
        <Capture />
      </ActionsProvider>,
    );
    expect(captured.current).not.toBeNull();
    expect(captured.current!.label).toBe("L1");
    expect(captured.current!.group).toBe("G1");
    expect(captured.current!.keywords).toEqual(["a"]);
    expect(captured.current!.shortcut).toBe("mod+1");
    expect(captured.current!.scope).toBe("s1");
    expect(captured.current!.icon).toBe(icon1);
    expect(captured.current!.enabled).toBe(enabled1);

    const updated: Action = {
      ...initial,
      label: "L2",
      group: "G2",
      keywords: ["b", "c"],
      shortcut: ["mod+2", "ctrl+2"],
      scope: "s2",
      icon: icon2,
      enabled: enabled2,
    };
    rerender(
      <ActionsProvider>
        <RegisterAction action={updated} />
        <Capture />
      </ActionsProvider>,
    );
    expect(captured.current!.label).toBe("L2");
    expect(captured.current!.group).toBe("G2");
    expect(captured.current!.keywords).toEqual(["b", "c"]);
    expect(captured.current!.shortcut).toEqual(["mod+2", "ctrl+2"]);
    expect(captured.current!.scope).toBe("s2");
    expect(captured.current!.icon).toBe(icon2);
    expect(captured.current!.enabled).toBe(enabled2);
  });

  it("re-registers when id changes", () => {
    const listener = vi.fn();
    const a1 = makeAction({ id: "a", label: "a" });
    const a2 = makeAction({ id: "b", label: "b" });
    const { rerender } = render(
      <ActionsProvider>
        <Subscriber listener={listener} />
        <RegisterAction action={a1} />
      </ActionsProvider>,
    );
    expect(listener).toHaveBeenCalledTimes(1);
    rerender(
      <ActionsProvider>
        <Subscriber listener={listener} />
        <RegisterAction action={a2} />
      </ActionsProvider>,
    );
    // Unregister "a" + register "b" = 2 more notifications.
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("survives StrictMode double-mount without losing or duplicating actions", () => {
    render(
      <StrictMode>
        <ActionsProvider>
          <RegisterAction action={makeAction({ id: "s", label: "S" })} />
          <ListAndRender />
        </ActionsProvider>
      </StrictMode>,
    );
    expect(screen.getAllByTestId("s")).toHaveLength(1);
  });
});

describe("provider isolation", () => {
  it("nested providers each own their registry", () => {
    function Count({ testid }: { testid: string }) {
      const { getAll, subscribe } = useActions();
      return (
        <span data-testid={testid}>
          {useSyncExternalStore(subscribe, getAll, getAll).length}
        </span>
      );
    }
    function RegisterIn({ id }: { id: string }) {
      useAction(makeAction({ id }));
      return null;
    }
    render(
      <ActionsProvider>
        <RegisterIn id="outer-1" />
        <Count testid="outer-count" />
        <ActionsProvider>
          <RegisterIn id="inner-1" />
          <RegisterIn id="inner-2" />
          <Count testid="inner-count" />
        </ActionsProvider>
      </ActionsProvider>,
    );
    expect(screen.getByTestId("outer-count")).toHaveTextContent("1");
    expect(screen.getByTestId("inner-count")).toHaveTextContent("2");
  });
});

describe("SSR safety", () => {
  it("renderToString does not throw and produces output", () => {
    function RegisterSSR() {
      useAction(makeAction({ id: "ssr", label: "SSR" }));
      return null;
    }
    const html = renderToString(
      <ActionsProvider>
        <RegisterSSR />
        <span>ok</span>
      </ActionsProvider>,
    );
    expect(html).toContain("ok");
  });
});
