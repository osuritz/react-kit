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
