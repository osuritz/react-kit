import { useState } from 'react';
import { Loader2, SearchX } from 'lucide-react';
import { useAutocomplete } from '#hooks/use-autocomplete/use-autocomplete.ts';

const LANGUAGES = [
  'C',
  'C#',
  'C++',
  'Clojure',
  'Dart',
  'Elixir',
  'Erlang',
  'F#',
  'Go',
  'Haskell',
  'Java',
  'JavaScript',
  'Kotlin',
  'Lua',
  'OCaml',
  'PHP',
  'Python',
  'Ruby',
  'Rust',
  'Scala',
  'Swift',
  'TypeScript',
  'Zig',
];

/** Pretend backend: filters a local list after a simulated network delay. */
function searchLanguages(query: string): Promise<string[]> {
  const q = query.toLowerCase();
  return new Promise((resolve) => {
    setTimeout(() => resolve(LANGUAGES.filter((l) => l.toLowerCase().includes(q))), 400);
  });
}

export function AutocompleteDemo() {
  // Must start empty: a non-empty initial query would fetch on mount (twice
  // under StrictMode, which re-runs effects) and skew the request counter.
  const [query, setQuery] = useState('');
  // Counts every request the hook actually fires. Because the hook debounces
  // internally, typing a whole word quickly increments it only once.
  const [requests, setRequests] = useState(0);

  const { results, loading, error } = useAutocomplete(query, (q) => {
    setRequests((n) => n + 1);
    return searchLanguages(q);
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search languages… (try “script”)"
          aria-label="Search languages"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 flex-1 rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
        />
        {loading && <Loader2 aria-hidden className="text-muted-foreground size-4 animate-spin" />}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {loading ? 'Searching' : `${results.length} results`}
      </span>
      {error != null && (
        <p role="alert" className="text-destructive text-xs">
          Search failed.
        </p>
      )}

      {query && !loading && results.length === 0 && error == null ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <SearchX aria-hidden className="size-4" /> No matches.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {results.map((lang) => (
            <li
              key={lang}
              className="border-border bg-muted/30 rounded-md border px-2 py-1 text-sm"
            >
              {lang}
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        Requests actually fired: <span className="text-foreground font-mono">{requests}</span>{' '}
        (debounced 300ms; simulated 400ms latency)
      </p>
    </div>
  );
}
