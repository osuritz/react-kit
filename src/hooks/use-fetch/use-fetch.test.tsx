import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './use-fetch';

/** A promise whose resolution the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Minimal Response stand-in for the fetch path. */
function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}

describe('useFetch', () => {
  describe('fetch-args input', () => {
    it('fetches on mount, parses JSON, and exposes the data', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([{ id: 1 }]));
      const { result } = renderHook(() => useFetch<{ id: number }[]>(['/api/users']));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy).toHaveBeenCalledWith('/api/users');
      expect(result.current.data).toEqual([{ id: 1 }]);
      expect(result.current.error).toBeNull();
    });

    it('passes RequestInit through to fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
      renderHook(() => useFetch(['/api/users', { method: 'POST' }]));

      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      expect(fetchSpy).toHaveBeenCalledWith('/api/users', { method: 'POST' });
    });

    it('is loading from the very first render — no idle flash before the mount fetch', () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
      const { result } = renderHook(() => useFetch(['/api/users']));
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('surfaces a non-ok response as an HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));
      const { result } = renderHook(() => useFetch(['/api/missing']));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('HTTP 404');
      expect(result.current.data).toBeNull();
    });

    it('captures a network rejection', async () => {
      const failure = new TypeError('network down');
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(failure);
      const { result } = renderHook(() => useFetch(['/api/users']));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe(failure);
      expect(result.current.data).toBeNull();
    });
  });

  describe('function input', () => {
    it('runs the custom function instead of fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const fn = vi.fn(async () => ({ greeting: 'hi' }));
      const { result } = renderHook(() => useFetch<{ greeting: string }>(fn));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fn).toHaveBeenCalledOnce();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.current.data).toEqual({ greeting: 'hi' });
      expect(result.current.error).toBeNull();
    });

    it('captures a rejection from the custom function', async () => {
      const failure = new Error('boom');
      const { result } = renderHook(() =>
        useFetch(async () => {
          throw failure;
        })
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe(failure);
      expect(result.current.data).toBeNull();
    });
  });

  describe('one-shot semantics', () => {
    it('fetches exactly once per mount — input changes are intentionally ignored', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
      const { result, rerender } = renderHook(({ url }) => useFetch([url]), {
        initialProps: { url: '/api/users/1' },
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      rerender({ url: '/api/users/2' });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy).toHaveBeenCalledWith('/api/users/1');
    });

    it('does not update state when the response resolves after unmount', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { promise, resolve } = deferred<Response>();
      vi.spyOn(globalThis, 'fetch').mockReturnValue(promise);
      const { unmount } = renderHook(() => useFetch(['/api/slow']));

      unmount();
      await act(async () => {
        resolve(jsonResponse({ late: true }));
      });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('settles to a consistent state under StrictMode double-effects', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ n: 1 }));
      const { result } = renderHook(() => useFetch<{ n: number }>(['/api/n']), {
        wrapper: StrictMode,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // StrictMode remounts, so the effect (and fetch) legitimately runs
      // twice; the first run is cancelled and state settles once.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual({ n: 1 });
      expect(result.current.error).toBeNull();
    });
  });
});
