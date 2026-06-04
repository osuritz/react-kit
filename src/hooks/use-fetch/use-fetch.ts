/**
 * useFetch — a house-made one-shot fetch hook for lightweight needs.
 *
 * Fetches exactly once per component lifetime, on mount. This is a
 * deliberate design choice, not a missing feature: the effect has an empty
 * dependency array and the input is captured on first render, so later input
 * changes are intentionally ignored.
 *
 * KNOWN LIMIT — this is a toy by design. The classic trap:
 *
 *     const productId = useParams().productId;
 *     useFetch([`/products/${productId}`]); // silently keeps fetching the
 *                                           // FIRST productId forever
 *
 * When productId changes, nothing happens — no error, no refetch. Making the
 * hook react to input means picking a re-run key: depending on the raw input
 * re-fetches infinitely (new array/lambda identity every render), so you'd
 * have to serialize it (e.g. depend on the URL string) — which is exactly
 * React Query's queryKey. At that point, use React Query: it is made for
 * precisely this. For dynamic input either remount with a `key`, pass a
 * lambda and manage the lifecycle yourself, or graduate to React Query
 * (see also the `use-autocomplete` drop-in for the debounced reactive shape).
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
