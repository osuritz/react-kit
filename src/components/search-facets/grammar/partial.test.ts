import { describe, expect, test } from "vitest";
import { classifyPartialToken, hasOpenQuote } from "./partial";
import type { FacetSchema } from "./types";

const schema: FacetSchema = [
  { name: "from", type: "string" },
  { name: "size", type: "number", ops: ["gte"] },
];

describe("classifyPartialToken", () => {
  test("empty input", () => {
    expect(classifyPartialToken("", schema)).toEqual({ kind: "empty" });
    expect(classifyPartialToken("   ", schema)).toEqual({ kind: "empty" });
  });

  test("plain text -> facet-name (it could complete to a facet)", () => {
    expect(classifyPartialToken("fr", schema)).toEqual({
      kind: "facet-name",
      negated: false,
      partial: "fr",
    });
  });

  test("with leading dash -> negated facet-name partial", () => {
    expect(classifyPartialToken("-fr", schema)).toEqual({
      kind: "facet-name",
      negated: true,
      partial: "fr",
    });
  });

  test("input with spaces (not actually a single token) collapses to free", () => {
    // This shouldn't happen in practice — caller passes the trailing token.
    // But text containing a space cannot match a facet name pattern, so we
    // classify it as free text.
    expect(classifyPartialToken("hello there", schema)).toEqual({
      kind: "free",
      text: "hello there",
    });
  });

  test("facet:value where value is empty after the colon", () => {
    expect(classifyPartialToken("from:", schema)).toEqual({
      kind: "facet-value",
      negated: false,
      facet: "from",
      facetKnown: true,
      valuePartial: "",
    });
  });

  test("complete clause with literal value", () => {
    expect(classifyPartialToken("from:bob", schema)).toEqual({
      kind: "complete",
      facetKnown: true,
      clause: {
        facet: "from",
        negated: false,
        value: { kind: "literal", raw: "bob" },
      },
    });
  });

  test("complete clause with negation", () => {
    const result = classifyPartialToken("-from:bob", schema);
    expect(result.kind).toBe("complete");
    if (result.kind !== "complete") return;
    expect(result.clause.negated).toBe(true);
  });

  test("unknown facet name still parses but flags facetKnown=false", () => {
    const result = classifyPartialToken("foo:bar", schema);
    expect(result.kind).toBe("complete");
    if (result.kind !== "complete") return;
    expect(result.facetKnown).toBe(false);
  });

  test("compare value with no operand yet", () => {
    expect(classifyPartialToken("size:>=", schema)).toEqual({
      kind: "facet-value",
      negated: false,
      facet: "size",
      facetKnown: true,
      valuePartial: ">=",
    });
  });
});

describe("hasOpenQuote", () => {
  test("balanced -> false", () => {
    expect(hasOpenQuote('from:"alice"')).toBe(false);
    expect(hasOpenQuote('from:"a" to:"b"')).toBe(false);
    expect(hasOpenQuote("plain")).toBe(false);
  });

  test("unbalanced -> true", () => {
    expect(hasOpenQuote('from:"alice')).toBe(true);
    expect(hasOpenQuote('from:"a" to:"b')).toBe(true);
  });
});
