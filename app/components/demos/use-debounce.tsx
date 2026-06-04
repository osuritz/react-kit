import { useState } from 'react';
import { useDebounce } from '#hooks/use-debounce/use-debounce.ts';

export function DebounceDemo() {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, 500);

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type quickly, then pause…"
        aria-label="Debounce input"
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Live value</dt>
        <dd className="font-mono break-all">{value || ' '}</dd>
        <dt className="text-muted-foreground">Debounced (500ms)</dt>
        <dd className="font-mono break-all" aria-live="polite">
          {debounced || ' '}
        </dd>
      </dl>
      <p className="text-muted-foreground text-xs">
        The debounced value is what you'd hand to a React Query{' '}
        <code className="font-mono">queryKey</code> — it only updates once typing stops.
      </p>
    </div>
  );
}
