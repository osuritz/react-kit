import * as React from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { cva } from 'class-variance-authority';
import { hasOpenQuote } from './grammar/partial';
import { clauseToString, valueToString } from './grammar/stringify';
import { cn } from './lib/cn';
import type { UseSearchFacets } from './use-search-facets';
import type { ChipModel } from './grammar/types';

export interface ChipStripProps {
  api: UseSearchFacets;
  placeholder?: string;
  onChipClick?: (index: number) => void;
  onSubmitEmpty?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Visual variants for chips. Driven by the AST `negated` flag so the
 * accessible state (announced via the chip's edit/remove labels and the
 * negate toggle's `aria-pressed`) and the visual treatment stay in sync.
 */
const chipVariants = cva(
  'group/chip inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      negated: {
        false: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        true: 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 dark:bg-destructive/15 dark:hover:bg-destructive/25',
      },
    },
    defaultVariants: { negated: false },
  }
);

const chipIconButton = cn(
  'inline-flex size-5 shrink-0 items-center justify-center rounded-sm leading-none opacity-60 transition-opacity',
  'hover:bg-foreground/10 hover:opacity-100',
  'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'
);

/**
 * Build a screen-reader friendly label for a chip, e.g.
 *   "Filter: from is bob"  /  "Filter: from is NOT bob"
 * The leading word "Filter" gives non-sighted users context, and "NOT" is
 * spelled out so the negation state is unambiguous when read aloud.
 */
function chipAccessibleLabel(chip: ChipModel, kind: 'edit' | 'filter'): string {
  const prefix = kind === 'edit' ? 'Edit filter' : 'Filter';
  const verb = chip.clause.negated ? 'is NOT' : 'is';
  const value = valueToString(chip.clause.value);
  return `${prefix}: ${chip.clause.facet} ${verb} ${value}`;
}

/**
 * Internal subcomponent that renders the Base UI Combobox chip strip plus the
 * text input. The host `<SearchFacets>` is responsible for wrapping this in a
 * `<Combobox.Root multiple ...>` so that chips can claim id slots in the
 * combobox value array.
 */
export function ChipStrip(props: ChipStripProps): React.JSX.Element {
  const { api, placeholder, onChipClick, onSubmitEmpty, inputRef } = props;

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      api.setInputValue(next);
      if (next.length > 0 && next.endsWith(' ') && !hasOpenQuote(next)) {
        // Try to commit; if it commits, the hook clears the buffer itself.
        api.commitTrailingToken();
      }
    },
    [api]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && api.inputValue.length === 0) {
        if (api.chips.length > 0) {
          e.preventDefault();
          api.removeClause(api.chips.length - 1);
        }
        return;
      }
      if (e.key === 'Enter') {
        if (api.inputValue.trim().length > 0) {
          if (!hasOpenQuote(api.inputValue) && api.commitTrailingToken()) {
            e.preventDefault();
            return;
          }
        } else if (onSubmitEmpty) {
          e.preventDefault();
          onSubmitEmpty();
        }
      }
    },
    [api, onSubmitEmpty]
  );

  return (
    <Combobox.Chips
      data-slot="search-facets-input-group"
      className={cn(
        'flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs transition-colors',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 focus-within:outline-none',
        'dark:bg-input/30'
      )}
    >
      {api.chips.map((chip) => {
        const id = `${chip.index}::${clauseToString(chip.clause)}`;
        const filterLabel = chipAccessibleLabel(chip, 'filter');
        const editLabel = chipAccessibleLabel(chip, 'edit');
        return (
          <Combobox.Chip
            key={id}
            data-slot="search-facets-chip"
            data-facet={chip.clause.facet}
            data-negated={chip.clause.negated ? '' : undefined}
            aria-label={filterLabel}
            className={chipVariants({ negated: chip.clause.negated })}
          >
            <button
              type="button"
              data-slot="search-facets-chip-negate"
              aria-label={chip.clause.negated ? 'Remove negation' : 'Negate filter'}
              aria-pressed={chip.clause.negated}
              className={chipIconButton}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                api.toggleNegation(chip.index);
              }}
            >
              {chip.clause.negated ? '+' : '−'}
            </button>
            <button
              type="button"
              data-slot="search-facets-chip-label"
              aria-label={editLabel}
              className={cn(
                'cursor-pointer rounded-sm px-1 text-left whitespace-nowrap',
                'appearance-none border-0 bg-transparent p-0 font-inherit text-inherit',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring'
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (onChipClick) onChipClick(chip.index);
              }}
            >
              {clauseToString(chip.clause)}
            </button>
            <Combobox.ChipRemove
              data-slot="search-facets-chip-remove"
              aria-label={`Remove ${filterLabel.replace(/^Filter: /, 'filter ')}`}
              className={chipIconButton}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                api.removeClause(chip.index);
              }}
            >
              {'×'}
            </Combobox.ChipRemove>
          </Combobox.Chip>
        );
      })}
      <Combobox.Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        data-slot="search-facets-input"
        className={cn(
          'min-w-16 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none',
          'placeholder:text-muted-foreground'
        )}
        placeholder={placeholder}
        value={api.inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </Combobox.Chips>
  );
}
