/**
 * useDebounce + useAutocomplete — debounced-search primitives.
 *
 * Which one do I want?
 *
 * - **React Query users should use `useDebounce` directly** — React Query
 *   manages its own fetching lifecycle, so don't mix it with useAutocomplete;
 *   use one or the other. Debounce the query string, hand it to `useQuery`,
 *   and let React Query own caching, loading, and error state
 *   (`enabled: !!debouncedQuery` is the React Query equivalent of
 *   useAutocomplete's empty-query early return):
 *
 *     const debouncedQuery = useDebounce(query, 300);
 *
 *     const { data, isLoading, error } = useQuery({
 *       queryKey: ['search', debouncedQuery],
 *       queryFn: () => fetchResults(debouncedQuery),
 *       enabled: !!debouncedQuery,
 *     });
 *
 * - **`useAutocomplete` is for teams managing fetch state manually** — it
 *   bundles debounce + fetch + loading/error/stale-response handling for any
 *   Promise-returning backend, no useCallback required:
 *
 *     const { results, loading, error } = useAutocomplete(
 *       query,
 *       (q) => axios.get(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
 *     );
 */
import { useEffect, useRef, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delay` ms.
 * Generic over any value type — strings, numbers, objects (compared by
 * identity, like any dependency).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    // Each change cancels the previous pending timeout — that *is* the
    // debounce. Cleanup on unmount also prevents a set-state-after-unmount.
    return () => clearTimeout(id);
  }, [value, delay]);

  return debouncedValue;
}

export interface UseAutocompleteResult<T> {
  results: T[];
  loading: boolean;
  /** Whatever the last failed `fetchFn` rejected with; `null` when healthy. */
  error: unknown;
}

/**
 * Debounced autocomplete over any Promise-returning backend.
 *
 * @param query   the live input value (debounced internally)
 * @param fetchFn called with the debounced query; an inline arrow function is
 *                fine — it does NOT need to be wrapped in useCallback
 * @param delay   debounce delay in ms (default 300)
 */
export function useAutocomplete<T>(
  query: string,
  fetchFn: (query: string) => Promise<T[]>,
  delay = 300
): UseAutocompleteResult<T> {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const debouncedQuery = useDebounce(query, delay);

  // INTENTIONAL: this ref is reassigned on every render with no dependency
  // array. It looks like a mistake, but it's the standard "latest ref"
  // pattern — it keeps fetchFnRef.current pointing at the newest fetchFn
  // (with fresh closure state) without making fetchFn an effect dependency.
  // That's what lets consumers pass an inline arrow function without
  // useCallback and without re-firing the fetch effect on every render.
  const fetchFnRef = useRef(fetchFn);
  // oxlint-disable-next-line react-hooks-js/refs -- intentional always-fresh-ref write: the fetch effect reads fetchFnRef.current when it fires, never during render.
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    // Empty (or whitespace-only) query: clear and bail — no request fired.
    // The trimmed query is also what gets fetched, so "  re " and "re" are
    // the same request.
    const trimmedQuery = debouncedQuery.trim();
    if (!trimmedQuery) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- intentional: clearing is a reaction to the (debounced, external-by-design) query emptying; there is no render-time place to do it inside a hook without changing the hook's state shape.
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // One flag covers both stale responses and unmount: the cleanup below
    // runs when debouncedQuery changes (a newer request supersedes this one)
    // and on unmount, so a late resolution/rejection is simply dropped.
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchFnRef
      .current(trimmedQuery)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // fetchFn is intentionally NOT a dependency: it's read through
    // fetchFnRef (always current — see above), so re-running this effect
    // when its identity changes would only cause spurious refetches for
    // consumers who pass inline arrows. Only the debounced query drives
    // fetching.
  }, [debouncedQuery]);

  return { results, loading, error };
}
