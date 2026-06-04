import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './use-debounce';

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

  it('restarts the timer with the new delay when delay changes mid-debounce', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    rerender({ value: 'ab', delay: 300 });
    await advance(200); // 100ms left on the 300ms timer…
    rerender({ value: 'ab', delay: 500 }); // …but a delay change reschedules from scratch
    await advance(499);
    expect(result.current).toBe('a');

    await advance(1);
    expect(result.current).toBe('ab');
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
