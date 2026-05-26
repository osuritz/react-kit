import {
  type Clause,
  type CompareOp,
  type FacetDef,
  type FacetSchema,
  findFacet,
  type ParseError,
  type Query,
  type Value,
} from './types';

export interface ParseResult {
  ast: Query;
  errors: ParseError[];
}

interface RawToken {
  /** Token text with quotes preserved as authored. */
  text: string;
  start: number;
  end: number;
  /** True when at least one balanced quoted region appeared in the token. */
  quoted: boolean;
}

const QUOTE = '"';

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/**
 * Tokenize an input string into whitespace-separated tokens. Whitespace
 * inside a balanced quoted run does NOT split — `from:"a b"` is one token.
 * The token's `text` retains the quote characters as authored so downstream
 * parsers can distinguish quoted regions (necessary for splitting on the
 * first UNQUOTED colon). Backslash-escaped quotes inside a quoted run are
 * preserved as-is in the text and unescaped only when the value itself is
 * later resolved.
 */
export function tokenize(input: string): RawToken[] {
  const tokens: RawToken[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && isWhitespace(input[i]!)) i++;
    if (i >= input.length) break;
    const start = i;
    let buf = '';
    let sawQuote = false;
    while (i < input.length && !isWhitespace(input[i]!)) {
      const ch = input[i]!;
      if (ch === QUOTE) {
        sawQuote = true;
        buf += ch;
        i++;
        while (i < input.length && input[i] !== QUOTE) {
          const c = input[i]!;
          if (c === '\\' && i + 1 < input.length) {
            const next = input[i + 1]!;
            if (next === QUOTE || next === '\\') {
              buf += '\\' + next;
              i += 2;
              continue;
            }
          }
          buf += c;
          i++;
        }
        if (i < input.length && input[i] === QUOTE) {
          buf += QUOTE;
          i++;
        }
        continue;
      }
      buf += ch;
      i++;
    }
    tokens.push({ text: buf, start, end: i, quoted: sawQuote });
  }
  return tokens;
}

/**
 * Split a single token into its facet prefix and the remainder. Returns null
 * when the token does not begin with a `field:` (or `-field:`) prefix.
 *
 * The split point is the FIRST unquoted colon. Quoted regions may contain
 * literal colons (`from:"a:b"`) without splitting.
 */
export function splitFacetToken(text: string): {
  negated: boolean;
  facet: string;
  rest: string;
} | null {
  if (text.length === 0) return null;
  let i = 0;
  let negated = false;
  if (text[0] === '-') {
    negated = true;
    i = 1;
  }
  const facetStart = i;
  let inQuote = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === QUOTE) {
      inQuote = !inQuote;
      i++;
      continue;
    }
    if (!inQuote && ch === ':') {
      const facet = text.slice(facetStart, i);
      if (!isFacetName(facet)) return null;
      return { negated, facet, rest: text.slice(i + 1) };
    }
    i++;
  }
  return null;
}

function isFacetName(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    const isLetter = (ch >= 0x41 && ch <= 0x5a) || (ch >= 0x61 && ch <= 0x7a);
    const isDigit = ch >= 0x30 && ch <= 0x39;
    const isAllowed = ch === 0x2d || ch === 0x5f || ch === 0x2e;
    if (!isLetter && !isDigit && !isAllowed) return false;
  }
  return true;
}

/**
 * Parse the value portion of a facet token (everything after `field:`) into a
 * `Value`. Supports leading comparison operators (`>=`, `<=`, `=`, `>`, `<`)
 * and `<from>..<to>` ranges. When no operator is present the result is a
 * `literal` value carrying the raw text.
 *
 * Quoted values arrive here already unquoted (the tokenizer strips quotes),
 * but we re-strip if needed because partial-input callers may hand us a
 * still-quoted string.
 */
export function parseFacetValue(rest: string): Value | null {
  if (rest.length === 0) return null;
  const dotIdx = findUnquotedRange(rest);
  if (dotIdx >= 0) {
    const from = stripQuotes(rest.slice(0, dotIdx));
    const to = stripQuotes(rest.slice(dotIdx + 2));
    if (from.length === 0 || to.length === 0) return null;
    return { kind: 'range', from, to };
  }
  const op = readCompareOp(rest);
  if (op) {
    const raw = stripQuotes(rest.slice(op.consumed));
    if (raw.length === 0) return null;
    return { kind: 'compare', op: op.op, raw };
  }
  return { kind: 'literal', raw: stripQuotes(rest) };
}

function findUnquotedRange(s: string): number {
  let inQuote = false;
  for (let i = 0; i < s.length - 1; i++) {
    const ch = s[i];
    if (ch === QUOTE) {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && ch === '.' && s[i + 1] === '.') return i;
  }
  return -1;
}

function readCompareOp(s: string): { op: CompareOp; consumed: number } | null {
  if (s.startsWith('>=')) return { op: 'gte', consumed: 2 };
  if (s.startsWith('<=')) return { op: 'lte', consumed: 2 };
  if (s.startsWith('>')) return { op: 'gte', consumed: 1 };
  if (s.startsWith('<')) return { op: 'lte', consumed: 1 };
  if (s.startsWith('=')) return { op: 'eq', consumed: 1 };
  return null;
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && s[0] === QUOTE && s[s.length - 1] === QUOTE) {
    return s.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  return s;
}

function stripOuterQuotes(s: string): string {
  return stripQuotes(s);
}

/**
 * Parse a full query string against a schema. Tokens that don't match the
 * `field:value` shape (or whose facet isn't in the schema) accumulate into
 * `freeText` in their original order. Tokens that DO match but reference an
 * unknown facet still produce a clause and an error pointing at the offending
 * token; callers can surface these inline if they want.
 */
export function parseQuery(input: string, schema: FacetSchema): ParseResult {
  const tokens = tokenize(input);
  const clauses: Clause[] = [];
  const freeParts: string[] = [];
  const errors: ParseError[] = [];

  for (const tok of tokens) {
    const split = splitFacetToken(tok.text);
    if (!split) {
      freeParts.push(stripOuterQuotes(tok.text));
      continue;
    }
    const def = findFacet(schema, split.facet);
    const value = parseFacetValue(split.rest);
    if (!def) {
      errors.push({
        message: `Unknown facet "${split.facet}"`,
        index: tok.start,
        length: tok.end - tok.start,
      });
      freeParts.push(stripOuterQuotes(tok.text));
      continue;
    }
    if (!value) {
      errors.push({
        message: `Empty value for facet "${split.facet}"`,
        index: tok.start,
        length: tok.end - tok.start,
      });
      continue;
    }
    const valueError = validateValueShape(def, value, split.negated);
    if (valueError) {
      errors.push({
        message: valueError,
        index: tok.start,
        length: tok.end - tok.start,
      });
    }
    clauses.push({ facet: def.name, negated: split.negated, value });
  }

  return {
    ast: { clauses, freeText: freeParts.join(' ') },
    errors,
  };
}

function validateValueShape(def: FacetDef, value: Value, negated: boolean): string | null {
  if (negated && def.negatable === false) {
    return `Facet "${def.name}" is not negatable`;
  }
  if (def.type === 'boolean') {
    if (value.kind !== 'literal') {
      return `Facet "${def.name}" expects a literal value`;
    }
    if (def.values.length > 0 && !def.values.includes(value.raw)) {
      return `Facet "${def.name}" does not accept value "${value.raw}"`;
    }
  }
  if (def.type === 'enum') {
    if (value.kind !== 'literal') {
      return `Facet "${def.name}" expects a literal value`;
    }
    if (!def.values.some((v) => v.value === value.raw)) {
      return `Facet "${def.name}" does not accept value "${value.raw}"`;
    }
  }
  if (def.type === 'number' || def.type === 'date') {
    if (value.kind === 'literal') {
      return null;
    }
    if (value.kind === 'compare' || value.kind === 'range') {
      const ops = def.ops ?? ['eq', 'gte', 'lte', 'range'];
      if (value.kind === 'range' && !ops.includes('range')) {
        return `Facet "${def.name}" does not allow range values`;
      }
      if (value.kind === 'compare' && !ops.includes(value.op)) {
        return `Facet "${def.name}" does not allow op "${value.op}"`;
      }
    }
  }
  return null;
}
