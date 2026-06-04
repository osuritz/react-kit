/**
 * useDebounce — a pure, minimal debounce primitive.
 *
 * Pairs naturally with a data library that owns fetch state. With React
 * Query, debounce the query string, put it in the queryKey, and use
 * `enabled` to skip empty queries:
 *
 *     const debouncedQuery = useDebounce(query, 300);
 *
 *     const { data, isLoading, error } = useQuery({
 *       queryKey: ['search', debouncedQuery],
 *       queryFn: () => fetchResults(debouncedQuery),
 *       enabled: !!debouncedQuery,
 *     });
 *
 * Teams managing fetch state manually may want the `use-autocomplete`
 * drop-in instead, which composes this hook with fetch +
 * loading/error/stale-response handling. Use one or the other, not both.
 */
import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delay` ms.
 * Generic over any value type — strings, numbers, objects (compared by
 * identity, like any dependency). The initial value is returned immediately
 * (there is nothing to debounce yet).
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
