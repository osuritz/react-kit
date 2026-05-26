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
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-clipboard.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

```tsx
import { useClipboard } from './hooks/use-clipboard/use-clipboard';

export function CopyButton({ value }: { value: string }) {
  const { copy, copied, error } = useClipboard({ text: value });
  return (
    <>
      <button
        type="button"
        aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
        onClick={() => void copy()}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {/* Announce the change for screen readers — don't rely on the visual swap alone. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
      {error && <span role="alert">Couldn't copy ({error.reason}).</span>}
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
  text, // default payload
  timeout, // ms before `copied` resets. Default 2000. <= 0 disables auto-reset.
  onBeforeCopy, // (text) => void | string | false | Promise<...>
  onCopied, // (text) => void  — after a successful write
  onError, // (err: ClipboardError) => void
});
```

| Result   | Type                                      | Notes                                                                     |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `copy`   | `(override?: string) => Promise<boolean>` | Copies `override ?? text ?? ""`. Identity-stable. Never throws.           |
| `copied` | `boolean`                                 | True from a successful write until `timeout` elapses or `reset()`.        |
| `error`  | `ClipboardError \| null`                  | The last failure. Cleared at the start of each `copy()` and by `reset()`. |
| `reset`  | `() => void`                              | Clears the timer, `copied`, and `error`. Identity-stable.                 |

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
  reason: 'not-supported' | 'insecure-context' | 'write-failed';
  // plus the native Error `cause` (the original DOMException, when there is one)
}
```

- `not-supported` — no clipboard mechanism at all (SSR / locked-down env).
- `insecure-context` — **best-effort**: the async API was absent and the page
  isn't a secure context (serve over HTTPS). A _present-but-rejecting_ async
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
