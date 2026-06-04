# use-fetch

A drop-in one-shot fetch hook: fetch once on mount, get back
`{ data, isLoading, error }`. The lightweight middle ground between raw
`fetch`-in-`useEffect` boilerplate and a full data library — great for small
apps, prototypes, and interviews. No npm package, no build step — copy the
file into your app.

> One-shot is the point. The hook fetches exactly once per component
> lifetime; input changes after mount are intentionally ignored (the effect
> has an empty dependency array, and the input is captured to a ref on first
> render — capture-once is consistent with run-once). Need the request to
> _react_ to changing input? That's a different hook: see
> [use-autocomplete](../use-autocomplete/README.md) for the debounced
> reactive shape, or React Query for caching/retries/revalidation.

## What to copy

Copy this file into your project (e.g. `src/hooks/use-fetch/`):

- `use-fetch.ts` — the `useFetch` hook
- _(optional)_ this README

The other files in this directory (`package.json`, `tsconfig.json`,
`vitest.config.ts`, `vitest.setup.ts`, `use-fetch.test.tsx`) are the
**verification harness** — they let `npm test` work here but aren't part of
what you copy into your app.

Peer requirements: React 18+ (works in 18 and 19). No runtime deps.

## Quick start

Two input forms. **Fetch args** — anything you'd pass to `fetch()`, JSON
parsed for you, non-2xx surfaced as `Error('HTTP <status>')`:

```tsx
import { useFetch } from './hooks/use-fetch/use-fetch';

export function UserList() {
  const { data, isLoading, error } = useFetch<User[]>(['/api/users']);

  if (isLoading) return <p role="status">Loading…</p>;
  if (error != null) return <p role="alert">Couldn't load users.</p>;
  return (
    <ul>
      {data?.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

**Function** — any `() => Promise`; bring axios or anything else:

```tsx
const { data } = useFetch<User[]>(() => axios.get('/api/users').then((r) => r.data));
```

To re-run on demand, remount the consumer with a `key`:

```tsx
const [requestId, setRequestId] = useState(0);
<UserList key={requestId} />
<button onClick={() => setRequestId((n) => n + 1)}>Reload</button>
```

## API

```ts
type FetchInput = Parameters<typeof globalThis.fetch> | (() => Promise<unknown>);

function useFetch<T>(input: FetchInput): {
  data: T | null;
  isLoading: boolean;
  error: unknown; // whatever the fetch rejected with; null when healthy
};
```

## Behavior notes

- **One fetch per mount.** The effect has `[]` deps; input is captured on
  first render. Changing the input after mount does nothing — remount with a
  `key` to refetch.
- `isLoading` starts `true` (the mount fetch always fires, so there is no
  idle frame before it).
- Unmount before the response lands is safe — a `cancelled` flag in the
  effect cleanup drops the late resolution. The request itself isn't
  aborted; wire an `AbortController` inside a function input if you need
  that.
- The fetch-args form parses JSON. Non-JSON responses need the function
  form.

## Tests

```sh
pnpm install
pnpm test
```

Covers both input forms, JSON parsing and RequestInit passthrough, born-
loading state, HTTP and network errors, one-shot semantics (input changes
ignored), post-unmount safety, and StrictMode double-effects.
