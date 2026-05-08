import type { Clause, Query, Value } from "./types";

const QUOTE = '"';

/**
 * Serialize a `Query` AST to a canonical, parseable string. Round-trips with
 * `parseQuery` against any schema that recognizes the clause facets — the
 * stringifier never inspects the schema, so unknown facets in the AST are
 * still emitted as `field:value` (and would parse back as free text under
 * a schema that doesn't know about them). Free text comes after clauses,
 * separated by single spaces.
 */
export function queryToString(ast: Query): string {
  const parts: string[] = [];
  for (const clause of ast.clauses) {
    parts.push(clauseToString(clause));
  }
  if (ast.freeText.trim().length > 0) {
    parts.push(ast.freeText.trim());
  }
  return parts.join(" ");
}

export function clauseToString(clause: Clause): string {
  const prefix = clause.negated ? "-" : "";
  return `${prefix}${clause.facet}:${valueToString(clause.value)}`;
}

export function valueToString(value: Value): string {
  switch (value.kind) {
    case "literal":
      return quoteIfNeeded(value.raw);
    case "compare":
      return `${opToString(value.op)}${quoteIfNeeded(value.raw)}`;
    case "range":
      return `${quoteIfNeeded(value.from)}..${quoteIfNeeded(value.to)}`;
  }
}

function opToString(op: "eq" | "gte" | "lte"): string {
  if (op === "eq") return "=";
  if (op === "gte") return ">=";
  return "<=";
}

function quoteIfNeeded(raw: string): string {
  if (raw.length === 0) return `${QUOTE}${QUOTE}`;
  let needs = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (
      ch === " " ||
      ch === "\t" ||
      ch === "\n" ||
      ch === QUOTE ||
      ch === "\\"
    ) {
      needs = true;
      break;
    }
  }
  if (!needs) return raw;
  const escaped = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `${QUOTE}${escaped}${QUOTE}`;
}
