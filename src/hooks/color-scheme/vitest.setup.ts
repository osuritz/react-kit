import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const memoryLocalStorage = new MemoryStorage();
Object.defineProperty(window, "localStorage", {
  value: memoryLocalStorage,
  writable: true,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: memoryLocalStorage,
  writable: true,
  configurable: true,
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("class");
  memoryLocalStorage.clear();
  vi.restoreAllMocks();
});

export interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: (event: { matches: boolean }) => boolean;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
}

export function mockMatchMedia(initialMatches: boolean): MockMediaQueryList {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql: MockMediaQueryList = {
    matches: initialMatches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn((_evt: string, cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_evt: string, cb: (e: { matches: boolean }) => void) => {
      listeners.delete(cb);
    }),
    dispatchEvent: (event: { matches: boolean }) => {
      mql.matches = event.matches;
      listeners.forEach((cb) => cb(event));
      return true;
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn(() => mql),
    writable: true,
    configurable: true,
  });
  return mql;
}
