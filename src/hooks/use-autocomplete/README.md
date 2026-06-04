# use-autocomplete

Two drop-in React hooks for debounced search: `useDebounce`, a pure generic
debounce primitive, and `useAutocomplete`, which composes it with fetch +
loading/error/stale-response handling. No npm package, no build step — copy
the file into your app.

> Debounced fetching looks simple until the failure modes show up: a slow
> response for `"re"` overwriting the results for `"react"`, a setState after
> unmount, a refetch storm because the inline `fetchFn` gets a new identity
> every render. These hooks handle all of that in ~60 lines.

**Which one do I want?** React Query (or SWR) users should use `useDebounce`
directly and let their data library own fetch state. `useAutocomplete` is for
teams managing fetch state manually. Don't mix them — React Query manages its
own fetching lifecycle, so it's one or the other.

## What to copy

Copy this file into your project (e.g. `src/hooks/use-autocomplete/`):

- `use-autocomplete.ts` — both hooks (`useDebounce`, `useAutocomplete`)
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-autocomplete.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

### `useAutocomplete` — manual fetch state, any backend

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

### `useDebounce` + React Query — when a library owns fetch state

React Query owns the loading/error/results state; you just debounce the query
key. The `enabled` flag is the React Query equivalent of `useAutocomplete`'s
empty-query early return.

```tsx
import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './hooks/use-autocomplete/use-autocomplete';

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => axios.get('/api/search', { params: { q: debouncedQuery } }).then((r) => r.data),
    enabled: !!debouncedQuery, // ≙ useAutocomplete's empty-query early return
  });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isLoading && <span role="status">Loading…</span>}
      {error && <span role="alert">Search failed.</span>}
      <ul>
        {data?.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## API

```ts
function useDebounce<T>(value: T, delay: number): T;

function useAutocomplete<T>(
  query: string,
  fetchFn: (query: string) => Promise<T[]>,
  delay?: number // default 300
): { results: T[]; loading: boolean; error: unknown };
```

### `useDebounce`

Returns `value`, but only after it has stopped changing for `delay` ms.
Generic over any type — non-primitives are compared by identity, like any
React dependency. The initial value is returned immediately (there is nothing
to debounce yet).

### `useAutocomplete`

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

Covers debounce timing (reset on rapid changes, zero delay, mid-flight delay
changes, unmount), generic values, empty/whitespace-query short-circuit and
trimming, custom delay, loading transitions (including no flicker across a
supersede), stale response and stale rejection discard, error capture and
recovery, fetchFn identity changes, StrictMode double-effects, and
post-unmount resolutions.
