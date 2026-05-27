// Peer requirements: react >=18, react-dom >=18, @base-ui/react >=1.4,
// clsx >=2, tailwind-merge >=2, class-variance-authority >=0.7. Tailwind
// v4 + the standard shadcn theme tokens (`bg-popover`,
// `text-popover-foreground`, `border-input`, ...) are expected at the
// host-app level — see `index.css` in the demo or the shadcn
// `tailwind.css` import.
//
// Optional peer: react-day-picker >=9.1 — required only if your schema
// declares a `date` facet (transitively imported via builder-popover →
// editors/date-editor).
import * as React from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { ChipStrip } from './chip-strip';
import { useSearchFacets } from './use-search-facets';
import { BuilderPopover } from './builder-popover';
import { cn } from './lib/cn';
import type { FacetSchema, Query } from './grammar/types';

export interface BuilderTriggerApi {
  schema: FacetSchema;
  value: Query;
  onChange: (next: Query) => void;
  /** Index of clause to edit, or null for "add new". */
  editingIndex: number | null;
  /** Imperatively close the builder. */
  closeBuilder: () => void;
  /** Imperatively open builder, optionally for a specific clause index. */
  openBuilder: (index?: number | null) => void;
  /** True when the builder is open. */
  isOpen: boolean;
}

export interface SearchFacetsProps {
  schema: FacetSchema;
  value: Query;
  onChange: (next: Query) => void;
  placeholder?: string;
  /** Caller classes for the root container. Merged with `tailwind-merge`. */
  className?: string;
  onSubmit?: (q: Query) => void;
  /**
   * Optional render-prop slot for the builder popover trigger area. Wire the
   * imperative `openBuilder` / `closeBuilder` actions to event handlers
   * (`onClick`, etc.); don't invoke them during render — they read DOM focus
   * and refs and update state, so calling them while rendering is unsafe.
   */
  renderBuilderTrigger?: (api: BuilderTriggerApi) => React.ReactNode;
}

/**
 * `<SearchFacets/>` — top-level controlled component.
 *
 * Owns the controlled `value`/`onChange` of a faceted query AST. Chips render
 * inside a Base UI `Combobox.Root` configured for multi-select; the chip
 * strip and input live inside `chip-strip.tsx`. Adding chips happens through
 * `commitTrailingToken()` driven by space/Enter on the input — never through
 * Combobox's own value events.
 *
 * The builder popover is rendered inline by default, anchored to a built-in
 * "+ Add filter" trigger. Pass `renderBuilderTrigger` to take over the
 * trigger area; you receive a `BuilderTriggerApi` object describing
 * `editingIndex` / `isOpen` plus imperative `openBuilder` / `closeBuilder`
 * actions, and you become responsible for rendering your own `<BuilderPopover>`.
 */
export function SearchFacets(props: SearchFacetsProps): React.JSX.Element {
  const { schema, value, onChange, placeholder, className, onSubmit, renderBuilderTrigger } = props;

  const api = useSearchFacets({ schema, value, onChange });

  // Polite live announcements for chip add/remove. We compare the previous
  // clause count to the current one *while rendering* (React's "adjust state
  // during render" pattern) and update the announcement when it changes.
  // Deriving it here rather than in an effect avoids a cascading post-paint
  // re-render; the sr-only region below is always mounted (empty at first),
  // so each text change is observed and announced by assistive tech.
  //
  // `seq` increments on every announcement and toggles a trailing zero-width
  // space below, so two consecutive identical messages (e.g. two removals in
  // a row) still mutate the region's text — an aria-live region whose value
  // is unchanged is not re-announced.
  const [prevCount, setPrevCount] = React.useState<number>(value.clauses.length);
  const [live, setLive] = React.useState<{ text: string; seq: number }>({ text: '', seq: 0 });
  const nextCount = value.clauses.length;
  if (nextCount !== prevCount) {
    let text: string | null = null;
    if (nextCount > prevCount) {
      const added = value.clauses[nextCount - 1];
      if (added) {
        text = `Filter added: ${added.facet} ${added.negated ? 'is NOT' : 'is'} ${
          added.value.kind === 'literal'
            ? added.value.raw
            : added.value.kind === 'compare'
              ? `${added.value.op} ${added.value.raw}`
              : `${added.value.from} to ${added.value.to}`
        }`;
      }
    } else {
      text = 'Filter removed';
    }
    if (text !== null) {
      const announcement = text;
      setLive((prev) => ({ text: announcement, seq: prev.seq + 1 }));
    }
    setPrevCount(nextCount);
  }
  // U+200B (zero-width space) is the nonce of choice: it mutates the region's
  // textContent so assistive tech re-announces, yet it is invisible, not spoken
  // by screen readers, and not matched by `\s`, so it survives the whitespace
  // normalization that text assertions and the DOM apply to a trailing space.
  const liveMessage = live.text === '' ? '' : `${live.text}${'\u200B'.repeat(live.seq % 2)}`;

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  // Element that had focus when the builder opened — focus is restored here
  // when the builder closes, so keyboard / screen-reader users land back where
  // they invoked the popover (the chip's edit button or the "+ Add filter").
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);

  const openBuilder = React.useCallback((index?: number | null) => {
    if (typeof document !== 'undefined') {
      const el = document.activeElement;
      if (el instanceof HTMLElement) {
        lastTriggerRef.current = el;
      }
    }
    setEditingIndex(index ?? null);
    setIsOpen(true);
  }, []);

  const closeBuilder = React.useCallback(() => {
    setIsOpen(false);
    setEditingIndex(null);
    // Defer to next frame so Base UI's portal teardown runs first.
    const target = lastTriggerRef.current ?? triggerRef.current;
    if (target && typeof target.focus === 'function') {
      requestAnimationFrame(() => {
        target.focus();
      });
    }
  }, []);

  const handleChipClick = React.useCallback(
    (index: number) => {
      openBuilder(index);
    },
    [openBuilder]
  );

  const handleSubmitEmpty = React.useCallback(() => {
    if (onSubmit) onSubmit(value);
  }, [onSubmit, value]);

  // Keep Base UI's internal multi-select value array in sync with our chip ids.
  // We only use `onValueChange` to detect chip removals (Base UI auto-handles
  // its ChipRemove button); additions never come through this channel.
  const handleComboboxValueChange = React.useCallback(
    (nextIds: string[]) => {
      if (nextIds.length >= api.chipIds.length) return;
      let removedIndex = -1;
      const nextSet = new Set(nextIds);
      for (let i = 0; i < api.chipIds.length; i++) {
        if (!nextSet.has(api.chipIds[i]!)) {
          removedIndex = i;
          break;
        }
      }
      if (removedIndex >= 0) api.removeClause(removedIndex);
    },
    [api]
  );

  // Inline facet-name suggestions — only shown when the trailing partial token
  // is a facet-name fragment.
  const showSuggestions = api.partial.kind === 'facet-name' && api.facetSuggestions.length > 0;

  const handleSuggestionSelect = React.useCallback(
    (facet: string) => {
      // Replace the trailing partial token with `[facet]:` and re-focus.
      const buf = api.inputValue;
      let lastBoundary = 0;
      let inQuote = false;
      for (let i = 0; i < buf.length; i++) {
        const ch = buf[i]!;
        if (ch === '"') {
          inQuote = !inQuote;
          continue;
        }
        if (!inQuote && (ch === ' ' || ch === '\t')) lastBoundary = i + 1;
      }
      const before = buf.slice(0, lastBoundary);
      const trailing = buf.slice(lastBoundary);
      const negated = trailing.startsWith('-');
      const prefix = negated ? '-' : '';
      api.setInputValue(`${before}${prefix}${facet}:`);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [api]
  );

  const triggerApi: BuilderTriggerApi = {
    schema,
    value,
    onChange,
    editingIndex,
    closeBuilder,
    openBuilder,
    isOpen,
  };

  return (
    <div
      data-slot="search-facets"
      className={cn('flex w-full flex-wrap items-center gap-2', className)}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </div>
      <Combobox.Root<string, true>
        multiple
        value={api.chipIds}
        onValueChange={handleComboboxValueChange}
        items={api.facetSuggestions.map((s) => s.facet)}
      >
        <ChipStrip
          api={api}
          placeholder={placeholder}
          onChipClick={handleChipClick}
          onSubmitEmpty={onSubmit ? handleSubmitEmpty : undefined}
          inputRef={inputRef}
        />
        {showSuggestions ? (
          <Combobox.Portal>
            <Combobox.Positioner sideOffset={4}>
              <Combobox.Popup
                data-slot="search-facets-suggestions"
                className={cn(
                  'z-50 max-h-72 min-w-48 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden',
                  'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 transition-[opacity,scale] duration-150'
                )}
              >
                <Combobox.List>
                  {api.facetSuggestions.map((s) => (
                    <Combobox.Item
                      key={s.facet}
                      value={s.facet}
                      data-slot="search-facets-suggestion"
                      className={cn(
                        'flex cursor-pointer flex-col gap-0.5 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
                        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'
                      )}
                      onClick={(event) => {
                        // Suppress Base UI's default select behavior — we
                        // don't want this item added to the multi-select
                        // value array; we only use it to mutate the input
                        // buffer.
                        event.preventDefault();
                        handleSuggestionSelect(s.facet);
                      }}
                    >
                      <span className="font-medium">{s.label}</span>
                      {s.description ? (
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      ) : null}
                    </Combobox.Item>
                  ))}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        ) : null}
      </Combobox.Root>
      {renderBuilderTrigger ? (
        // oxlint-disable-next-line react-hooks-js/refs -- false positive: triggerApi only bundles the openBuilder/closeBuilder callbacks, which read triggerRef/lastTriggerRef when invoked from event handlers, never during render. The render prop receives them to wire its own UI; the public BuilderTriggerApi exposes no ref.
        renderBuilderTrigger(triggerApi)
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            data-slot="search-facets-trigger"
            className={cn(
              'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium whitespace-nowrap shadow-xs transition-colors',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              'aria-expanded:bg-muted aria-expanded:text-foreground',
              'dark:border-input dark:bg-input/30 dark:hover:bg-input/50'
            )}
            onClick={() => openBuilder(null)}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            + Add filter
          </button>
          <BuilderPopover
            schema={schema}
            value={value}
            onChange={onChange}
            editingIndex={editingIndex}
            open={isOpen}
            onOpenChange={(o) => (o ? openBuilder(editingIndex) : closeBuilder())}
            anchor={triggerRef}
          />
        </>
      )}
    </div>
  );
}
