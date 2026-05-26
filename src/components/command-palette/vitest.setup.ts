import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom 29 + the worktree's vitest combo doesn't reliably expose
// `window.localStorage` even with a URL set in environmentOptions —
// the property is missing entirely. Install a small in-memory shim so
// the recents tests can read what the palette writes. (`localStorage`
// is also exposed as a global alias matching the browser shape.)
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const fakeStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: fakeStorage,
    configurable: true,
    writable: true,
  });
}

// jsdom doesn't ship ResizeObserver. cmdk uses one to track its list
// height for the `--cmdk-list-height` CSS variable. The variable isn't
// observable from tests, so a no-op polyfill is enough.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom's HTMLElement has no `scrollIntoView`. cmdk calls it when an item
// becomes selected to keep it in view; in tests that's a no-op.
if (typeof Element !== 'undefined' && !('scrollIntoView' in Element.prototype)) {
  (Element.prototype as Element & { scrollIntoView: () => void }).scrollIntoView = function () {};
}

afterEach(() => {
  cleanup();
});
