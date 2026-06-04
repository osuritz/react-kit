# use-autocomplete

A drop-in debounced autocomplete hook for teams managing fetch state
manually: debounce + fetch + loading/error/stale-response handling over any
Promise-returning backend. No npm package, no build step — copy the files
into your app.

> Debounced fetching looks simple until the failure modes show up: a slow
> response for `"re"` overwriting the results for `"react"`, a setState after
> unmount, a refetch storm because the inline `fetchFn` gets a new identity
> every render. This hook handles all of that in ~60 lines.

**On React Query (or SWR)?** Use the
[use-debounce](../use-debounce/README.md) drop-in directly and let your data
library own fetch state. Don't mix the two — React Query manages its own
fetching lifecycle, so it's one or the other.

## What to copy

Copy these two files into your project (e.g. `src/hooks/use-autocomplete/`):

- `use-autocomplete.ts` — the `useAutocomplete` hook
- `use-debounce.ts` — vendored copy of the
  [use-debounce](../use-debounce/README.md) drop-in it composes (kept
  in-folder so the drop-in stays self-contained)
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-autocomplete.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

`fetchFn` can be an inline arrow function — no `useCallback` needed. The hook
reads it through an always-fresh ref, so its identity is never an effect
dependency.

```tsx
import { useState } from 'react';
import axios from 'axios';
import { useAutocomplete } from './hooks/use-autocomplete/use-autocomplete';

export function UserSearch() {
  const [query, setQuery] = useState('');

  // Inline axios call, recreated every render — that's fine.
  const { results, loading, error } = useAutocomplete(query, (q) =>
    axios.get<{ name: string }[]>('/api/users', { params: { q } }).then((res) => res.data)
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users…"
        aria-label="Search users"
      />
      {loading && <span role="status">Searching…</span>}
      {error != null && <span role="alert">Search failed.</span>}
      <ul>
        {results.map((user) => (
          <li key={user.name}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API

```ts
function useAutocomplete<T>(
  query: string,
  fetchFn: (query: string) => Promise<T[]>,
  delay?: number // default 300
): { results: T[]; loading: boolean; error: unknown };
```

- **Debounces internally** — pass the live input value; only the final query
  of a typing burst is fetched.
- **Empty or whitespace-only query** clears `results`/`error` and fires no
  request. The query is trimmed before fetching, so `"  re "` and `"re"` are
  the same request.
- **Stale responses are discarded** — if a newer query fires while an older
  request is in flight, the older resolution (or rejection) is dropped, so
  results never go backwards.
- **Errors** land in `error` (typed `unknown` — whatever your `fetchFn`
  rejected with; `null` when healthy) and clear on the next successful fetch.
- **No `useCallback` needed** for `fetchFn`; the latest closure is always
  used when a fetch fires.
- Mounting with a non-empty query fetches immediately (debounce applies to
  changes, not the initial value).

## Behavior notes

- Stale-response/unmount safety uses a `cancelled` flag in the effect cleanup,
  not `AbortController` — the superseded request still completes in the
  background but its result is ignored. If you need to actually cancel the
  network request, wire an `AbortController` inside your `fetchFn`.
- `loading` is `true` from the moment the debounced fetch fires until its
  response lands; it stays `true` (no flicker) when a newer query supersedes
  an in-flight request.
- Changing `delay` while a value is settling restarts the debounce timer from
  scratch with the new delay — the standard debounce-hook tradeoff. If you
  drive `delay` from state, expect the value to land `newDelay` ms after the
  change.

## Tests

```sh
pnpm install
pnpm test
```

Covers empty/whitespace-query short-circuit and trimming, debounce timing,
custom delay, loading transitions (including no flicker across a supersede),
stale response and stale rejection discard, error capture and recovery,
fetchFn identity changes, StrictMode double-effects, and post-unmount
resolutions. The debounce primitive itself is covered in the
[use-debounce](../use-debounce/README.md) drop-in's suite.
