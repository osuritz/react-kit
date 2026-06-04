# use-debounce

A drop-in generic debounce hook. Returns a value only after it has stopped
changing for `delay` ms. No npm package, no build step — copy the file into
your app.

> The primitive behind debounced search: debounce the query string, then let
> whatever owns your fetch state (React Query, SWR, or the
> [use-autocomplete](../use-autocomplete/README.md) drop-in) react to the
> settled value.

## What to copy

Copy this file into your project (e.g. `src/hooks/use-debounce/`):

- `use-debounce.ts` — the `useDebounce` hook
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-debounce.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

With React Query (or SWR), debounce the query and let the library own fetch
state. The `enabled` flag skips empty queries:

```tsx
import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './hooks/use-debounce/use-debounce';

export function ProductSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => axios.get('/api/search', { params: { q: debouncedQuery } }).then((r) => r.data),
    enabled: !!debouncedQuery,
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

Managing fetch state manually? Use the
[use-autocomplete](../use-autocomplete/README.md) drop-in instead — it
composes this hook with fetch + loading/error/stale-response handling. Use
one or the other, not both: React Query manages its own fetching lifecycle.

## API

```ts
function useDebounce<T>(value: T, delay: number): T;
```

Generic over any type — non-primitives are compared by identity, like any
React dependency.

## Behavior notes

- The initial value is returned immediately — debounce applies to changes,
  not the first render.
- Changing `delay` while a value is settling restarts the timer from scratch
  with the new delay — the standard debounce-hook tradeoff.
- The pending timeout is cleared on unmount; no set-state-after-unmount.

## Tests

```sh
pnpm install
pnpm test
```

Covers initial-value passthrough, delay timing, timer reset on rapid changes,
generic non-string values, zero delay, mid-debounce delay changes, and
unmount safety.
