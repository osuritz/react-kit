import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

// useLayoutEffect emits a dev warning under SSR; fall back to useEffect on
// the server. Both are no-ops there — only the warning differs.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type Action = {
  id: string;                    // stable, e.g. "nav.settings"
  label: string;                 // shown in palette
  group?: string;                // "Navigation", "Settings", ...
  keywords?: string[];           // extra fuzzy-match terms
  shortcut?: string | string[];  // "mod+k", "g i", ["mod+s","ctrl+s"]
  scope?: string;                // "global" (default) | route/component scope id
  enabled?: () => boolean;
  run: (ctx: { event?: KeyboardEvent }) => void | Promise<void>;
  icon?: ReactNode;
};

export interface ActionsContextValue {
  /** Add an action to the registry. Returns an idempotent unregister fn. */
  register: (action: Action) => () => void;
  /** Snapshot of all registered actions. Identity is stable until the next mutation. */
  getAll: () => Action[];
  /** Look up a single action by id without scanning the snapshot. */
  getById: (id: string) => Action | undefined;
  /** Subscribe to mutations. Returns an unsubscribe fn. */
  subscribe: (listener: () => void) => () => void;
}

class ActionRegistry {
  private readonly entries = new Map<string, Action>();
  private readonly subscribers = new Set<() => void>();
  private snapshot: Action[] = [];

  register = (action: Action): (() => void) => {
    if (this.entries.has(action.id)) {
      console.warn(
        `ActionRegistry: action id "${action.id}" is already registered; overwriting. Two components registering the same id is almost always a bug.`,
      );
    }
    this.entries.set(action.id, action);
    this.invalidateAndNotify();

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      // Only delete if our entry is still the one in the map — guards against
      // a re-register having replaced us before we ran.
      if (this.entries.get(action.id) === action) {
        this.entries.delete(action.id);
        this.invalidateAndNotify();
      }
    };
  };

  getAll = (): Action[] => this.snapshot;

  getById = (id: string): Action | undefined => this.entries.get(id);

  subscribe = (listener: () => void): (() => void) => {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  };

  private invalidateAndNotify(): void {
    this.snapshot = Array.from(this.entries.values());
    this.subscribers.forEach((cb) => cb());
  }
}

const ActionsContext = createContext<ActionRegistry | null>(null);
ActionsContext.displayName = "ActionsContext";

export function ActionsProvider({ children }: PropsWithChildren<unknown>) {
  const registryRef = useRef<ActionRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = new ActionRegistry();
  }
  return (
    <ActionsContext.Provider value={registryRef.current}>
      {children}
    </ActionsContext.Provider>
  );
}

export function useActions(): ActionsContextValue {
  const registry = useContext(ActionsContext);
  if (!registry) {
    throw new Error("useActions must be used inside <ActionsProvider>.");
  }
  // The registry's methods are stable bound members, so this object can be
  // memoized once per provider — consumers that destructure won't see new
  // identities on every render.
  return useMemo<ActionsContextValue>(
    () => ({
      register: registry.register,
      getAll: registry.getAll,
      getById: registry.getById,
      subscribe: registry.subscribe,
    }),
    [registry],
  );
}

/**
 * Register an action for the lifetime of the calling component.
 * Identity is keyed by `action.id` — re-renders that change other fields
 * (run, label, etc.) do NOT re-register; the registered entry reads those
 * fields through a live ref so consumers always see the latest *committed*
 * value.
 *
 * The ref is updated in a layout effect (not during render) so concurrent
 * renders that get discarded — e.g. a low-priority transition interrupted
 * by a higher-priority update — do not leak uncommitted field values to
 * consumers reading through the live wrapper.
 */
export function useAction(action: Action): void {
  const { register } = useActions();
  const ref = useRef(action);
  useIsomorphicLayoutEffect(() => {
    ref.current = action;
  });

  useEffect(() => {
    const live: Action = {
      id: action.id,
      get label() {
        return ref.current.label;
      },
      get group() {
        return ref.current.group;
      },
      get keywords() {
        return ref.current.keywords;
      },
      get shortcut() {
        return ref.current.shortcut;
      },
      get scope() {
        return ref.current.scope;
      },
      get icon() {
        return ref.current.icon;
      },
      get enabled() {
        return ref.current.enabled;
      },
      run: (ctx) => ref.current.run(ctx),
    };
    return register(live);
  }, [register, action.id]);
}
