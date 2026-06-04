/**
 * useFetch — a house-made one-shot fetch hook for lightweight needs.
 *
 * Fetches exactly once per component lifetime, on mount. This is a
 * deliberate design choice, not a missing feature: the effect has an empty
 * dependency array and the input is captured on first render, so later input
 * changes are intentionally ignored. Need the request to react to changing
 * input (a search query, a route param)? That's a different hook with
 * different semantics — see the `use-autocomplete` drop-in for the reactive,
 * debounced shape, or reach for React Query when you want caching/retries.
 *
 *     // fetch-args form: spread into globalThis.fetch, JSON-parsed,
 *     // non-2xx rejects with Error('HTTP <status>')
 *     const { data, isLoading, error } = useFetch<User[]>(['/api/users']);
 *
 *     // function form: any () => Promise — axios, a static import, anything
 *     const { data } = useFetch<User[]>(() => axios.get('/api/users').then((r) => r.data));
 */
import { useEffect, useRef, useState } from 'react';

export type FetchInput = Parameters<typeof globalThis.fetch> | (() => Promise<unknown>);

export interface FetchResults<T> {
  data: T | null;
  isLoading: boolean;
  /** Whatever the fetch rejected with; `null` when healthy. */
  error: unknown;
}

export function useFetch<T>(input: FetchInput): FetchResults<T> {
  const [data, setData] = useState<T | null>(null);
  // The mount fetch always fires, so the hook is born loading — starting at
  // false would flash one "idle, no data" frame before the effect runs.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Captured ONCE, on first render — and that's enough: the effect below has
  // an empty dependency array, so nothing ever re-reads this ref expecting a
  // fresher value. One-shot capture for a one-shot fetch.
  const fetchFnRef = useRef(
    typeof input === 'function'
      ? input
      : () =>
          globalThis.fetch(...input).then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
  );

  useEffect(() => {
    // Cancellation here only guards the unmount case (and StrictMode's
    // mount/unmount/mount): with [] deps there is no "newer request" to
    // supersede this one.
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const result = await fetchFnRef.current();
        if (!cancelled) {
          setData(result as T);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading: loading, error };
}
