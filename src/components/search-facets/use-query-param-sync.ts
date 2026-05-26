import { useEffect, useRef } from 'react';
import { parseQuery } from './grammar/parse';
import { queryToString } from './grammar/stringify';
import type { Clause, FacetSchema, Query, Value } from './grammar/types';

export interface UseQueryParamSyncOptions {
  /** URL search-param key. Default: "q". */
  paramKey?: string;
  /** Schema used to round-trip the query string. Required because parseQuery needs it. */
  schema: FacetSchema;
  /**
   * Strategy for writing the URL: "push" appends to history, "replace" overwrites
   * the current entry. Default: "replace" (avoids history pollution while typing).
   */
  history?: 'push' | 'replace';
}

/**
 * Optional URL-persistence helper for `SearchFacets`. Bridges a `Query` AST and
 * a single URL search-param (default `q`) so that page reloads, back/forward
 * navigation, and shareable links round-trip the user's query.
 *
 * Router-agnostic: depends only on the platform `URLSearchParams` and `history`
 * APIs. Use it alongside any router (or none).
 *
 * Behavior:
 *   - On mount, parses the URL's `paramKey` and calls `onChange` if it differs
 *     from `value`.
 *   - When `value` changes, serializes it back into the URL (skipping the write
 *     if it already matches, to avoid feedback loops).
 *   - Listens for `popstate` and re-syncs into `onChange`.
 *
 * SSR-safe: this hook is a no-op when `window` is undefined.
 */
export function useQueryParamSync(
  value: Query,
  onChange: (next: Query) => void,
  options: UseQueryParamSyncOptions
): void {
  const { paramKey = 'q', schema, history: historyMode = 'replace' } = options;

  // Keep latest closures in refs so the popstate listener doesn't need to
  // re-bind on every render.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const schemaRef = useRef(schema);
  const paramKeyRef = useRef(paramKey);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);
  useEffect(() => {
    paramKeyRef.current = paramKey;
  }, [paramKey]);

  // 1. Mount: hydrate from URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramKeyRef.current) ?? '';
    const { ast } = parseQuery(raw, schemaRef.current);
    if (!queriesEqual(ast, valueRef.current)) {
      onChangeRef.current(ast);
    }
    // Run once on mount only — re-running on prop changes is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. popstate: re-hydrate when the user navigates the history stack.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get(paramKeyRef.current) ?? '';
      const { ast } = parseQuery(raw, schemaRef.current);
      if (!queriesEqual(ast, valueRef.current)) {
        onChangeRef.current(ast);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // 3. Value change: write to URL if it differs from what's already there.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serialized = queryToString(value);
    const params = new URLSearchParams(window.location.search);
    const current = params.get(paramKey) ?? '';
    if (current === serialized) return;
    if (serialized.length === 0) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, serialized);
    }
    const search = params.toString();
    const url =
      window.location.pathname + (search.length > 0 ? `?${search}` : '') + window.location.hash;
    if (historyMode === 'push') {
      window.history.pushState(window.history.state, '', url);
    } else {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [value, paramKey, historyMode]);
}

/** Deep equality for two `Query` values. */
function queriesEqual(a: Query, b: Query): boolean {
  if (a === b) return true;
  if (a.freeText !== b.freeText) return false;
  if (a.clauses.length !== b.clauses.length) return false;
  for (let i = 0; i < a.clauses.length; i++) {
    if (!clausesEqual(a.clauses[i]!, b.clauses[i]!)) return false;
  }
  return true;
}

function clausesEqual(a: Clause, b: Clause): boolean {
  if (a.facet !== b.facet) return false;
  if (a.negated !== b.negated) return false;
  return valuesEqual(a.value, b.value);
}

function valuesEqual(a: Value, b: Value): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'literal' && b.kind === 'literal') {
    return a.raw === b.raw;
  }
  if (a.kind === 'compare' && b.kind === 'compare') {
    return a.op === b.op && a.raw === b.raw;
  }
  if (a.kind === 'range' && b.kind === 'range') {
    return a.from === b.from && a.to === b.to;
  }
  return false;
}
