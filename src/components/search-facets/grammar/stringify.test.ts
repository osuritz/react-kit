import { describe, expect, test } from 'vitest';
import { parseQuery } from './parse';
import { clauseToString, queryToString, valueToString } from './stringify';
import type { FacetSchema, Query } from './types';

const schema: FacetSchema = [
  { name: 'from', type: 'string' },
  { name: 'to', type: 'string' },
  { name: 'subject', type: 'string' },
  { name: 'has', type: 'boolean', values: ['attachment'] },
  { name: 'label', type: 'enum', values: [{ value: 'spam' }, { value: 'inbox' }] },
  { name: 'size', type: 'number', ops: ['eq', 'gte', 'lte', 'range'] },
  { name: 'date', type: 'date', ops: ['eq', 'gte', 'lte', 'range'] },
];

describe('valueToString', () => {
  test('plain literal', () => {
    expect(valueToString({ kind: 'literal', raw: 'bob' })).toBe('bob');
  });

  test('literal with space gets quoted', () => {
    expect(valueToString({ kind: 'literal', raw: 'alice cooper' })).toBe('"alice cooper"');
  });

  test('compare ops', () => {
    expect(valueToString({ kind: 'compare', op: 'gte', raw: '10' })).toBe('>=10');
    expect(valueToString({ kind: 'compare', op: 'lte', raw: '10' })).toBe('<=10');
    expect(valueToString({ kind: 'compare', op: 'eq', raw: '10' })).toBe('=10');
  });

  test('range', () => {
    expect(valueToString({ kind: 'range', from: '1', to: '5' })).toBe('1..5');
  });

  test('range with spaces in endpoints quotes both sides', () => {
    expect(valueToString({ kind: 'range', from: 'a b', to: 'c d' })).toBe('"a b".."c d"');
  });

  test('escapes embedded quote and backslash', () => {
    expect(valueToString({ kind: 'literal', raw: 'a"b' })).toBe('"a\\"b"');
    expect(valueToString({ kind: 'literal', raw: 'a\\b' })).toBe('"a\\\\b"');
  });
});

describe('clauseToString', () => {
  test('basic', () => {
    expect(
      clauseToString({
        facet: 'from',
        negated: false,
        value: { kind: 'literal', raw: 'bob' },
      })
    ).toBe('from:bob');
  });

  test('negated', () => {
    expect(
      clauseToString({
        facet: 'label',
        negated: true,
        value: { kind: 'literal', raw: 'spam' },
      })
    ).toBe('-label:spam');
  });
});

describe('queryToString', () => {
  test('empty AST', () => {
    expect(queryToString({ clauses: [], freeText: '' })).toBe('');
  });

  test('clauses + free text', () => {
    const ast: Query = {
      clauses: [
        {
          facet: 'from',
          negated: false,
          value: { kind: 'literal', raw: 'bob' },
        },
      ],
      freeText: 'hello',
    };
    expect(queryToString(ast)).toBe('from:bob hello');
  });

  test('trims trailing/leading whitespace from freeText', () => {
    const ast: Query = { clauses: [], freeText: '   hello   ' };
    expect(queryToString(ast)).toBe('hello');
  });
});

describe('round-trip parseQuery <-> queryToString', () => {
  const cases = [
    '',
    'from:bob',
    '-label:spam',
    'from:"alice cooper"',
    'from:bob has:attachment',
    'size:>=1024',
    'size:100..500',
    'date:"2024-01-01".."2024-12-31"',
    'hello world',
    'from:bob hello world has:attachment',
    'subject:"a \\"quote\\" inside"',
    'from:alice from:bob',
  ];

  test.each(cases)('round-trips: %s', (input) => {
    const first = parseQuery(input, schema);
    const reSerialized = queryToString(first.ast);
    const second = parseQuery(reSerialized, schema);
    expect(second.ast).toEqual(first.ast);
  });
});

describe('AST -> string -> AST property check', () => {
  function ast(...clauses: Query['clauses']): Query {
    return { clauses, freeText: '' };
  }

  const fixtures: Query[] = [
    ast({ facet: 'from', negated: false, value: { kind: 'literal', raw: 'bob' } }),
    ast({ facet: 'from', negated: true, value: { kind: 'literal', raw: 'alice cooper' } }),
    ast({ facet: 'size', negated: false, value: { kind: 'compare', op: 'gte', raw: '1024' } }),
    ast({ facet: 'size', negated: false, value: { kind: 'range', from: '10', to: '20' } }),
    ast({
      facet: 'subject',
      negated: false,
      value: { kind: 'literal', raw: 'has "quotes" and \\ backslashes' },
    }),
    {
      clauses: [
        { facet: 'from', negated: false, value: { kind: 'literal', raw: 'alice' } },
        { facet: 'has', negated: false, value: { kind: 'literal', raw: 'attachment' } },
      ],
      freeText: 'urgent stuff',
    },
  ];

  test.each(fixtures.map((f, i) => [i, f]))(
    'fixture #%i round-trips identically',
    (_i, original: Query) => {
      const out = queryToString(original);
      const parsed = parseQuery(out, schema);
      expect(parsed.ast).toEqual(original);
      expect(parsed.errors).toHaveLength(0);
    }
  );
});
