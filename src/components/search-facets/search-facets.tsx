// Peer requirements: react >=18, react-dom >=18, @base-ui/react >=1.0.
import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChipStrip } from "./chip-strip";
import { useSearchFacets } from "./use-search-facets";
import { BuilderPopover } from "./builder-popover";
import type { FacetSchema, Query } from "./grammar/types";

export interface SearchFacetsClassNames {
  root: string;
  inputGroup: string;
  chip: string;
  chipNegated: string;
  chipRemove: string;
  input: string;
  triggerButton: string;
  suggestion: string;
  popup: string;
}

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
  className?: string;
  classNames?: Partial<SearchFacetsClassNames>;
  onSubmit?: (q: Query) => void;
  /** Optional render-prop slot for the builder popover trigger area. */
  renderBuilderTrigger?: (api: BuilderTriggerApi) => React.ReactNode;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * `<SearchFacets/>` — top-level controlled component.
 *
 * Owns the controlled `value`/`onChange` of a faceted query AST. Chips render
 * inside a Base UI `Combobox.Root` configured for multi-select; the chip
 * strip and input live inside `chip-strip.tsx`. Adding chips happens through
 * `commitTrailingToken()` driven by space/Enter on the input — never through
 * Combobox's own value events. The builder popover (rendered by the
 * `renderBuilderTrigger` slot) is owned externally; this component only
 * tracks `editingIndex` and `isOpen` and threads them through `BuilderTriggerApi`.
 */
export function SearchFacets(props: SearchFacetsProps): React.JSX.Element {
  const {
    schema,
    value,
    onChange,
    placeholder,
    className,
    classNames,
    onSubmit,
    renderBuilderTrigger,
  } = props;

  const cn = classNames ?? {};

  const api = useSearchFacets({ schema, value, onChange });

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const openBuilder = React.useCallback((index?: number | null) => {
    setEditingIndex(index ?? null);
    setIsOpen(true);
  }, []);

  const closeBuilder = React.useCallback(() => {
    setIsOpen(false);
    setEditingIndex(null);
  }, []);

  const handleChipClick = React.useCallback(
    (index: number) => {
      openBuilder(index);
    },
    [openBuilder],
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
      // Find the first id that disappeared and remove that clause.
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
    [api],
  );

  // Inline facet-name suggestions — only shown when the trailing partial token
  // is a facet-name fragment.
  const showSuggestions =
    api.partial.kind === "facet-name" && api.facetSuggestions.length > 0;

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
        if (!inQuote && (ch === " " || ch === "\t")) lastBoundary = i + 1;
      }
      const before = buf.slice(0, lastBoundary);
      const trailing = buf.slice(lastBoundary);
      const negated = trailing.startsWith("-");
      const prefix = negated ? "-" : "";
      api.setInputValue(`${before}${prefix}${facet}:`);
      // Re-focus the input after selection.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [api],
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
    <div className={cx("search-facets", cn.root, className)}>
      <Combobox.Root<string, true>
        multiple
        value={api.chipIds}
        onValueChange={handleComboboxValueChange}
        items={api.facetSuggestions.map((s) => s.facet)}
      >
        <ChipStrip
          api={api}
          placeholder={placeholder}
          classNames={{
            inputGroup: cn.inputGroup,
            chip: cn.chip,
            chipNegated: cn.chipNegated,
            chipRemove: cn.chipRemove,
            input: cn.input,
          }}
          onChipClick={handleChipClick}
          onSubmitEmpty={onSubmit ? handleSubmitEmpty : undefined}
          inputRef={inputRef}
        />
        {showSuggestions ? (
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup
                className={cx("search-facets__popup", cn.popup)}
              >
                <Combobox.List>
                  {api.facetSuggestions.map((s) => (
                    <Combobox.Item
                      key={s.facet}
                      value={s.facet}
                      className={cx(
                        "search-facets__suggestion",
                        cn.suggestion,
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
                      <span className="search-facets__suggestion-label">
                        {s.label}
                      </span>
                      {s.description ? (
                        <span className="search-facets__suggestion-description">
                          {s.description}
                        </span>
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
        renderBuilderTrigger(triggerApi)
      ) : (
        <>
          <button
            ref={triggerRef}
            type="button"
            className={cx("search-facets__trigger", cn.triggerButton)}
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
            anchor={triggerRef.current}
            classNames={{ popup: cn.popup }}
          />
        </>
      )}
    </div>
  );
}
