import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { hasOpenQuote } from "./grammar/partial";
import { clauseToString, valueToString } from "./grammar/stringify";
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
 * Build a screen-reader friendly label for a chip, e.g.
 *   "Filter: from is bob"  /  "Filter: from is NOT bob"
 * The leading word "Filter" gives non-sighted users context, and "NOT" is
 * spelled out so the negation state is unambiguous when read aloud.
 */
function chipAccessibleLabel(chip: ChipModel, kind: "edit" | "filter"): string {
  const prefix = kind === "edit" ? "Edit filter" : "Filter";
  const verb = chip.clause.negated ? "is NOT" : "is";
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
        const filterLabel = chipAccessibleLabel(chip, "filter");
        const editLabel = chipAccessibleLabel(chip, "edit");
        return (
          <Combobox.Chip
            key={id}
            className={cx(
              "search-facets__chip",
              cn.chip,
              chip.clause.negated && "search-facets__chip--negated",
              chip.clause.negated && cn.chipNegated,
            )}
            aria-label={filterLabel}
            data-facet={chip.clause.facet}
            data-negated={chip.clause.negated ? "" : undefined}
          >
            <button
              type="button"
              className="search-facets__chip-negate"
              aria-label={
                chip.clause.negated ? "Remove negation" : "Negate filter"
              }
              aria-pressed={chip.clause.negated}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                api.toggleNegation(chip.index);
              }}
            >
              {chip.clause.negated ? "+" : "−"}
            </button>
            <button
              type="button"
              className="search-facets__chip-label"
              aria-label={editLabel}
              onClick={(event) => {
                event.stopPropagation();
                if (onChipClick) onChipClick(chip.index);
              }}
            >
              {chipLabel(chip)}
            </button>
            <Combobox.ChipRemove
              className={cx("search-facets__chip-remove", cn.chipRemove)}
              aria-label={`Remove ${filterLabel.replace(/^Filter: /, "filter ")}`}
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
