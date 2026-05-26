import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockMatchMedia, type MockMediaQueryList } from './vitest.setup';
import {
  ColorSchemeProvider,
  type ColorSchemeResolver,
  LocalStorageColorSchemeResolver,
  configureColorScheme,
  useColorScheme,
  type UserSpecifiedColorScheme,
  _resetDefaultColorSchemeStore,
} from './color-scheme';
import { getColorSchemeFoucScript } from './fouc-blocker';

let mql: MockMediaQueryList;

beforeEach(() => {
  mql = mockMatchMedia(false);
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.documentElement.removeAttribute('data-color-mode');
  document.documentElement.className = '';
  localStorage.clear();
  _resetDefaultColorSchemeStore();
});

describe('LocalStorageColorSchemeResolver', () => {
  test("returns 'system' when storage is empty", async () => {
    const resolver = new LocalStorageColorSchemeResolver();
    expect(await resolver.getCustomizedColorScheme()).toBe('system');
  });

  test("returns 'light' when 'light' is stored", async () => {
    localStorage.setItem('color-scheme', 'light');
    const resolver = new LocalStorageColorSchemeResolver();
    expect(await resolver.getCustomizedColorScheme()).toBe('light');
  });

  test("returns 'dark' when 'dark' is stored", async () => {
    localStorage.setItem('color-scheme', 'dark');
    const resolver = new LocalStorageColorSchemeResolver();
    expect(await resolver.getCustomizedColorScheme()).toBe('dark');
  });

  test("returns 'system' for unrecognized stored value", async () => {
    localStorage.setItem('color-scheme', 'purple');
    const resolver = new LocalStorageColorSchemeResolver();
    expect(await resolver.getCustomizedColorScheme()).toBe('system');
  });

  test('reads stored value case-insensitively', async () => {
    localStorage.setItem('color-scheme', 'DARK');
    const resolver = new LocalStorageColorSchemeResolver();
    expect(await resolver.getCustomizedColorScheme()).toBe('dark');
  });

  test("setCustomizedColorScheme('dark') writes the key", async () => {
    const resolver = new LocalStorageColorSchemeResolver();
    await resolver.setCustomizedColorScheme('dark');
    expect(localStorage.getItem('color-scheme')).toBe('dark');
  });

  test("setCustomizedColorScheme('system') removes the key (does not store 'system')", async () => {
    localStorage.setItem('color-scheme', 'dark');
    const resolver = new LocalStorageColorSchemeResolver();
    await resolver.setCustomizedColorScheme('system');
    expect(localStorage.getItem('color-scheme')).toBeNull();
  });

  test('setCustomizedColorScheme(null) removes the key', async () => {
    localStorage.setItem('color-scheme', 'dark');
    const resolver = new LocalStorageColorSchemeResolver();
    await resolver.setCustomizedColorScheme(null);
    expect(localStorage.getItem('color-scheme')).toBeNull();
  });

  test('honors a custom storageKey option', async () => {
    const resolver = new LocalStorageColorSchemeResolver({ storageKey: 'my-app:theme' });
    await resolver.setCustomizedColorScheme('dark');
    expect(localStorage.getItem('my-app:theme')).toBe('dark');
    expect(localStorage.getItem('color-scheme')).toBeNull();
    expect(await resolver.getCustomizedColorScheme()).toBe('dark');
  });

  test('honors a custom Storage option', async () => {
    const data = new Map<string, string>();
    const customStorage: Storage = {
      get length() {
        return data.size;
      },
      clear: () => data.clear(),
      getItem: (k) => data.get(k) ?? null,
      key: (i) => Array.from(data.keys())[i] ?? null,
      removeItem: (k) => {
        data.delete(k);
      },
      setItem: (k, v) => {
        data.set(k, v);
      },
    };
    const resolver = new LocalStorageColorSchemeResolver({ storage: customStorage });
    await resolver.setCustomizedColorScheme('dark');
    expect(data.get('color-scheme')).toBe('dark');
    expect(localStorage.getItem('color-scheme')).toBeNull();
    expect(await resolver.getCustomizedColorScheme()).toBe('dark');
  });

  test("subscribe fires the callback on a 'storage' event for the matching key", () => {
    const resolver = new LocalStorageColorSchemeResolver();
    const cb = vi.fn();
    const unsubscribe = resolver.subscribe!(cb);

    window.dispatchEvent(new StorageEvent('storage', { key: 'color-scheme' }));
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: 'color-scheme' }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("subscribe ignores 'storage' events for other keys", () => {
    const resolver = new LocalStorageColorSchemeResolver();
    const cb = vi.fn();
    resolver.subscribe!(cb);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }));
    expect(cb).not.toHaveBeenCalled();
  });

  test('subscribe fires when the storage event has key=null (clear())', () => {
    const resolver = new LocalStorageColorSchemeResolver();
    const cb = vi.fn();
    resolver.subscribe!(cb);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('subscribe respects a custom storageKey', () => {
    const resolver = new LocalStorageColorSchemeResolver({ storageKey: 'my-key' });
    const cb = vi.fn();
    resolver.subscribe!(cb);
    window.dispatchEvent(new StorageEvent('storage', { key: 'color-scheme' }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: 'my-key' }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('useColorScheme — standalone (no provider, default singleton)', () => {
  test('works without a provider; mirrors the OS preference initially', async () => {
    mql.matches = true;
    const { result } = renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.userSpecifiedColorScheme).toBe('system');
    expect(result.current.colorScheme).toBe('dark');
    expect(result.current.systemColorScheme).toBe('dark');
  });

  test('setColorScheme persists and updates the resolved scheme', async () => {
    const { result } = renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.setColorScheme('dark');
    });
    expect(result.current.userSpecifiedColorScheme).toBe('dark');
    expect(result.current.colorScheme).toBe('dark');
    expect(localStorage.getItem('color-scheme')).toBe('dark');
  });

  test('two hook consumers share state', async () => {
    const renderA = renderHook(() => useColorScheme());
    const renderB = renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await renderA.result.current.setColorScheme('dark');
    });
    expect(renderA.result.current.colorScheme).toBe('dark');
    expect(renderB.result.current.colorScheme).toBe('dark');
  });

  test('default DOM application adds the resolved class to <html>', async () => {
    mql.matches = true;
    renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('configureColorScheme overrides defaults if called before first hook use', async () => {
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'dark' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    configureColorScheme({
      resolver: stub,
      strategy: 'data-attribute',
      attributeName: 'data-mode',
    });
    const { result } = renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(stub.getCustomizedColorScheme).toHaveBeenCalled();
    expect(result.current.colorScheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  test('configureColorScheme called after the store was used warns and is ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderHook(() => useColorScheme());
    await act(async () => {
      await Promise.resolve();
    });
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'dark' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    configureColorScheme({ resolver: stub });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(stub.getCustomizedColorScheme).not.toHaveBeenCalled();
  });

  test('provider takes precedence over the singleton when present', async () => {
    const providerStub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'dark' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    function Probed() {
      const { colorScheme } = useColorScheme();
      return <span data-testid="cs">{colorScheme ?? 'null'}</span>;
    }
    render(
      <ColorSchemeProvider colorSchemeResolver={providerStub}>
        <Probed />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('cs')).toHaveTextContent('dark');
    expect(providerStub.getCustomizedColorScheme).toHaveBeenCalled();
  });
});

function Probe() {
  const { colorScheme, isLoading, userSpecifiedColorScheme, systemColorScheme } = useColorScheme();
  return (
    <div>
      <span data-testid="color-scheme">{colorScheme ?? 'null'}</span>
      <span data-testid="is-loading">{String(isLoading)}</span>
      <span data-testid="user-choice">{userSpecifiedColorScheme}</span>
      <span data-testid="system">{systemColorScheme ?? 'null'}</span>
    </div>
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ColorSchemeProvider — defaults', () => {
  test("default mount: user='system', colorScheme matches OS, isLoading clears after resolver", async () => {
    mql.matches = false;
    render(
      <ColorSchemeProvider>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('system');
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('light');
    expect(screen.getByTestId('system')).toHaveTextContent('light');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  test('caller-supplied resolver is actually used (regression: bug #1)', async () => {
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'dark' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(stub.getCustomizedColorScheme).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
    expect(screen.getByTestId('user-choice')).toHaveTextContent('dark');
  });
});

describe('ColorSchemeProvider — setColorScheme', () => {
  test("setColorScheme('dark') updates user choice and persists via resolver", async () => {
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'system' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    function Setter() {
      const { setColorScheme, userSpecifiedColorScheme, colorScheme } = useColorScheme();
      return (
        <>
          <button onClick={() => void setColorScheme('dark')}>set-dark</button>
          <span data-testid="user-choice">{userSpecifiedColorScheme}</span>
          <span data-testid="color-scheme">{colorScheme ?? 'null'}</span>
        </>
      );
    }
    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Setter />
      </ColorSchemeProvider>
    );
    await flush();
    await act(async () => {
      screen.getByText('set-dark').click();
    });
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('dark');
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
    expect(stub.setCustomizedColorScheme).toHaveBeenCalledWith('dark');
  });

  test("setColorScheme('system') removes from storage", async () => {
    localStorage.setItem('color-scheme', 'dark');
    function Setter() {
      const { setColorScheme, userSpecifiedColorScheme } = useColorScheme();
      return (
        <>
          <button onClick={() => void setColorScheme('system')}>set-system</button>
          <span data-testid="user-choice">{userSpecifiedColorScheme}</span>
        </>
      );
    }
    render(
      <ColorSchemeProvider>
        <Setter />
      </ColorSchemeProvider>
    );
    await flush();
    await act(async () => {
      screen.getByText('set-system').click();
    });
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('system');
    expect(localStorage.getItem('color-scheme')).toBeNull();
  });

  test("setColorScheme(null) is treated as 'system'", async () => {
    function Setter() {
      const { setColorScheme, userSpecifiedColorScheme } = useColorScheme();
      return (
        <>
          <button onClick={() => void setColorScheme(null)}>set-null</button>
          <span data-testid="user-choice">{userSpecifiedColorScheme}</span>
        </>
      );
    }
    render(
      <ColorSchemeProvider>
        <Setter />
      </ColorSchemeProvider>
    );
    await flush();
    await act(async () => {
      screen.getByText('set-null').click();
    });
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('system');
  });
});

describe('ColorSchemeProvider — OS theme changes', () => {
  test("OS change with user='system' updates colorScheme", async () => {
    mql.matches = false;
    render(
      <ColorSchemeProvider>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('light');

    await act(async () => {
      mql.dispatchEvent({ matches: true });
    });
    await flush();
    expect(screen.getByTestId('system')).toHaveTextContent('dark');
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
  });

  test('OS change with explicit user choice does not change resolved scheme', async () => {
    localStorage.setItem('color-scheme', 'light');
    mql.matches = false;
    render(
      <ColorSchemeProvider>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('light');

    await act(async () => {
      mql.dispatchEvent({ matches: true });
    });
    await flush();
    expect(screen.getByTestId('system')).toHaveTextContent('dark');
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('light');
  });
});

describe('ColorSchemeProvider — resolver subscribe (cross-tab sync)', () => {
  test('re-reads user choice when the resolver notifies', async () => {
    let notify: (() => void) | null = null;
    let stored: UserSpecifiedColorScheme = 'system';
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => stored),
      setCustomizedColorScheme: vi.fn(async () => {}),
      subscribe: (cb: () => void) => {
        notify = cb;
        return () => {
          notify = null;
        };
      },
    };

    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('system');

    stored = 'dark';
    await act(async () => {
      notify!();
    });
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('dark');
    expect(screen.getByTestId('color-scheme')).toHaveTextContent('dark');
  });

  test("calls subscribe's unsubscribe on unmount", async () => {
    const unsubscribe = vi.fn();
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'system' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
      subscribe: vi.fn(() => unsubscribe),
    };
    const { unmount } = render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(stub.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test('works when the resolver does not implement subscribe', async () => {
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'system' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(screen.getByTestId('user-choice')).toHaveTextContent('system');
  });
});

describe('ColorSchemeProvider — DOM application strategies', () => {
  test('data-attribute strategy sets dataset.theme', async () => {
    mql.matches = true;
    render(
      <ColorSchemeProvider strategy="data-attribute">
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('class strategy adds correct class and removes the wrong one', async () => {
    document.documentElement.classList.add('light');
    mql.matches = true;
    render(
      <ColorSchemeProvider strategy="class">
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);

    await act(async () => {
      mql.dispatchEvent({ matches: false });
    });
    await flush();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  test('function strategy is called with the resolved scheme on each change', async () => {
    const apply = vi.fn();
    mql.matches = false;
    render(
      <ColorSchemeProvider strategy={apply}>
        <Probe />
      </ColorSchemeProvider>
    );
    await flush();
    expect(apply).toHaveBeenCalledWith('light');

    await act(async () => {
      mql.dispatchEvent({ matches: true });
    });
    await flush();
    expect(apply).toHaveBeenCalledWith('dark');
  });
});

describe('ColorSchemeProvider — async setColorScheme (regression: bug #4)', () => {
  test('setColorScheme returns a Promise that resolves only after the resolver settles', async () => {
    let resolveSet: (() => void) | null = null;
    let resolverSettled = false;
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'system' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(
        () =>
          new Promise<void>((r) => {
            resolveSet = () => {
              resolverSettled = true;
              r();
            };
          })
      ),
    };

    let setFn: ((v: UserSpecifiedColorScheme | null) => Promise<void>) | null = null;
    function Capture() {
      const { setColorScheme } = useColorScheme();
      setFn = setColorScheme;
      return null;
    }
    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Capture />
      </ColorSchemeProvider>
    );
    await flush();

    let settled = false;
    let settlePromise!: Promise<void>;
    await act(async () => {
      settlePromise = setFn!('dark').then(() => {
        settled = true;
      });
      await Promise.resolve();
    });
    expect(settled).toBe(false);
    expect(resolverSettled).toBe(false);

    await act(async () => {
      resolveSet!();
      await settlePromise;
    });
    expect(settled).toBe(true);
  });

  test('isLoading does not flip on setColorScheme calls (no spinner flicker)', async () => {
    const stub: ColorSchemeResolver = {
      getCustomizedColorScheme: vi.fn(async () => 'system' as UserSpecifiedColorScheme),
      setCustomizedColorScheme: vi.fn(async () => {}),
    };
    let setFn: ((v: UserSpecifiedColorScheme | null) => Promise<void>) | null = null;
    const loadingValues: boolean[] = [];
    function Capture() {
      const { setColorScheme, isLoading } = useColorScheme();
      setFn = setColorScheme;
      loadingValues.push(isLoading);
      return null;
    }
    render(
      <ColorSchemeProvider colorSchemeResolver={stub}>
        <Capture />
      </ColorSchemeProvider>
    );
    await flush();
    const sinceInitialLoad = loadingValues.length;

    await act(async () => {
      await setFn!('dark');
    });
    await flush();

    const afterSet = loadingValues.slice(sinceInitialLoad);
    expect(afterSet.every((v) => v === false)).toBe(true);
  });
});

describe('getColorSchemeFoucScript', () => {
  test('returns a string referencing matchMedia, localStorage, and the default storage key', () => {
    const script = getColorSchemeFoucScript();
    expect(script).toContain('prefers-color-scheme: dark');
    expect(script).toContain('localStorage');
    expect(script).toContain('color-scheme');
  });

  test("script applies the stored scheme to <html> when eval'd (default class strategy)", () => {
    localStorage.setItem('color-scheme', 'dark');
    const script = getColorSchemeFoucScript();
    eval(script);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('script falls back to matchMedia when storage is empty', () => {
    mql.matches = true;
    const script = getColorSchemeFoucScript();
    eval(script);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('respects custom options', () => {
    localStorage.setItem('my-key', 'light');
    const script = getColorSchemeFoucScript({
      storageKey: 'my-key',
      strategy: 'data-attribute',
      attributeName: 'data-color-mode',
    });
    eval(script);
    expect(document.documentElement.getAttribute('data-color-mode')).toBe('light');
  });

  test('data-attribute strategy sets the configured attribute', () => {
    localStorage.setItem('color-scheme', 'dark');
    const script = getColorSchemeFoucScript({ strategy: 'data-attribute' });
    eval(script);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('class strategy applies correct class', () => {
    localStorage.setItem('color-scheme', 'dark');
    const script = getColorSchemeFoucScript({ strategy: 'class' });
    eval(script);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
