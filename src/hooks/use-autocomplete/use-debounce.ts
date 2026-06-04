/**
 * Vendored copy of the `use-debounce` drop-in (`src/hooks/use-debounce/`),
 * so this folder stays self-contained per repo convention — copy it alongside
 * `use-autocomplete.ts`. Keep in sync with the standalone drop-in.
 *
 * Only need debouncing (e.g. you're on React Query/SWR)? Copy the standalone
 * `use-debounce` drop-in instead of this folder.
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
