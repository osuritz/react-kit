import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button.tsx';
import { useFetch } from '#hooks/use-fetch/use-fetch.ts';

interface Quote {
  text: string;
  author: string;
}

/** Pretend backend: resolves a quote (or fails) after a simulated delay. */
function fetchQuote(shouldFail: boolean): Promise<Quote> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('HTTP 503'));
      } else {
        resolve({
          text: 'There are only two hard things in Computer Science: cache invalidation and naming things.',
          author: 'Phil Karlton',
        });
      }
    }, 900);
  });
}

function QuoteCard({ shouldFail }: { shouldFail: boolean }) {
  // One-shot: fetches once when this component mounts. The parent remounts
  // it with a key to fetch again.
  const { data, isLoading, error } = useFetch<Quote>(() => fetchQuote(shouldFail));

  if (isLoading) {
    return (
      <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Loading…
      </p>
    );
  }
  if (error != null) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Couldn't load the quote ({error instanceof Error ? error.message : 'unknown error'}).
      </p>
    );
  }
  return (
    <blockquote className="border-border border-l-2 pl-3 text-sm">
      “{data?.text}”<footer className="text-muted-foreground mt-1">— {data?.author}</footer>
    </blockquote>
  );
}

export function FetchDemo() {
  // Changing the key remounts QuoteCard — the idiomatic way to re-run a
  // one-shot useFetch.
  const [requestId, setRequestId] = useState(0);
  const [shouldFail, setShouldFail] = useState(false);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <QuoteCard key={requestId} shouldFail={shouldFail} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setRequestId((n) => n + 1)}>
          <RefreshCw /> Remount &amp; refetch
        </Button>
        <label className="text-muted-foreground inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
            className="border-border size-3.5 rounded border"
          />
          Fail the next request
        </label>
      </div>
      <p className="text-muted-foreground text-xs">
        useFetch is one-shot by design — toggling the checkbox alone changes nothing until the next
        remount, because input changes after mount are intentionally ignored.
      </p>
    </div>
  );
}
