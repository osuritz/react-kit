import { parseFacetValue, splitFacetToken } from './parse';
import { type Clause, type FacetSchema, findFacet } from './types';

export type PartialToken =
  | { kind: 'empty' }
  | { kind: 'free'; text: string }
  | {
      kind: 'facet-name';
      negated: boolean;
      partial: string;
    }
  | {
      kind: 'facet-value';
      negated: boolean;
      facet: string;
      facetKnown: boolean;
      valuePartial: string;
    }
  | {
      kind: 'complete';
      clause: Clause;
      facetKnown: boolean;
    };

/**
 * Classify the trailing partial token in an input buffer for autocomplete and
 * parse-on-space handling. Returns one of:
 *
 * - `empty` — buffer is empty or whitespace
 * - `free` — buffer is plain free text (no `field:` prefix)
 * - `facet-name` — buffer looks like the start of a facet (`from`, `-from`)
 *   but no colon yet; consumers show facet-name suggestions
 * - `facet-value` — `field:` (or `-field:`) typed, value still partial; the
 *   complete flag tells callers whether the field is in the schema
 * - `complete` — buffer parses as a full clause; caller may convert to a chip
 *
 * This intentionally only inspects the LAST whitespace-separated chunk; the
 * caller is responsible for passing the trailing token (i.e. the substring
 * since the last space), not the whole search box value. Quoted values that
 * span spaces should be detected by the caller via balanced-quote checking
 * before calling this function.
 */
export function classifyPartialToken(text: string, schema: FacetSchema): PartialToken {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { kind: 'empty' };

  const split = splitFacetToken(trimmed);
  if (!split) {
    if (trimmed.startsWith('-')) {
      const partial = trimmed.slice(1);
      if (looksLikeFacetNameStart(partial)) {
        return { kind: 'facet-name', negated: true, partial };
      }
    }
    if (looksLikeFacetNameStart(trimmed)) {
      return { kind: 'facet-name', negated: false, partial: trimmed };
    }
    return { kind: 'free', text: trimmed };
  }

  const def = findFacet(schema, split.facet);
  if (split.rest.length === 0) {
    return {
      kind: 'facet-value',
      negated: split.negated,
      facet: split.facet,
      facetKnown: def != null,
      valuePartial: '',
    };
  }

  const value = parseFacetValue(split.rest);
  if (!value) {
    return {
      kind: 'facet-value',
      negated: split.negated,
      facet: split.facet,
      facetKnown: def != null,
      valuePartial: split.rest,
    };
  }

  return {
    kind: 'complete',
    clause: {
      facet: split.facet,
      negated: split.negated,
      value,
    },
    facetKnown: def != null,
  };
}

function looksLikeFacetNameStart(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    const ok =
      (ch >= 0x41 && ch <= 0x5a) ||
      (ch >= 0x61 && ch <= 0x7a) ||
      (ch >= 0x30 && ch <= 0x39) ||
      ch === 0x2d ||
      ch === 0x5f ||
      ch === 0x2e;
    if (!ok) return false;
  }
  return true;
}

/**
 * Returns true when the input has an unbalanced double-quote — useful so the
 * chip-strip's parse-on-space handler can avoid splitting `from:"alice ` into
 * a chip while the user is still typing inside quotes.
 */
export function hasOpenQuote(s: string): boolean {
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') inQuote = !inQuote;
  }
  return inQuote;
}
