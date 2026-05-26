# `use-clipboard` drop-in — design

Implements [issue #26](https://github.com/osuritz/react-kit/issues/26): a
hardened copy-to-clipboard React hook with a declarative `text` prop, a
`copied` affordance that auto-resets on a timer, and before/after callbacks
around the write. Ships as a hook-only drop-in; a thin `<CopyButton>` lives
in the docs demo as the usage pattern.

## Goals & non-goals

**Goals**
- One small hook that handles the `navigator.clipboard.writeText` gotchas:
  async rejection, missing secure context, denied permission, and the
  `execCommand` fallback for browsers without the async API.
- A `copied` boolean that flips true on success and auto-resets after a
  configurable `timeout`, with no leaked timers and no flicker.
- `onBeforeCopy` (transform/cancel), `onCopied`, `onError` callbacks.
- SSR-safe, zero runtime deps, React 18+.

**Non-goals (v1)**
- Rich payloads (`text/html`, images via `ClipboardItem`). The API is shaped
  to add these later without a breaking change, but v1 is text-only.
- Reading from the clipboard.
- Shipping `<CopyButton>` as part of the copyable drop-in — it stays a demo.

## Decisions (locked with the repo owner)

- **`<CopyButton>` is demo-only.** The `src/` drop-in is the hook alone,
  matching `color-scheme` (the hook is the drop-in; `ModeToggle` lives in the
  demo/README).
- **`onBeforeCopy` cancels by returning `false`** (strict `=== false`), and
  transforms by returning a string. Throwing is *not* the cancel channel.
- **Default `timeout` is `2000` ms.** `timeout <= 0` disables auto-reset.
- **Folder name is `use-clipboard`** (matches the issue title), even though
  existing hook folders aren't `use-`prefixed.

## Files

Drop-in (what a consumer copies):

- `src/hooks/use-clipboard/use-clipboard.ts` — the hook + `ClipboardError`.
  Plain `.ts` (no JSX).
- `src/hooks/use-clipboard/README.md`

Verification harness (lives alongside, not copied — mirrors `color-scheme`):

- `package.json` — `private`, peer deps React `>=18`, devDeps pin
  **React `^18.3.1`** (test against the minimum supported peer), plus
  `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `jsdom`,
  `vitest@^2`, `@vitest/coverage-v8@^2`, `typescript`, `@types/*`.
- `tsconfig.json` — same shape as `color-scheme` (keeps `jsx: react-jsx`
  because the test file renders a button for the a11y assertion).
- `vitest.config.ts` — `environment: "jsdom"`, `globals: true`,
  `setupFiles: ["./vitest.setup.ts"]`, **`coverage.include: ["use-clipboard.ts"]`**.
- `vitest.setup.ts` — minimal: `import "@testing-library/jest-dom/vitest"` +
  an `afterEach` doing `cleanup()` and `vi.restoreAllMocks()`. No
  `localStorage` polyfill (this hook doesn't touch storage).
- `use-clipboard.test.tsx` — behavior + a11y (`.tsx` because it renders a
  representative button).

Docs app wiring (files to **modify/create**):

- `app/components/demos/copy-button.tsx` — **new** `<CopyButton>` demo (`.tsx`).
- `app/routes/use-clipboard.tsx` — **new** route; `DROP_IN_PATH =
  "src/hooks/use-clipboard"`; imports the demo source via
  `~/components/demos/copy-button.tsx?shiki`.
- `app/router.tsx` — **modify**: import `UseClipboardRoute`, register
  `{ path: "use-clipboard", element: <UseClipboardRoute /> }` under the
  `errorElement` child group.
- `app/lib/nav.ts` — **modify**: add a `useClipboard` item to the **Hooks**
  group (single source of truth — sidebar, drawer, and home grid all derive
  from it; omitting it makes the drop-in invisible on mobile).

## Public API

```ts
export type ClipboardErrorReason =
  | "not-supported"     // no clipboard mechanism at all (SSR / locked-down env)
  | "insecure-context"  // best-effort: blocked, likely because !isSecureContext
  | "write-failed";     // an attempt was made and failed; see .cause

// Uses the native Error `cause` option (ES2022+; tsconfig targets es2023).
// We add ONE field — `reason`. We do NOT redeclare `cause` (that would shadow
// the native own-property set by super(message, { cause })).
export class ClipboardError extends Error {
  readonly reason: ClipboardErrorReason;
  constructor(reason: ClipboardErrorReason, message: string, options?: { cause?: unknown }) {
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
   * `false` (strict) to abort cleanly (no write, no onCopied, no error).
   * Async-aware. If it throws/rejects, the copy is aborted and routed to
   * onError (reason "write-failed").
   */
  onBeforeCopy?: (text: string) => void | false | string | Promise<void | false | string>;
  /** Runs after a successful write. */
  onCopied?: (text: string) => void;
  /** Runs when the copy fails (never receives a raw DOMException). */
  onError?: (err: ClipboardError) => void;
}

export interface UseClipboardResult {
  /** Copies `override ?? text ?? ""`. Resolves true on success, false on cancel/failure. Never throws. */
  copy: (override?: string) => Promise<boolean>;
  /** True from a successful write until the timeout elapses or reset() is called. */
  copied: boolean;
  /** The last failure, or null. Cleared at the start of each copy() and by reset(). */
  error: ClipboardError | null;
  /** Clears the timer, sets copied=false and error=null. Identity-stable. */
  reset: () => void;
}

export function useClipboard(options?: UseClipboardOptions): UseClipboardResult;
```

## Copy algorithm

`copy(override)` is wrapped so it **never throws** — every failure becomes a
`ClipboardError` delivered to `onError` and reflected in `error`, and the
promise resolves to a boolean.

1. **Begin.** Bump a module-internal *generation* counter (`gen`) so a slower
   earlier call can't clobber a later one. Clear `error`. Resolve
   `payload = override ?? text ?? ""`.
2. **Before hook.** `const r = await onBeforeCopy?.(payload)`.
   - `r === false` → abort: return `false`. No write, no `onCopied`, no error.
   - `typeof r === "string"` → `payload = r` (note: `""` is a valid transform,
     hence the strict `=== false` check above).
   - otherwise → proceed with `payload` unchanged.
   - If `onBeforeCopy` throws or rejects → jump to the failure path
     (`write-failed`, thrown value on `.cause`).
3. **Write.** `await writeClipboard(payload)` (below). On success → success
   path. On the resolved `ClipboardError` → failure path.
4. **Apply result** only if this call is still the latest generation
   (`gen === currentGen`) **and** the component is still mounted:
   - **Success:** clear any pending timer; if `timeout > 0`, arm a fresh timer
     that sets `copied=false`; `setCopied(true)`; call `onCopied(payload)`;
     return `true`.
   - **Failure:** `setError(err)`; leave `copied` false; call `onError(err)`;
     return `false`.
   - If a newer generation superseded this call, resolve the boolean but skip
     all `setState`/timer/callback side effects.

### `writeClipboard(text)` — mechanism selection

Returns on success; throws a `ClipboardError` on total failure. Always
preserves the underlying `DOMException` on `.cause`.

```
asyncAvailable  = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText
fallbackAvailable = typeof document !== "undefined" && typeof document.execCommand === "function"
insecure        = typeof window !== "undefined" && window.isSecureContext === false

if (!asyncAvailable && !fallbackAvailable)
    throw ClipboardError("not-supported", ...)

let firstError
if (asyncAvailable) {
  try { await navigator.clipboard.writeText(text); return; }
  catch (e) { firstError = e; /* fall through to fallback */ }
}
if (fallbackAvailable && execCommandCopy(text)) return;

// total failure — pick the most actionable reason we can actually observe:
if (!asyncAvailable && insecure)
    throw ClipboardError("insecure-context", "...serve over HTTPS...", { cause: firstError })
throw ClipboardError("write-failed", "...", { cause: firstError })
```

`insecure-context` is documented as **best-effort**: it fires only when the
async API was entirely absent and `isSecureContext === false`. A
`NotAllowedError` from a *present-but-rejecting* async API surfaces as
`write-failed` with the `DOMException` on `.cause`, so consumers can branch
precisely on `error.cause` when they need to.

### `execCommandCopy(text)` — hardened fallback

Returns a boolean (`document.execCommand("copy")` result). Hygiene that makes
it actually work and not disrupt the page:

- Remember `document.activeElement`.
- Create a `<textarea>`, set `value = text`, set `readonly` (stops the iOS
  soft keyboard), and position it off-screen but rendered:
  `position: fixed; top: 0; left: 0; width: 1px; height: 1px; padding: 0;
  border: 0; opacity: 0;` (not `display:none` — hidden elements can't be
  selected).
- Append, then select: `el.focus(); el.select();` and, for iOS Safari, also
  `el.setSelectionRange(0, text.length)` against a created range.
- `const ok = document.execCommand("copy")`.
- Remove the textarea and restore focus to the remembered element.
- Return `ok`.

## Stability & lifecycle

- `copy` and `reset` are identity-stable (`useCallback` with `[]`). They read
  live `text` / `timeout` / callbacks through a ref that is written
  **synchronously in the render body** (the `action-registry` live-getter
  pattern — not in an effect, so siblings calling `copy()` never read stale
  values).
- `copied` and `error` are `useState`.
- One timer id and one `mounted` flag live in refs. Timer is cleared+re-armed
  on each successful copy and cleared on unmount; `mounted` gates every
  post-`await` `setState`.
- The generation counter prevents an earlier in-flight write from applying its
  result after a later `copy()` or after `reset()`.
- SSR: no DOM/`navigator` access at module load or during render. The hook
  returns a valid result object on the server; `copy()` called server-side
  resolves to a `not-supported` `ClipboardError` via `onError`.

## Testing plan (vitest + jsdom harness)

Mock `navigator.clipboard` / `document.execCommand` per test. Cover:

- **Success via async API** — `writeText` called with the payload; `copied`
  true; `onCopied` called once with the payload.
- **Success via fallback** when the async API is absent — `execCommand("copy")`
  path; textarea created and removed; prior focus restored.
- **Fallback after async reject** — `writeText` rejects, `execCommand`
  succeeds → success, no error.
- **Error: `not-supported`** — neither mechanism available.
- **Error: `write-failed`** — async rejects (`NotAllowedError`) and fallback
  returns false; `error.reason === "write-failed"`, `error.cause` is the
  DOMException; `onError` called; `copied` stays false.
- **Error: `insecure-context`** — async API absent, `isSecureContext` false,
  fallback fails.
- **`onBeforeCopy` transform** — returning a string copies the transformed
  value; returning `""` copies the empty string (not treated as cancel).
- **`onBeforeCopy` cancel** — returning `false` → no write, no `onCopied`, no
  error, `copy()` resolves false.
- **`onBeforeCopy` throw/reject** → routed to `onError` (`write-failed`),
  `copy()` resolves false, never throws.
- **Callback ordering** — `onBeforeCopy` before the write, `onCopied` after.
- **Timer reset & re-arm** — `copied` flips true then false after `timeout`
  (fake timers); a second `copy()` before elapse re-arms (no early flip);
  unmount clears the timer (no setState-after-unmount); `timeout <= 0` never
  auto-resets.
- **`reset()`** — clears `copied`, `error`, and the pending timer.
- **Stable identity** — `copy` and `reset` are referentially equal across
  rerenders that change `text`/`timeout`/callbacks.
- **a11y** — render a minimal button wired to the hook with an `aria-live`
  status region; assert the button has an accessible name and the live region
  reflects the `copied` state (the pattern the README recommends).

Run: `npm install && npx tsc --noEmit && npm test -- --coverage`.

## README outline

Mirrors `color-scheme`'s README: what to copy, peer requirements, quick start
(`<CopyButton>`), the full API table, the `onBeforeCopy` transform/cancel
contract, an **accessibility** note (label the trigger; announce "Copied" via
an `aria-live="polite"` region rather than only a visual swap), a
secure-context/permission note explaining the `error.reason` values and that
`error.cause` carries the original `DOMException`, "testing this drop-in", and
a "decisions made" section.
