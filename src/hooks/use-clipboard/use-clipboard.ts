import { useCallback, useEffect, useRef, useState } from "react";

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
}
