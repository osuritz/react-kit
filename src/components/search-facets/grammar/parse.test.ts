import { describe, expect, test } from "vitest";
import { parseQuery, splitFacetToken, parseFacetValue, tokenize } from "./parse";
import type { FacetSchema } from "./types";

const schema: FacetSchema = [
  { name: "from", type: "string" },
  { name: "to", type: "string" },
  { name: "subject", type: "string", allowWildcard: true },
  { name: "has", type: "boolean", values: ["attachment", "star"] },
  { name: "label", type: "enum", values: [{ value: "spam" }, { value: "inbox" }] },
  { name: "size", type: "number", ops: ["eq", "gte", "lte", "range"] },
  { name: "before", type: "date", ops: ["lte"] },
  { name: "after", type: "date", ops: ["gte"] },
  { name: "date", type: "date", ops: ["eq", "gte", "lte", "range"] },
  { name: "fixed", type: "string", negatable: false },
];

describe("tokenize", () => {
  test("splits on whitespace", () => {
    expect(tokenize("a b c").map((t) => t.text)).toEqual(["a", "b", "c"]);
  });

  test("preserves quoted runs containing spaces and retains quote characters", () => {
    const tokens = tokenize('from:"alice cooper" subject:hi');
    expect(tokens.map((t) => t.text)).toEqual([
      'from:"alice cooper"',
      "subject:hi",
    ]);
    expect(tokens[0]!.quoted).toBe(true);
  });

  test("preserves backslash-escaped quotes inside quoted runs as authored", () => {
    const tokens = tokenize('subject:"say \\"hi\\""');
    expect(tokens.map((t) => t.text)).toEqual(['subject:"say \\"hi\\""']);
  });

  test("collapses repeated whitespace", () => {
    expect(tokenize("a   b\tc").map((t) => t.text)).toEqual(["a", "b", "c"]);
  });

  test("returns no tokens for empty/whitespace input", () => {
    expect(tokenize("")).toHaveLength(0);
    expect(tokenize("   ")).toHaveLength(0);
  });
});

describe("splitFacetToken", () => {
  test("splits at first colon", () => {
    expect(splitFacetToken("from:bob")).toEqual({
      negated: false,
      facet: "from",
      rest: "bob",
    });
  });

  test("recognizes leading dash as negation", () => {
    expect(splitFacetToken("-from:bob")).toEqual({
      negated: true,
      facet: "from",
      rest: "bob",
    });
  });

  test("returns null when no colon present", () => {
    expect(splitFacetToken("plain")).toBeNull();
  });

  test("returns null when facet name has invalid chars", () => {
    expect(splitFacetToken("a b:c")).toBeNull();
  });

  test("returns null for empty facet name", () => {
    expect(splitFacetToken(":bob")).toBeNull();
    expect(splitFacetToken("-:bob")).toBeNull();
  });

  test("preserves rest with embedded colons", () => {
    expect(splitFacetToken("url:http://example.com")?.rest).toBe(
      "http://example.com",
    );
  });

  test("colons inside quoted values do not split", () => {
    const result = splitFacetToken('from:"a:b"');
    expect(result?.facet).toBe("from");
    expect(result?.rest).toBe('"a:b"');
  });
});

describe("parseFacetValue", () => {
  test("plain literal", () => {
    expect(parseFacetValue("bob")).toEqual({ kind: "literal", raw: "bob" });
  });

  test("compare ops", () => {
    expect(parseFacetValue(">=10")).toEqual({
      kind: "compare",
      op: "gte",
      raw: "10",
    });
    expect(parseFacetValue("<=10")).toEqual({
      kind: "compare",
      op: "lte",
      raw: "10",
    });
    expect(parseFacetValue(">10")).toEqual({
      kind: "compare",
      op: "gte",
      raw: "10",
    });
    expect(parseFacetValue("<10")).toEqual({
      kind: "compare",
      op: "lte",
      raw: "10",
    });
    expect(parseFacetValue("=10")).toEqual({
      kind: "compare",
      op: "eq",
      raw: "10",
    });
  });

  test("range with ..", () => {
    expect(parseFacetValue("1..5")).toEqual({
      kind: "range",
      from: "1",
      to: "5",
    });
  });

  test("strips outer quotes from a literal", () => {
    expect(parseFacetValue('"a b"')).toEqual({ kind: "literal", raw: "a b" });
  });

  test("strips quotes around the operand of a compare", () => {
    expect(parseFacetValue('>="a b"')).toEqual({
      kind: "compare",
      op: "gte",
      raw: "a b",
    });
  });

  test("strips quotes around range endpoints", () => {
    expect(parseFacetValue('"a b".."c d"')).toEqual({
      kind: "range",
      from: "a b",
      to: "c d",
    });
  });

  test("returns null for empty input", () => {
    expect(parseFacetValue("")).toBeNull();
  });
});

describe("parseQuery", () => {
  test("empty input parses to empty AST", () => {
    const r = parseQuery("", schema);
    expect(r.ast).toEqual({ clauses: [], freeText: "" });
    expect(r.errors).toHaveLength(0);
  });

  test("parses a simple facet", () => {
    const r = parseQuery("from:bob", schema);
    expect(r.ast.clauses).toEqual([
      {
        facet: "from",
        negated: false,
        value: { kind: "literal", raw: "bob" },
      },
    ]);
    expect(r.ast.freeText).toBe("");
    expect(r.errors).toHaveLength(0);
  });

  test("parses negation", () => {
    const r = parseQuery("-label:spam", schema);
    expect(r.ast.clauses).toEqual([
      {
        facet: "label",
        negated: true,
        value: { kind: "literal", raw: "spam" },
      },
    ]);
  });

  test("parses quoted values with spaces", () => {
    const r = parseQuery('from:"alice cooper"', schema);
    expect(r.ast.clauses).toEqual([
      {
        facet: "from",
        negated: false,
        value: { kind: "literal", raw: "alice cooper" },
      },
    ]);
  });

  test("interleaves free text and facets, preserving free-text order", () => {
    const r = parseQuery("hello from:bob world has:attachment", schema);
    expect(r.ast.clauses).toHaveLength(2);
    expect(r.ast.clauses[0]!.facet).toBe("from");
    expect(r.ast.clauses[1]!.facet).toBe("has");
    expect(r.ast.freeText).toBe("hello world");
  });

  test("number compare", () => {
    const r = parseQuery("size:>=1024", schema);
    expect(r.ast.clauses).toEqual([
      {
        facet: "size",
        negated: false,
        value: { kind: "compare", op: "gte", raw: "1024" },
      },
    ]);
  });

  test("number range", () => {
    const r = parseQuery("size:100..500", schema);
    expect(r.ast.clauses).toEqual([
      {
        facet: "size",
        negated: false,
        value: { kind: "range", from: "100", to: "500" },
      },
    ]);
  });

  test("date range with quoted endpoints", () => {
    const r = parseQuery('date:"2024-01-01".."2024-12-31"', schema);
    expect(r.ast.clauses[0]!.value).toEqual({
      kind: "range",
      from: "2024-01-01",
      to: "2024-12-31",
    });
  });

  test("repeated same facet produces two clauses", () => {
    const r = parseQuery("from:alice from:bob", schema);
    expect(r.ast.clauses).toHaveLength(2);
    expect(r.ast.clauses.map((c) => c.value)).toEqual([
      { kind: "literal", raw: "alice" },
      { kind: "literal", raw: "bob" },
    ]);
  });

  test("unknown facet falls back to free text and emits an error", () => {
    const r = parseQuery("foo:bar real text", schema);
    expect(r.ast.clauses).toHaveLength(0);
    expect(r.ast.freeText).toBe("foo:bar real text");
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]!.message).toMatch(/Unknown facet/);
  });

  test("non-negatable facet flagged when negated", () => {
    const r = parseQuery("-fixed:x", schema);
    expect(r.errors[0]!.message).toMatch(/not negatable/);
  });

  test("enum value out of allowed set is flagged", () => {
    const r = parseQuery("label:archive", schema);
    expect(r.errors[0]!.message).toMatch(/does not accept value/);
  });

  test("number facet with disallowed op is flagged", () => {
    const r = parseQuery("before:>=2024-01-01", schema);
    expect(r.errors[0]!.message).toMatch(/does not allow op/);
  });

  test("number facet with disallowed range is flagged", () => {
    const r = parseQuery("before:2024-01-01..2024-02-01", schema);
    expect(r.errors[0]!.message).toMatch(/does not allow range/);
  });

  test("quoted token without a colon is treated as free text (no facet shape)", () => {
    const r = parseQuery('"plain phrase"', schema);
    expect(r.ast.freeText).toBe("plain phrase");
    expect(r.ast.clauses).toHaveLength(0);
  });

  test("error indices point at the original token positions", () => {
    const r = parseQuery("hello foo:bar there", schema);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]!.index).toBe(6);
    expect(r.errors[0]!.length).toBe(7);
  });
});
