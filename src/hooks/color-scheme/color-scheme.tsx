import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ColorScheme = "light" | "dark";
export type UserSpecifiedColorScheme = "light" | "dark" | "system";

const DEFAULT_STORAGE_KEY = "color-scheme";
const DEFAULT_ATTRIBUTE_NAME = "data-theme";
const DEFAULT_FALLBACK: ColorScheme = "light";
const DARK_SCHEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const SUPPORTED_USER_VALUES = new Set<string>(["light", "dark", "system"]);

export function getBrowserPreferredColorScheme(): ColorScheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DEFAULT_FALLBACK;
  }
  return window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches ? "dark" : "light";
}

export interface ColorSchemeResolver {
  getCustomizedColorScheme(): Promise<UserSpecifiedColorScheme | null>;
  setCustomizedColorScheme(
    colorScheme: UserSpecifiedColorScheme | null,
  ): Promise<void>;
}

export interface LocalStorageColorSchemeResolverOptions {
  storageKey?: string;
  storage?: Storage;
}

export class LocalStorageColorSchemeResolver implements ColorSchemeResolver {
  private readonly storageKey: string;
  private readonly storage: Storage | null;

  constructor(options: LocalStorageColorSchemeResolverOptions = {}) {
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.storage =
      options.storage ??
      (typeof globalThis !== "undefined" && "localStorage" in globalThis
        ? (globalThis as { localStorage?: Storage }).localStorage ?? null
        : null);
  }

  async getCustomizedColorScheme(): Promise<UserSpecifiedColorScheme | null> {
    if (!this.storage) return "system";
    const raw = (this.storage.getItem(this.storageKey) ?? "").toLowerCase();
    return SUPPORTED_USER_VALUES.has(raw)
      ? (raw as UserSpecifiedColorScheme)
      : "system";
  }

  async setCustomizedColorScheme(
    colorScheme: UserSpecifiedColorScheme | null,
  ): Promise<void> {
    if (!this.storage) return;
    if (colorScheme == null || colorScheme === "system") {
      this.storage.removeItem(this.storageKey);
    } else {
      this.storage.setItem(this.storageKey, colorScheme);
    }
  }
}

export type ColorSchemeStrategy =
  | "data-attribute"
  | "class"
  | "both"
  | ((scheme: ColorScheme) => void);

export interface ColorSchemeContextValue {
  /** Resolved color scheme. Non-null from first render via the system query. */
  colorScheme: ColorScheme | null;
  /** True while the persisted user choice is being resolved or written. */
  isLoading: boolean;
  /** The user's choice: 'light', 'dark', or 'system'. */
  userSpecifiedColorScheme: UserSpecifiedColorScheme;
  /** The OS-level preferred scheme, or null if unavailable (SSR). */
  systemColorScheme: ColorScheme | null;
  /** Persist a new user choice. Awaitable. Passing null is treated as 'system'. */
  setColorScheme: (value: UserSpecifiedColorScheme | null) => Promise<void>;
  /** Alias of `setColorScheme` for SWR-style ergonomics. */
  mutate: (value: UserSpecifiedColorScheme | null) => Promise<void>;
}

const ColorSchemeContext = createContext<ColorSchemeContextValue | undefined>(
  undefined,
);
ColorSchemeContext.displayName = "ColorSchemeContext";

export interface ColorSchemeProviderProps {
  colorSchemeResolver?: ColorSchemeResolver;
  /** How the resolved scheme is applied to the DOM. Default: "data-attribute". */
  strategy?: ColorSchemeStrategy;
  /** DOM target for "data-attribute"/"class"/"both" strategies. Default: <html>. */
  target?: HTMLElement;
  /** Attribute name used by "data-attribute" and "both". Default: "data-theme". */
  attributeName?: string;
}

function applyToDom(
  scheme: ColorScheme,
  strategy: ColorSchemeStrategy,
  target: HTMLElement,
  attributeName: string,
): void {
  if (typeof strategy === "function") {
    strategy(scheme);
    return;
  }
  if (strategy === "data-attribute" || strategy === "both") {
    target.setAttribute(attributeName, scheme);
  }
  if (strategy === "class" || strategy === "both") {
    target.classList.remove("light", "dark");
    target.classList.add(scheme);
  }
}

function readSystemScheme(): ColorScheme | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches ? "dark" : "light";
}

export function ColorSchemeProvider({
  children,
  colorSchemeResolver,
  strategy = "data-attribute",
  target,
  attributeName = DEFAULT_ATTRIBUTE_NAME,
}: PropsWithChildren<ColorSchemeProviderProps>) {
  const resolver = useMemo<ColorSchemeResolver | null>(() => {
    if (colorSchemeResolver) return colorSchemeResolver;
    if (typeof window === "undefined") return null;
    return new LocalStorageColorSchemeResolver();
  }, [colorSchemeResolver]);

  const [systemColorScheme, setSystemColorScheme] = useState<ColorScheme | null>(
    () => readSystemScheme(),
  );
  const [userSpecifiedColorScheme, setUserSpecifiedColorScheme] =
    useState<UserSpecifiedColorScheme>("system");
  const [isLoading, setIsLoading] = useState(true);

  const warnedMissingSystemRef = useRef(false);
  useEffect(() => {
    if (systemColorScheme == null && !warnedMissingSystemRef.current) {
      warnedMissingSystemRef.current = true;
      console.error(
        `Unable to determine system color scheme, defaulting to '${DEFAULT_FALLBACK}'`,
      );
    }
  }, [systemColorScheme]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = await resolver?.getCustomizedColorScheme();
        if (cancelled) return;
        setUserSpecifiedColorScheme(stored ?? "system");
      } catch (error) {
        console.error("Failed to load user-specified color scheme", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [resolver]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(DARK_SCHEME_MEDIA_QUERY);
    const handle = (event: MediaQueryListEvent | { matches: boolean }) => {
      setSystemColorScheme(event.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handle as (e: MediaQueryListEvent) => void);
    return () => {
      mql.removeEventListener("change", handle as (e: MediaQueryListEvent) => void);
    };
  }, []);

  const resolvedColorScheme = useMemo<ColorScheme | null>(() => {
    if (userSpecifiedColorScheme === "system") {
      return systemColorScheme ?? DEFAULT_FALLBACK;
    }
    return userSpecifiedColorScheme;
  }, [userSpecifiedColorScheme, systemColorScheme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (resolvedColorScheme == null) return;
    const el = target ?? document.documentElement;
    applyToDom(resolvedColorScheme, strategy, el, attributeName);
  }, [resolvedColorScheme, strategy, target, attributeName]);

  const setColorScheme = useCallback(
    async (value: UserSpecifiedColorScheme | null) => {
      const next = value ?? "system";
      setIsLoading(true);
      setUserSpecifiedColorScheme(next);
      try {
        await resolver?.setCustomizedColorScheme(value);
      } catch (error) {
        console.error("Failed to persist color scheme", error);
      } finally {
        setIsLoading(false);
      }
    },
    [resolver],
  );

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      colorScheme: resolvedColorScheme,
      isLoading,
      userSpecifiedColorScheme,
      systemColorScheme,
      setColorScheme,
      mutate: setColorScheme,
    }),
    [
      resolvedColorScheme,
      isLoading,
      userSpecifiedColorScheme,
      systemColorScheme,
      setColorScheme,
    ],
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme(): ColorSchemeContextValue {
  const context = useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context;
}
