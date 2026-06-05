import { useRef, useState } from 'react';
import { useKeyboard } from '#hooks/use-keyboard/use-keyboard.ts';

const TASKS = ['Triage the inbox', 'Review PR #42', 'Update the changelog', 'Cut the release'];

export function KeyboardDemo() {
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [filter, setFilter] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);

  const visible = TASKS.map((label, id) => ({ label, id })).filter(({ label }) =>
    label.toLowerCase().includes(filter.trim().toLowerCase())
  );
  // Clamp: the filter can shrink the list under the cursor.
  const selected = Math.min(cursor, Math.max(visible.length - 1, 0));

  useKeyboard({
    j: () => setCursor(Math.min(selected + 1, Math.max(visible.length - 1, 0))),
    k: () => setCursor(Math.max(selected - 1, 0)),
    'g g': () => setCursor(0),
    'mod+k': () => filterRef.current?.focus(),
    // `x` (the Gmail/Linear toggle idiom), NOT bare `enter`: this listener is
    // document-wide and claims what it matches — binding `enter` would hijack
    // Enter-activation of any focused link or button on the page.
    x: () => {
      const id = visible[selected]?.id;
      if (id === undefined) return;
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
  });
  // Escape should work *while typing* in the filter — the editable-target
  // guard (on by default) would swallow it, so it gets its own opted-in call.
  useKeyboard('escape', () => filterRef.current?.blur(), { allowInInput: true });

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <input
        ref={filterRef}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter tasks… (mod+k)"
        aria-label="Filter tasks"
        className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 focus-visible:outline-none"
      />
      <ul aria-label="Tasks" className="flex flex-col gap-1">
        {visible.map(({ label, id }, i) => (
          <li
            key={id}
            aria-current={i === selected || undefined}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              i === selected ? 'bg-muted' : ''
            }`}
          >
            <span
              aria-hidden
              className={`inline-block size-1.5 rounded-full ${
                done.has(id) ? 'bg-foreground' : 'border-muted-foreground border'
              }`}
            />
            <span className={done.has(id) ? 'text-muted-foreground line-through' : ''}>
              {label}
              {done.has(id) ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="text-muted-foreground px-2 py-1.5 text-sm">No tasks match.</li>
        ) : null}
      </ul>
      <p className="text-muted-foreground text-xs">
        <kbd className="font-mono">j</kbd>/<kbd className="font-mono">k</kbd> move ·{' '}
        <kbd className="font-mono">x</kbd> toggle · <kbd className="font-mono">g g</kbd> top ·{' '}
        <kbd className="font-mono">mod+k</kbd> filter · <kbd className="font-mono">Esc</kbd> leave
        the filter. While typing in the filter, <kbd className="font-mono">j</kbd>/
        <kbd className="font-mono">k</kbd> just type — the editable-target guard is on by default.
      </p>
    </div>
  );
}
