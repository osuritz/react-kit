import { act, renderHook } from '@testing-library/react';
import { useAutocomplete, useDebounce } from './use-autocomplete';

/** A promise whose resolution the test controls, to script response ordering. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Advance fake timers and flush any microtasks queued by resolved promises. */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update until the delay has elapsed', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    await advance(299);
    expect(result.current).toBe('a');

    await advance(1);
    expect(result.current).toBe('ab');
  });

  it('resets the timer on rapid changes — only the final value lands', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    await advance(200);
    rerender({ value: 'abc' });
    await advance(200);
    expect(result.current).toBe('a'); // 'ab' was superseded before its timer fired

    await advance(100);
    expect(result.current).toBe('abc');
  });

  it('is generic — debounces non-string values by reference', async () => {
    const first = { id: 1 };
    const second = { id: 2 };
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: first },
    });

    rerender({ value: second });
    await advance(100);
    expect(result.current).toBe(second);
  });

  it('handles a delay of 0', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: 1 },
    });

    rerender({ value: 2 });
    await advance(0);
    expect(result.current).toBe(2);
  });

  it('does not fire a pending update after unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    unmount();
    await advance(300);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('useAutocomplete', () => {
  it('returns empty results, not loading, no error for an empty query — without fetching', async () => {
    const fetchFn = vi.fn();
    const { result } = renderHook(() => useAutocomplete('', fetchFn));

    await advance(300);
    expect(result.current).toEqual({ results: [], loading: false, error: null });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fetches a typed query after the debounce delay and exposes results', async () => {
    const fetchFn = vi.fn(async (q: string) => [`${q}-1`, `${q}-2`]);
    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: '' },
    });

    rerender({ query: 're' });
    expect(fetchFn).not.toHaveBeenCalled();
    await advance(300);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith('re');
    expect(result.current.results).toEqual(['re-1', 're-2']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches immediately when mounted with a non-empty query (nothing to debounce yet)', async () => {
    const fetchFn = vi.fn(async (q: string) => [q]);
    const { result } = renderHook(() => useAutocomplete('re', fetchFn));

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith('re');
    await advance(0);
    expect(result.current.results).toEqual(['re']);
  });

  it('respects a custom delay', async () => {
    const fetchFn = vi.fn(async () => []);
    const { rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn, 500), {
      initialProps: { query: '' },
    });

    rerender({ query: 're' });
    await advance(300);
    expect(fetchFn).not.toHaveBeenCalled();
    await advance(200);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('sets loading while the fetch is in flight', async () => {
    const { promise, resolve } = deferred<string[]>();
    const { result } = renderHook(() => useAutocomplete('re', () => promise));

    await advance(300);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolve(['react']);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual(['react']);
  });

  it('only fetches the final query when typing quickly', async () => {
    const fetchFn = vi.fn(async (q: string) => [q]);
    const { rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: '' },
    });

    rerender({ query: 'r' });
    await advance(100);
    rerender({ query: 're' });
    await advance(100);
    rerender({ query: 'rea' });
    await advance(300);

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn).toHaveBeenCalledWith('rea');
  });

  it('ignores stale responses that resolve after a newer request', async () => {
    const slow = deferred<string[]>();
    const fast = deferred<string[]>();
    const fetchFn = vi.fn((q: string) => (q === 're' ? slow.promise : fast.promise));
    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: 're' },
    });

    await advance(300); // fires the 're' request
    rerender({ query: 'react' });
    await advance(300); // fires the 'react' request, cancelling 're'

    await act(async () => {
      fast.resolve(['react']);
    });
    await act(async () => {
      slow.resolve(['re — stale']); // resolves after; must be discarded
    });

    expect(result.current.results).toEqual(['react']);
    expect(result.current.loading).toBe(false);
  });

  it('ignores stale rejections from a superseded request', async () => {
    const slow = deferred<string[]>();
    const fast = deferred<string[]>();
    const fetchFn = vi.fn((q: string) => (q === 're' ? slow.promise : fast.promise));
    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: 're' },
    });

    await advance(300);
    rerender({ query: 'react' });
    await advance(300);

    await act(async () => {
      fast.resolve(['react']);
    });
    await act(async () => {
      slow.reject(new Error('aborted'));
    });

    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual(['react']);
  });

  it('captures fetch errors and clears loading', async () => {
    const failure = new Error('network down');
    const fetchFn = vi.fn(async () => {
      throw failure;
    });
    const { result } = renderHook(() => useAutocomplete('re', fetchFn));

    await advance(300);
    expect(result.current.error).toBe(failure);
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('recovers from an error on the next successful fetch', async () => {
    let shouldFail = true;
    const fetchFn = vi.fn(async (q: string) => {
      if (shouldFail) throw new Error('boom');
      return [q];
    });
    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: 're' },
    });

    await advance(300);
    expect(result.current.error).toBeInstanceOf(Error);

    shouldFail = false;
    rerender({ query: 'react' });
    await advance(300);
    expect(result.current.error).toBeNull();
    expect(result.current.results).toEqual(['react']);
  });

  it('clears results when the query becomes empty', async () => {
    const fetchFn = vi.fn(async (q: string) => [q]);
    const { result, rerender } = renderHook(({ query }) => useAutocomplete(query, fetchFn), {
      initialProps: { query: 're' },
    });

    await advance(300);
    expect(result.current.results).toEqual(['re']);

    rerender({ query: '' });
    await advance(300);
    expect(result.current.results).toEqual([]);
    expect(fetchFn).toHaveBeenCalledOnce(); // no fetch for the empty query
  });

  it('does not refetch when only the fetchFn identity changes (inline arrows are fine)', async () => {
    let calls = 0;
    const { rerender } = renderHook(
      // A fresh arrow function every render, as an inline consumer would write it.
      ({ query }) =>
        useAutocomplete(query, async (q: string) => {
          calls++;
          return [q];
        }),
      { initialProps: { query: 're' } }
    );

    await advance(300);
    expect(calls).toBe(1);

    rerender({ query: 're' }); // same query, new fetchFn identity
    await advance(300);
    expect(calls).toBe(1);
  });

  it('uses the latest fetchFn when the next fetch fires', async () => {
    const first = vi.fn(async () => ['first']);
    const second = vi.fn(async () => ['second']);
    const { result, rerender } = renderHook(({ query, fn }) => useAutocomplete(query, fn), {
      initialProps: { query: 're', fn: first },
    });

    await advance(300);
    expect(result.current.results).toEqual(['first']);

    rerender({ query: 'react', fn: second });
    await advance(300);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledWith('react');
    expect(result.current.results).toEqual(['second']);
  });

  it('does not update state when a response resolves after unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { promise, resolve } = deferred<string[]>();
    const { unmount } = renderHook(() => useAutocomplete('re', () => promise));

    await advance(300);
    unmount();
    await act(async () => {
      resolve(['too late']);
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
