import { useCallback, useMemo, useState } from "react";
import { parseFacetValue, splitFacetToken } from "./grammar/parse";
import {
  classifyPartialToken,
  hasOpenQuote,
  type PartialToken,
} from "./grammar/partial";
import { clauseToString } from "./grammar/stringify";
import {
  type ChipModel,
  type Clause,
  type FacetSchema,
  findFacet,
  type Query,
  type Value,
} from "./grammar/types";

export interface UseSearchFacetsOptions {
  schema: FacetSchema;
  value: Query;
  onChange: (next: Query) => void;
}

export interface FacetSuggestion {
  facet: string;
  label: string;
  description?: string;
}

export interface UseSearchFacets {
  /** Stable, ordered string ids — one per clause. Use as Combobox value. */
  chipIds: string[];
  chips: ChipModel[];
  /** Current free-typing buffer (tokens not yet committed to a chip). */
  inputValue: string;
  /** Whether the trailing partial token is a complete, parseable clause. */
  partial: PartialToken;
  /** Facet-name suggestions for the inline autocomplete dropdown. */
  facetSuggestions: FacetSuggestion[];
  setInputValue: (next: string) => void;
  /** Append a clause and clear the input. */
  addClause: (clause: Clause) => void;
  /** Replace a clause at index. */
  replaceClause: (index: number, clause: Clause) => void;
  removeClause: (index: number) => void;
  toggleNegation: (index: number) => void;
  /** Replace freeText only, preserving clause order. */
  setFreeText: (next: string) => void;
  /**
   * Pop the trailing whitespace-separated chunk from the input buffer if it
   * parses to a complete clause. Returns true when a chip was committed.
   */
  commitTrailingToken: () => boolean;
}

/**
 * Render a clause to a stable string id of the form `<index>::<canonical>`.
 * The index prefix guarantees uniqueness even when two clauses serialize
 * identically (Base UI's multi-select Combobox requires unique values).
 * The canonical stringification is included so the id changes when the
 * clause's shape changes, which is what surfaces removals/edits to the
 * underlying Combobox.
 *
 * Consumers handling Combobox events should reach for the index-based
 * actions (`removeClause(index)`, `replaceClause(index, ...)`) rather than
 * parsing the id back out.
 */
function clauseId(clause: Clause, index: number): string {
  return `${index}::${clauseToString(clause)}`;
}

function buildChipModels(query: Query, schema: FacetSchema): ChipModel[] {
  return query.clauses.map((clause, index) => ({
    index,
    clause,
    facetDef: findFacet(schema, clause.facet) ?? null,
  }));
}

function buildFacetSuggestions(
  partial: PartialToken,
  schema: FacetSchema,
): FacetSuggestion[] {
  if (partial.kind !== "facet-name") return [];
  const needle = partial.partial.toLowerCase();
  return schema
    .filter((f) => f.name.toLowerCase().startsWith(needle))
    .map((f) => ({
      facet: f.name,
      label: f.label ?? f.name,
      description: f.description,
    }));
}

/**
 * Returns the trailing partial-token substring from a buffer — the chunk
 * after the last whitespace that isn't inside an open quote. Used to feed
 * `classifyPartialToken` and to decide what to commit on Space.
 */
function trailingTokenSlice(input: string): {
  before: string;
  trailing: string;
} {
  let lastBoundary = 0;
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && (ch === " " || ch === "\t")) {
      lastBoundary = i + 1;
    }
  }
  return {
    before: input.slice(0, lastBoundary),
    trailing: input.slice(lastBoundary),
  };
}

export function useSearchFacets(
  options: UseSearchFacetsOptions,
): UseSearchFacets {
  const { schema, value, onChange } = options;
  const [inputValue, setInputValue] = useState("");

  const chips = useMemo(() => buildChipModels(value, schema), [value, schema]);
  const chipIds = useMemo(
    () => value.clauses.map((c, i) => clauseId(c, i)),
    [value.clauses],
  );

  const partial = useMemo<PartialToken>(() => {
    const { trailing } = trailingTokenSlice(inputValue);
    return classifyPartialToken(trailing, schema);
  }, [inputValue, schema]);

  const facetSuggestions = useMemo(
    () => buildFacetSuggestions(partial, schema),
    [partial, schema],
  );

  const addClause = useCallback(
    (clause: Clause) => {
      onChange({ ...value, clauses: [...value.clauses, clause] });
    },
    [onChange, value],
  );

  const replaceClause = useCallback(
    (index: number, clause: Clause) => {
      const next = value.clauses.slice();
      next[index] = clause;
      onChange({ ...value, clauses: next });
    },
    [onChange, value],
  );

  const removeClause = useCallback(
    (index: number) => {
      const next = value.clauses.slice();
      next.splice(index, 1);
      onChange({ ...value, clauses: next });
    },
    [onChange, value],
  );

  const toggleNegation = useCallback(
    (index: number) => {
      const clause = value.clauses[index];
      if (!clause) return;
      const def = findFacet(schema, clause.facet);
      if (def && def.negatable === false) return;
      const next = value.clauses.slice();
      next[index] = { ...clause, negated: !clause.negated };
      onChange({ ...value, clauses: next });
    },
    [onChange, schema, value],
  );

  const setFreeText = useCallback(
    (text: string) => {
      onChange({ ...value, freeText: text });
    },
    [onChange, value],
  );

  const commitTrailingToken = useCallback((): boolean => {
    const { before, trailing } = trailingTokenSlice(inputValue);
    if (trailing.length === 0) return false;
    if (hasOpenQuote(trailing)) return false;
    const split = splitFacetToken(trailing);
    if (!split) return false;
    const def = findFacet(schema, split.facet);
    if (!def) return false;
    const v: Value | null = parseFacetValue(split.rest);
    if (!v) return false;
    if (split.negated && def.negatable === false) return false;
    addClause({ facet: split.facet, negated: split.negated, value: v });
    setInputValue(before.trimEnd().length === 0 ? "" : before);
    return true;
  }, [inputValue, schema, addClause]);

  return {
    chipIds,
    chips,
    inputValue,
    partial,
    facetSuggestions,
    setInputValue,
    addClause,
    replaceClause,
    removeClause,
    toggleNegation,
    setFreeText,
    commitTrailingToken,
  };
}
