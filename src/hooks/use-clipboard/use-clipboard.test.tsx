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

  test("a pending auto-reset timer does not fire after unmount", async () => {
    vi.useFakeTimers();
    setClipboard(vi.fn().mockResolvedValue(undefined));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useClipboard({ text: "v" }));

    await act(async () => {
      await result.current.copy();
    });
    expect(result.current.copied).toBe(true);

    unmount();
    // The 2000ms timer would fire here; the unmount cleanup + mounted guard
    // must prevent any setState on the now-unmounted component.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

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
