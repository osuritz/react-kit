import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { hasOpenQuote } from "./grammar/partial";
import { clauseToString } from "./grammar/stringify";
import type { UseSearchFacets } from "./use-search-facets";
import type { ChipModel } from "./grammar/types";

export interface ChipStripClassNames {
  inputGroup?: string;
  chip?: string;
  chipNegated?: string;
  chipRemove?: string;
  input?: string;
  popup?: string;
  suggestion?: string;
}

export interface ChipStripProps {
  api: UseSearchFacets;
  placeholder?: string;
  classNames?: ChipStripClassNames;
  onChipClick?: (index: number) => void;
  onSubmitEmpty?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function chipLabel(chip: ChipModel): string {
  return clauseToString(chip.clause);
}

/**
 * Internal subcomponent that renders the Base UI Combobox chip strip plus the
 * text input. The host `<SearchFacets>` is responsible for wrapping this in a
 * `<Combobox.Root multiple ...>` so that chips can claim id slots in the
 * combobox value array.
 */
export function ChipStrip(props: ChipStripProps): React.JSX.Element {
  const { api, placeholder, classNames, onChipClick, onSubmitEmpty, inputRef } =
    props;

  const cn = classNames ?? {};

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      api.setInputValue(next);
      if (next.length > 0 && next.endsWith(" ") && !hasOpenQuote(next)) {
        // Try to commit; if it commits, the hook clears the buffer itself.
        api.commitTrailingToken();
      }
    },
    [api],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && api.inputValue.length === 0) {
        if (api.chips.length > 0) {
          e.preventDefault();
          api.removeClause(api.chips.length - 1);
        }
        return;
      }
      if (e.key === "Enter") {
        // Commit any pending complete token first.
        if (api.inputValue.trim().length > 0) {
          if (
            !hasOpenQuote(api.inputValue) &&
            api.commitTrailingToken()
          ) {
            e.preventDefault();
            return;
          }
        } else if (onSubmitEmpty) {
          e.preventDefault();
          onSubmitEmpty();
        }
      }
    },
    [api, onSubmitEmpty],
  );

  return (
    <Combobox.Chips
      className={cx("search-facets__input-group", cn.inputGroup)}
    >
      {api.chips.map((chip) => {
        const id = `${chip.index}::${clauseToString(chip.clause)}`;
        return (
          <Combobox.Chip
            key={id}
            className={cx(
              "search-facets__chip",
              cn.chip,
              chip.clause.negated && "search-facets__chip--negated",
              chip.clause.negated && cn.chipNegated,
            )}
            onClick={(event) => {
              // Prevent the chip click from bubbling into the input focus
              // logic in a way that triggers Combobox selection.
              event.stopPropagation();
              if (onChipClick) onChipClick(chip.index);
            }}
            data-facet={chip.clause.facet}
            data-negated={chip.clause.negated ? "" : undefined}
          >
            <button
              type="button"
              className="search-facets__chip-negate"
              aria-label={
                chip.clause.negated ? "Remove negation" : "Negate filter"
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                api.toggleNegation(chip.index);
              }}
            >
              {chip.clause.negated ? "+" : "−"}
            </button>
            <span className="search-facets__chip-label">{chipLabel(chip)}</span>
            <Combobox.ChipRemove
              className={cx("search-facets__chip-remove", cn.chipRemove)}
              aria-label={`Remove filter ${chip.clause.facet}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                api.removeClause(chip.index);
              }}
            >
              {"×"}
            </Combobox.ChipRemove>
          </Combobox.Chip>
        );
      })}
      <Combobox.Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={cx("search-facets__input", cn.input)}
        placeholder={placeholder}
        value={api.inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </Combobox.Chips>
  );
}
