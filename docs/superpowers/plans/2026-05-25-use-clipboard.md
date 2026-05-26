# `use-clipboard` Drop-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hardened, SSR-safe `useClipboard` drop-in hook (copy-to-clipboard with a declarative `text` prop, auto-resetting `copied` state, async + `execCommand` fallback, and before/after callbacks), wired into the docs app with a `<CopyButton>` demo.

**Architecture:** A single `.ts` hook in `src/hooks/use-clipboard/` with its own isolated vitest harness (React 18 devDeps), mirroring the existing `color-scheme` drop-in. `copy`/`reset` are identity-stable via `useCallback([])` reading live props through a render-written ref; `copied`/`error` are `useState`. A mounted ref + generation counter prevent stale/interleaved async writes from corrupting state. `<CopyButton>` is demo-only.

**Tech Stack:** React 18+, TypeScript, Vitest + jsdom + @testing-library/react, Vite docs app, Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-25-use-clipboard-design.md`

---

## File structure

Drop-in (consumer-copied):
- `src/hooks/use-clipboard/use-clipboard.ts` — `useClipboard`, `ClipboardError`, types.
- `src/hooks/use-clipboard/README.md`

Harness (not copied; mirrors `color-scheme`):
- `src/hooks/use-clipboard/package.json`
- `src/hooks/use-clipboard/tsconfig.json`
- `src/hooks/use-clipboard/vitest.config.ts`
- `src/hooks/use-clipboard/vitest.setup.ts`
- `src/hooks/use-clipboard/use-clipboard.test.tsx`

Docs app:
- `app/components/demos/copy-button.tsx` — new demo.
- `app/routes/use-clipboard.tsx` — new route.
- `app/router.tsx` — modify (register route).
- `app/lib/nav.ts` — modify (Hooks group entry).

**All shell commands run from the worktree root:** `/Users/oliviersuritz/dev/react-kit/.claude/worktrees/clipboard`. Harness commands use a subshell `(cd src/hooks/use-clipboard && …)` so the working directory doesn't persist.

---

## Task 1: Harness scaffold + `ClipboardError`

**Files:**
- Create: `src/hooks/use-clipboard/package.json`
- Create: `src/hooks/use-clipboard/tsconfig.json`
- Create: `src/hooks/use-clipboard/vitest.config.ts`
- Create: `src/hooks/use-clipboard/vitest.setup.ts`
- Create: `src/hooks/use-clipboard/use-clipboard.ts`
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

- [ ] **Step 1: Create the harness config files**

`src/hooks/use-clipboard/package.json`:

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitest/coverage-v8": "^2.1.4",
    "jsdom": "^29.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.5.4",
    "vitest": "^2.1.4"
  }
}
```

`src/hooks/use-clipboard/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["*.ts", "*.tsx"]
}
```

> Note: `lib` includes `ES2022` (not `ES2020` like color-scheme) because `ClipboardError` uses the native `Error` `cause` option, which is typed in ES2022's lib.

`src/hooks/use-clipboard/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["use-clipboard.ts"],
      reporter: ["text", "json-summary"],
    },
  },
});
```

`src/hooks/use-clipboard/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Install the harness**

Run: `(cd src/hooks/use-clipboard && npm install)`
Expected: installs into `src/hooks/use-clipboard/node_modules`, no errors.

- [ ] **Step 3: Write the failing test for `ClipboardError`**

Create `src/hooks/use-clipboard/use-clipboard.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { ClipboardError } from "./use-clipboard";

describe("ClipboardError", () => {
  test("carries a reason, message, name, and native cause", () => {
    const cause = new DOMException("denied", "NotAllowedError");
    const err = new ClipboardError("write-failed", "Failed to copy.", { cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ClipboardError");
    expect(err.reason).toBe("write-failed");
    expect(err.message).toBe("Failed to copy.");
    expect(err.cause).toBe(cause);
  });
});
```

- [ ] **Step 4: Run the test, verify it fails**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: FAIL — `ClipboardError` is not exported / module `./use-clipboard` not found.

- [ ] **Step 5: Create `use-clipboard.ts` with the types and `ClipboardError`**

Create `src/hooks/use-clipboard/use-clipboard.ts`:

```ts
import { useCallback, useRef, useState } from "react";

export type ClipboardErrorReason =
  | "not-supported"
  | "insecure-context"
  | "write-failed";

/**
 * Thrown internally and surfaced via `onError` / the `error` result. Uses the
 * native `Error` `cause` option (ES2022+) — we add only `reason` and never
 * redeclare `cause`, so `super(message, { cause })` keeps its own property.
 */
export class ClipboardError extends Error {
  readonly reason: ClipboardErrorReason;
  constructor(
    reason: ClipboardErrorReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ClipboardError";
    this.reason = reason;
  }
}

export interface UseClipboardOptions {
  /** Default payload, so `<CopyButton text={value} />` is fully declarative. */
  text?: string;
  /** ms before `copied` flips back to false. Default 2000. `<= 0` disables auto-reset. */
  timeout?: number;
  /**
   * Runs before the write. Return a string to copy that instead; return
   * `false` (strict) to abort cleanly. Async-aware. A throw/reject aborts and
   * is routed to `onError`.
   */
  onBeforeCopy?: (
    text: string,
  ) => void | false | string | Promise<void | false | string>;
  /** Runs after a successful write. */
  onCopied?: (text: string) => void;
  /** Runs when the copy fails. Never receives a raw DOMException. */
  onError?: (err: ClipboardError) => void;
}

export interface UseClipboardResult {
  /** Copies `override ?? text ?? ""`. Resolves true on success, false on cancel/failure. Never throws. */
  copy: (override?: string) => Promise<boolean>;
  copied: boolean;
  error: ClipboardError | null;
  reset: () => void;
}

const DEFAULT_TIMEOUT = 2000;

// Minimal write path — async Clipboard API only. Task 5 adds the execCommand
// fallback and the full reason logic.
async function writeClipboard(text: string): Promise<void> {
  const asyncAvailable =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";
  if (!asyncAvailable) {
    throw new ClipboardError(
      "not-supported",
      "Clipboard is not available in this environment.",
    );
  }
  await navigator.clipboard.writeText(text);
}

export function useClipboard(
  options: UseClipboardOptions = {},
): UseClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ClipboardError | null>(null);

  // Live ref written synchronously in render so the stable `copy` always sees
  // the latest props (the action-registry live-getter pattern).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    setCopied(false);
    setError(null);
  }, []);

  const copy = useCallback(async (override?: string): Promise<boolean> => {
    const { text, onCopied, onError } = optionsRef.current;
    setError(null);
    try {
      const payload = override ?? text ?? "";
      await writeClipboard(payload);
      setCopied(true);
      onCopied?.(payload);
      return true;
    } catch (raw) {
      const err =
        raw instanceof ClipboardError
          ? raw
          : new ClipboardError("write-failed", "Failed to copy.", { cause: raw });
      setError(err);
      onError?.(err);
      return false;
    }
  }, []);

  return { copy, copied, error, reset };
}
```

- [ ] **Step 6: Run the test, verify it passes**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-clipboard/package.json src/hooks/use-clipboard/package-lock.json src/hooks/use-clipboard/tsconfig.json src/hooks/use-clipboard/vitest.config.ts src/hooks/use-clipboard/vitest.setup.ts src/hooks/use-clipboard/use-clipboard.ts src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "feat(use-clipboard): scaffold harness and ClipboardError (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Core hook — success path, payload override, `onCopied`, stable identity

**Files:**
- Modify: `src/hooks/use-clipboard/use-clipboard.ts` (already has the core; this task verifies it via tests)
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

> The core `copy`/`reset` written in Task 1 already cover this behavior. This task adds the tests that lock it in (they should pass against Task 1's code). If any fail, fix `use-clipboard.ts`.

- [ ] **Step 1: Add the test env helpers and core tests**

Add to the top of `src/hooks/use-clipboard/use-clipboard.test.tsx` (after the existing imports), replacing the import line so it pulls in the testing utilities:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ClipboardError, useClipboard } from "./use-clipboard";

/** Install (or remove, when `writeText` is undefined) a mock async Clipboard API. */
function setClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  // Reset env that individual tests mutate, so state never leaks between tests.
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "isSecureContext", {
    value: true,
    configurable: true,
  });
});
```

Then add this describe block at the end of the file:

```tsx
describe("useClipboard — success path", () => {
  test("copies the text prop via the async clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() => useClipboard({ text: "hello" }));

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(ok).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test("copy(override) copies the override instead of the text prop", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() => useClipboard({ text: "prop" }));

    await act(async () => {
      await result.current.copy("override");
    });

    expect(writeText).toHaveBeenCalledWith("override");
  });

  test("copies the empty string when no text prop and no override", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith("");
  });

  test("calls onCopied once with the written payload", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const onCopied = vi.fn();
    const { result } = renderHook(() => useClipboard({ text: "v", onCopied }));

    await act(async () => {
      await result.current.copy();
    });

    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(onCopied).toHaveBeenCalledWith("v");
  });

  test("copy and reset are referentially stable across prop-changing rerenders", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useClipboard({ text }),
      { initialProps: { text: "a" } },
    );
    const firstCopy = result.current.copy;
    const firstReset = result.current.reset;

    rerender({ text: "b" });

    expect(result.current.copy).toBe(firstCopy);
    expect(result.current.reset).toBe(firstReset);
  });
});
```

- [ ] **Step 2: Run the tests, verify they pass**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (all). If `copy`/`reset` identity is unstable, confirm both `useCallback` dependency arrays are `[]`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "test(use-clipboard): cover success path, override, onCopied, stable identity (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Timer, lifecycle, and concurrency guards

**Files:**
- Modify: `src/hooks/use-clipboard/use-clipboard.ts`
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

- [ ] **Step 1: Write the failing tests (timer + lifecycle + concurrency)**

Add this describe block to the end of `use-clipboard.test.tsx`:

```tsx
describe("useClipboard — timer & lifecycle", () => {
  test("copied auto-resets to false after the default 2000ms", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useClipboard({ text: "v" }));

    await act(async () => {
      await result.current.copy();
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });

  test("honors a custom timeout", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useClipboard({ text: "v", timeout: 500 }));

    await act(async () => {
      await result.current.copy();
    });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  test("a second copy before elapse re-arms the timer (no early flip)", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useClipboard({ text: "v", timeout: 1000 }));

    await act(async () => {
      await result.current.copy();
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await act(async () => {
      await result.current.copy();
    });
    // 800ms after the first copy / 0ms after the second: the original timer
    // must have been cleared, so copied is still true here.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(result.current.copied).toBe(false);
  });

  test("timeout <= 0 disables auto-reset", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useClipboard({ text: "v", timeout: 0 }));

    await act(async () => {
      await result.current.copy();
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.copied).toBe(true);
  });

  test("reset() clears copied, error, and the pending timer", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const { result } = renderHook(() => useClipboard({ text: "v" }));

    await act(async () => {
      await result.current.copy();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("unmounting clears the timer and does not set state after unmount", async () => {
    vi.useFakeTimers();
    let resolveWrite!: () => void;
    const writeText = vi.fn(
      () => new Promise<void>((resolve) => (resolveWrite = resolve)),
    );
    setClipboard(writeText);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result, unmount } = renderHook(() => useClipboard({ text: "v" }));

    let copyPromise!: Promise<boolean>;
    act(() => {
      copyPromise = result.current.copy();
    });
    unmount();
    await act(async () => {
      resolveWrite();
      await copyPromise;
    });

    // No "set state on unmounted component" error was logged.
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("an earlier in-flight write does not clobber a later copy", async () => {
    // First copy resolves slowly; second resolves fast. The first's late
    // resolution must NOT re-set copied/restart its timer.
    let resolveFirst!: () => void;
    const writeText = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((r) => (resolveFirst = r)),
      )
      .mockImplementationOnce(() => Promise.resolve());
    setClipboard(writeText);
    const onCopied = vi.fn();
    const { result } = renderHook(() => useClipboard({ text: "v", onCopied }));

    let firstPromise!: Promise<boolean>;
    act(() => {
      firstPromise = result.current.copy("first");
    });
    await act(async () => {
      await result.current.copy("second");
    });
    expect(onCopied).toHaveBeenLastCalledWith("second");

    await act(async () => {
      resolveFirst();
      await firstPromise;
    });
    // The stale first copy resolved last but must not have fired its callback.
    expect(onCopied).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: FAIL — no auto-reset timer, no unmount cleanup, no generation guard.

- [ ] **Step 3: Add the timer, refs, lifecycle effect, and guards**

In `src/hooks/use-clipboard/use-clipboard.ts`, update the React import to add `useEffect`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
```

Replace the body of `useClipboard` (from `const [copied …` down to the final `return`) with:

```ts
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<ClipboardError | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    // Supersede any in-flight copy so its late resolution can't re-flip state.
    generationRef.current++;
    clearTimer();
    setCopied(false);
    setError(null);
  }, [clearTimer]);

  const copy = useCallback(
    async (override?: string): Promise<boolean> => {
      const { text, timeout, onCopied, onError } = optionsRef.current;
      const generation = ++generationRef.current;
      const isCurrent = () =>
        mountedRef.current && generation === generationRef.current;

      if (mountedRef.current) setError(null);
      try {
        const payload = override ?? text ?? "";
        await writeClipboard(payload);

        if (!isCurrent()) return true;
        clearTimer();
        const ms = timeout ?? DEFAULT_TIMEOUT;
        if (ms > 0) {
          timerRef.current = setTimeout(() => {
            if (mountedRef.current) setCopied(false);
            timerRef.current = null;
          }, ms);
        }
        setCopied(true);
        onCopied?.(payload);
        return true;
      } catch (raw) {
        const err =
          raw instanceof ClipboardError
            ? raw
            : new ClipboardError("write-failed", "Failed to copy.", { cause: raw });
        if (isCurrent()) {
          setError(err);
          onError?.(err);
        }
        return false;
      }
    },
    [clearTimer],
  );

  return { copy, copied, error, reset };
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (all, including Task 2's).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-clipboard/use-clipboard.ts src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "feat(use-clipboard): timer auto-reset, unmount cleanup, concurrency guard (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: `onBeforeCopy` — transform, cancel, throw, ordering

**Files:**
- Modify: `src/hooks/use-clipboard/use-clipboard.ts`
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add this describe block to the end of `use-clipboard.test.tsx`:

```tsx
describe("useClipboard — onBeforeCopy", () => {
  test("returning a string transforms the payload", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() =>
      useClipboard({ text: "raw", onBeforeCopy: (t) => `${t}!` }),
    );

    await act(async () => {
      await result.current.copy();
    });
    expect(writeText).toHaveBeenCalledWith("raw!");
  });

  test("returning an empty string copies '' (not treated as cancel)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() =>
      useClipboard({ text: "raw", onBeforeCopy: () => "" }),
    );

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });
    expect(writeText).toHaveBeenCalledWith("");
    expect(ok).toBe(true);
  });

  test("returning false aborts: no write, no onCopied, no error", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const onCopied = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useClipboard({ text: "v", onBeforeCopy: () => false, onCopied, onError }),
    );

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });
    expect(ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("awaits an async onBeforeCopy before writing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const { result } = renderHook(() =>
      useClipboard({
        text: "raw",
        onBeforeCopy: async (t) => `${t}-async`,
      }),
    );

    await act(async () => {
      await result.current.copy();
    });
    expect(writeText).toHaveBeenCalledWith("raw-async");
  });

  test("a throwing onBeforeCopy routes to onError and never throws", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    const boom = new Error("boom");
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useClipboard({
        text: "v",
        onBeforeCopy: () => {
          throw boom;
        },
        onError,
      }),
    );

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });
    expect(ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0][0] as ClipboardError;
    expect(err.reason).toBe("write-failed");
    expect(err.cause).toBe(boom);
    expect(result.current.error).toBe(err);
  });

  test("onBeforeCopy runs before the write and onCopied after", async () => {
    const order: string[] = [];
    const writeText = vi.fn(async () => {
      order.push("write");
    });
    setClipboard(writeText);
    const { result } = renderHook(() =>
      useClipboard({
        text: "v",
        onBeforeCopy: () => {
          order.push("before");
        },
        onCopied: () => {
          order.push("after");
        },
      }),
    );

    await act(async () => {
      await result.current.copy();
    });
    expect(order).toEqual(["before", "write", "after"]);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: FAIL — `onBeforeCopy` is not invoked yet.

- [ ] **Step 3: Add the before-hook to `copy`**

In `src/hooks/use-clipboard/use-clipboard.ts`, in the `copy` callback, change the destructure to include `onBeforeCopy`, and insert the before-hook block between `if (mountedRef.current) setError(null);` and the write. The `try` block becomes:

```ts
      const { text, timeout, onBeforeCopy, onCopied, onError } = optionsRef.current;
      const generation = ++generationRef.current;
      const isCurrent = () =>
        mountedRef.current && generation === generationRef.current;

      if (mountedRef.current) setError(null);
      try {
        let payload = override ?? text ?? "";

        const transformed = await onBeforeCopy?.(payload);
        if (transformed === false) {
          return false;
        }
        if (typeof transformed === "string") {
          payload = transformed;
        }

        await writeClipboard(payload);

        if (!isCurrent()) return true;
        clearTimer();
        const ms = timeout ?? DEFAULT_TIMEOUT;
        if (ms > 0) {
          timerRef.current = setTimeout(() => {
            if (mountedRef.current) setCopied(false);
            timerRef.current = null;
          }, ms);
        }
        setCopied(true);
        onCopied?.(payload);
        return true;
      } catch (raw) {
        const err =
          raw instanceof ClipboardError
            ? raw
            : new ClipboardError("write-failed", "Failed to copy.", { cause: raw });
        if (isCurrent()) {
          setError(err);
          onError?.(err);
        }
        return false;
      }
```

(`payload` changes from `const` to `let`.)

- [ ] **Step 4: Run the tests, verify they pass**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-clipboard/use-clipboard.ts src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "feat(use-clipboard): onBeforeCopy transform/cancel/throw handling (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: `execCommand` fallback + error reasons

**Files:**
- Modify: `src/hooks/use-clipboard/use-clipboard.ts`
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add this describe block to the end of `use-clipboard.test.tsx`:

```tsx
describe("useClipboard — fallback & error reasons", () => {
  test("falls back to execCommand when the async API is absent", async () => {
    setClipboard(undefined); // no navigator.clipboard
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    const { result } = renderHook(() => useClipboard({ text: "hi" }));

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });

    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);
    // The temporary textarea must be cleaned up.
    expect(document.querySelector("textarea")).toBeNull();
  });

  test("the fallback textarea is readonly and restores prior focus", async () => {
    setClipboard(undefined);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    vi.spyOn(document, "execCommand").mockImplementation(() => {
      const ta = document.querySelector("textarea");
      expect(ta).not.toBeNull();
      expect(ta!.hasAttribute("readonly")).toBe(true);
      return true;
    });

    const { result } = renderHook(() => useClipboard({ text: "hi" }));
    await act(async () => {
      await result.current.copy();
    });

    expect(document.activeElement).toBe(input);
    document.body.removeChild(input);
  });

  test("falls back to execCommand after the async write rejects", async () => {
    setClipboard(vi.fn().mockRejectedValue(new DOMException("no", "NotAllowedError")));
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    const { result } = renderHook(() => useClipboard({ text: "hi" }));

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });

    expect(ok).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(result.current.error).toBeNull();
  });

  test("reason 'not-supported' when no clipboard mechanism exists", async () => {
    setClipboard(undefined);
    // Make execCommand non-callable so no fallback exists.
    Object.defineProperty(document, "execCommand", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useClipboard({ text: "v", onError }));

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.copy();
    });

    expect(ok).toBe(false);
    expect((onError.mock.calls[0][0] as ClipboardError).reason).toBe("not-supported");
    expect(result.current.error?.reason).toBe("not-supported");
  });

  test("reason 'write-failed' (with DOMException cause) when async rejects and fallback fails", async () => {
    const cause = new DOMException("denied", "NotAllowedError");
    setClipboard(vi.fn().mockRejectedValue(cause));
    vi.spyOn(document, "execCommand").mockReturnValue(false);
    const { result } = renderHook(() => useClipboard({ text: "v" }));

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.error?.reason).toBe("write-failed");
    expect(result.current.error?.cause).toBe(cause);
    expect(result.current.copied).toBe(false);
  });

  test("reason 'insecure-context' when async API absent, insecure, and fallback fails", async () => {
    setClipboard(undefined);
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
    });
    vi.spyOn(document, "execCommand").mockReturnValue(false);
    const { result } = renderHook(() => useClipboard({ text: "v" }));

    await act(async () => {
      await result.current.copy();
    });

    expect(result.current.error?.reason).toBe("insecure-context");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: FAIL — the minimal `writeClipboard` only knows the async API and throws `not-supported` whenever `navigator.clipboard` is absent (so the fallback and `write-failed`/`insecure-context` tests fail).

- [ ] **Step 3: Replace `writeClipboard` and add `execCommandCopy`**

In `src/hooks/use-clipboard/use-clipboard.ts`, replace the minimal `writeClipboard` function with the following two functions (keep them above `useClipboard`):

```ts
/** Hardened legacy fallback: hidden readonly textarea + document.execCommand("copy"). */
function execCommandCopy(text: string): boolean {
  if (
    typeof document === "undefined" ||
    typeof document.execCommand !== "function"
  ) {
    return false;
  }
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // readonly stops the iOS soft keyboard from opening on focus.
  textarea.setAttribute("readonly", "");
  // Rendered but out of the way (display:none can't be selected).
  textarea.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;margin:0;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  // iOS Safari needs an explicit range.
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    previouslyFocused?.focus?.();
  }
  return ok;
}

/**
 * Writes `text` to the clipboard, preferring the async API and degrading to
 * execCommand. Throws a ClipboardError on total failure, always preserving the
 * underlying DOMException on `.cause`. `insecure-context` is best-effort: it
 * fires only when the async API was entirely absent and the page is not a
 * secure context.
 */
async function writeClipboard(text: string): Promise<void> {
  const asyncAvailable =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";
  const fallbackAvailable =
    typeof document !== "undefined" &&
    typeof document.execCommand === "function";
  const insecure =
    typeof window !== "undefined" && window.isSecureContext === false;

  if (!asyncAvailable && !fallbackAvailable) {
    throw new ClipboardError(
      "not-supported",
      "Clipboard is not available in this environment.",
    );
  }

  let firstError: unknown;
  if (asyncAvailable) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (e) {
      firstError = e;
    }
  }

  if (fallbackAvailable && execCommandCopy(text)) {
    return;
  }

  if (!asyncAvailable && insecure) {
    throw new ClipboardError(
      "insecure-context",
      "Clipboard write requires a secure context (HTTPS).",
      { cause: firstError },
    );
  }
  throw new ClipboardError("write-failed", "Failed to write to the clipboard.", {
    cause: firstError,
  });
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-clipboard/use-clipboard.ts src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "feat(use-clipboard): execCommand fallback and typed error reasons (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Accessibility test for the recommended button pattern

**Files:**
- Test: `src/hooks/use-clipboard/use-clipboard.test.tsx`

> No hook change — this asserts the a11y pattern the README/demo recommend (accessible name + `aria-live` announcement driven by `copied`).

- [ ] **Step 1: Write the a11y test**

Add `render`, `screen`, and `fireEvent` to the testing-library import at the top of `use-clipboard.test.tsx`:

```tsx
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
```

Then add this describe block to the end of the file:

```tsx
describe("useClipboard — accessibility pattern", () => {
  function CopyButtonHarness() {
    const { copy, copied } = useClipboard({ text: "value", timeout: 0 });
    return (
      <div>
        <button
          type="button"
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          onClick={() => void copy()}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <span role="status" aria-live="polite">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
    );
  }

  test("the trigger has an accessible name and the live region announces copied", async () => {
    setClipboard(vi.fn().mockResolvedValue(undefined));
    render(<CopyButtonHarness />);

    const button = screen.getByRole("button", { name: "Copy to clipboard" });
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole("button", { name: "Copied to clipboard" })).toBeInTheDocument();
    expect(status).toHaveTextContent("Copied to clipboard");
  });
});
```

- [ ] **Step 2: Run the tests, verify they pass**

Run: `(cd src/hooks/use-clipboard && npx vitest run)`
Expected: PASS (all).

- [ ] **Step 3: Run the full suite with coverage**

Run: `(cd src/hooks/use-clipboard && npx vitest run --coverage)`
Expected: PASS; `use-clipboard.ts` line coverage ≥ 90%. (SSR `typeof` guards may stay uncovered — acceptable, like color-scheme.)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-clipboard/use-clipboard.test.tsx
git commit -m "test(use-clipboard): a11y assertion for the copy-button pattern (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: README

**Files:**
- Create: `src/hooks/use-clipboard/README.md`

- [ ] **Step 1: Write the README**

Create `src/hooks/use-clipboard/README.md`:

````markdown
# use-clipboard

A drop-in React hook for copying text to the clipboard with a "copied!" state
that auto-resets, async + `execCommand` fallback handling, and optional
before/after callbacks. No npm package, no build step — copy the file into
your app.

> `navigator.clipboard.writeText` looks like a one-liner until you hit the
> failure modes: it's async and can reject, it needs a secure context and a
> user gesture, permissions can be denied, and older/embedded browsers need
> the `execCommand("copy")` fallback. This hook handles all of that and resets
> the "copied" affordance on a timer.

## What to copy

Copy this file into your project (e.g. `src/hooks/use-clipboard/`):

- `use-clipboard.ts` — the `useClipboard` hook + `ClipboardError`
- *(optional)* this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-clipboard.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

```tsx
import { useClipboard } from "./hooks/use-clipboard/use-clipboard";

export function CopyButton({ value }: { value: string }) {
  const { copy, copied, error } = useClipboard({ text: value });
  return (
    <>
      <button
        type="button"
        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
        onClick={() => void copy()}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      {/* Announce the change for screen readers — don't rely on the visual swap alone. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
      {error && <span role="alert">Couldn’t copy ({error.reason}).</span>}
    </>
  );
}
```

`copy()` copies the `text` prop; `copy("override")` copies an explicit string
instead. It resolves to `true` on success, `false` on cancel or failure, and
never throws.

## API

```ts
const { copy, copied, error, reset } = useClipboard({
  text,          // default payload
  timeout,       // ms before `copied` resets. Default 2000. <= 0 disables auto-reset.
  onBeforeCopy,  // (text) => void | string | false | Promise<...>
  onCopied,      // (text) => void  — after a successful write
  onError,       // (err: ClipboardError) => void
});
```

| Result | Type | Notes |
|---|---|---|
| `copy` | `(override?: string) => Promise<boolean>` | Copies `override ?? text ?? ""`. Identity-stable. Never throws. |
| `copied` | `boolean` | True from a successful write until `timeout` elapses or `reset()`. |
| `error` | `ClipboardError \| null` | The last failure. Cleared at the start of each `copy()` and by `reset()`. |
| `reset` | `() => void` | Clears the timer, `copied`, and `error`. Identity-stable. |

### `onBeforeCopy`

Runs before the write, with the resolved payload:

- **Transform:** return a string to copy that instead (an empty string `""` is
  a valid transform, not a cancel).
- **Cancel:** return `false` (strict) to abort cleanly — no write, no
  `onCopied`, no error; `copy()` resolves `false`.
- **Async:** awaited before the write.
- **Throw/reject:** treated as a failure — routed to `onError` (reason
  `write-failed`, original error on `.cause`); `copy()` resolves `false`.

### `ClipboardError`

```ts
class ClipboardError extends Error {
  reason: "not-supported" | "insecure-context" | "write-failed";
  // plus the native Error `cause` (the original DOMException, when there is one)
}
```

- `not-supported` — no clipboard mechanism at all (SSR / locked-down env).
- `insecure-context` — **best-effort**: the async API was absent and the page
  isn't a secure context (serve over HTTPS). A *present-but-rejecting* async
  API (e.g. a `NotAllowedError`) surfaces as `write-failed` instead.
- `write-failed` — an attempt was made and all paths failed (or `onBeforeCopy`
  threw). Inspect `error.cause` for the underlying `DOMException` when you need
  to branch precisely (e.g. `error.cause?.name === "NotAllowedError"`).

## Accessibility

A purely visual "Copy → Copied!" swap is invisible to screen-reader users.
Pair the trigger with a polite live region (`role="status" aria-live="polite"`)
whose text reflects `copied`, and give the button an accessible name. Keep the
button labeled even while showing an icon.

## Testing this drop-in

```bash
npm install
npx tsc --noEmit
npm test -- --coverage
```

## Decisions made (where the spec left a choice)

- **`<CopyButton>` is demo-only.** The hook is the primitive you copy; the
  button is a usage pattern (see the kit's docs demo), consistent with how the
  kit separates logic from chrome.
- **`onBeforeCopy` cancels by returning `false`** (strict), transforms by
  returning a string. Throwing is reserved for real errors and routes to
  `onError` — so the cancel signal and the failure signal never collide, and
  `""` stays a valid transform.
- **Default `timeout` is 2000ms.** `timeout <= 0` disables auto-reset.
- **`copy()` never throws.** Every failure is a `ClipboardError` delivered to
  `onError` and reflected in `error`; `copy()` resolves a boolean. This keeps
  call sites a one-liner (`onClick={() => void copy()}`).
- **`insecure-context` is best-effort.** It can't be reliably distinguished
  from a permission rejection in every browser, so the underlying
  `DOMException` is always preserved on `.cause` for precise branching.
- **Text-only v1.** The options/result are objects so richer payloads
  (`text/html`, `ClipboardItem`) can be added later without a breaking change.
````

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-clipboard/README.md
git commit -m "docs(use-clipboard): add drop-in README (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Docs app wiring — demo, route, router, nav

**Files:**
- Create: `app/components/demos/copy-button.tsx`
- Create: `app/routes/use-clipboard.tsx`
- Modify: `app/router.tsx`
- Modify: `app/lib/nav.ts`

- [ ] **Step 1: Create the `<CopyButton>` demo**

Create `app/components/demos/copy-button.tsx`:

```tsx
import { Check, Copy } from "lucide-react";
import { Button } from "~/components/ui/button.tsx";
import { useClipboard } from "#hooks/use-clipboard/use-clipboard.ts";

const VALUE = "npm install @osuritz/react-kit";

export function CopyButton() {
  const { copy, copied, error } = useClipboard({ text: VALUE, timeout: 2000 });
  return (
    <div className="flex flex-col items-center gap-3">
      <code className="bg-muted rounded px-3 py-1.5 text-sm">{VALUE}</code>
      <Button
        variant="outline"
        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied!" : "Copy"}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          Couldn’t copy ({error.reason}).
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the route**

Create `app/routes/use-clipboard.tsx`:

```tsx
import { DropInPage } from "~/components/drop-in-page";
import { CopyButton } from "~/components/demos/copy-button";
import copyButtonSrc from "~/components/demos/copy-button.tsx?shiki";
import { repoBlobUrl, repoTreeUrl } from "~/lib/github";

const DROP_IN_PATH = "src/hooks/use-clipboard";

export default function UseClipboardRoute() {
  return (
    <DropInPage
      title="useClipboard"
      description="A drop-in React hook for copying text to the clipboard with a copied! affordance that auto-resets, async + execCommand fallback handling, and optional before/after callbacks. The CopyButton below is the recommended usage pattern."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: "Copy button",
          description:
            "A declarative <CopyButton text={value} /> with a 2s copied state and an aria-live announcement for screen readers.",
          source: copyButtonSrc,
          render: <CopyButton />,
        },
      ]}
    />
  );
}
```

- [ ] **Step 3: Register the route in `app/router.tsx`**

Add the import alongside the other route imports (after the `ColorSchemeRoute` import is fine):

```tsx
import UseClipboardRoute from "./routes/use-clipboard";
```

Add the route entry inside the `errorElement` child group, right after the `color-scheme` entry:

```tsx
            { path: "use-clipboard", element: <UseClipboardRoute /> },
```

- [ ] **Step 4: Add the nav entry in `app/lib/nav.ts`**

In the `Hooks` group's `items` array, add this entry after the `useColorScheme` item:

```ts
      {
        to: "/use-clipboard",
        label: "useClipboard",
        blurb:
          "Copy-to-clipboard hook with auto-resetting copied state and execCommand fallback.",
      },
```

- [ ] **Step 5: Verify the docs app builds**

Run: `npm run build`
Expected: `tsc -b` passes (the hook typechecks under the app config) and `vite build` succeeds. If `tsc` complains about an unused import or a type-only import, fix per `verbatimModuleSyntax` (use `import type` where the import is types-only).

- [ ] **Step 6: Commit**

```bash
git add app/components/demos/copy-button.tsx app/routes/use-clipboard.tsx app/router.tsx app/lib/nav.ts
git commit -m "docs(use-clipboard): wire CopyButton demo, route, and nav (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Harness typecheck**

Run: `(cd src/hooks/use-clipboard && npx tsc --noEmit)`
Expected: no errors.

- [ ] **Step 2: Full harness test with coverage**

Run: `(cd src/hooks/use-clipboard && npx vitest run --coverage)`
Expected: all tests PASS; `use-clipboard.ts` line coverage ≥ 90%.

- [ ] **Step 3: Repo lint**

Run: `npm run lint`
Expected: no errors. (The `app/` files and `src/` hook are linted by the root eslint config.)

- [ ] **Step 4: Repo build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Manual smoke check (optional but recommended)**

Run: `npm run dev`, open the app, navigate to **useClipboard** (it should appear in the Hooks group of the sidebar, the mobile drawer, and the home grid). Click **Copy**, confirm it flips to **Copied!** and resets after ~2s, and that the clipboard actually holds the value.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(use-clipboard): verification fixes (#26)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-review notes (author)

- **Spec coverage:** async+rejection (Tasks 2/5), execCommand fallback (Task 5), secure-context/permission reasons (Task 5), timer reset/re-arm/unmount (Task 3), stable identity (Task 2), SSR guards (Task 5 `typeof` checks), additive API (object options — design), `text` prop + override (Task 2), onBeforeCopy transform/cancel/before-after (Task 4), demo-only CopyButton + docs wiring (Task 8), a11y (Task 6), README decisions (Task 7). ✓
- **Type consistency:** `ClipboardError(reason, message, { cause })`, `writeClipboard(text)`, `execCommandCopy(text)`, `UseClipboardOptions`/`UseClipboardResult`, `generationRef`/`mountedRef`/`timerRef`/`clearTimer` consistent across tasks. ✓
- **No placeholders:** every step has concrete code/commands. ✓
```
