import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SearchFacets } from './search-facets';
import { useSearchFacets } from './use-search-facets';
import { renderHook } from '@testing-library/react';
import type { FacetSchema, Query } from './grammar/types';
import { parseQuery } from './grammar/parse';
import { queryToString } from './grammar/stringify';

const schema: FacetSchema = [
  { name: 'from', type: 'string', label: 'From' },
  { name: 'to', type: 'string', label: 'To' },
  { name: 'subject', type: 'string', label: 'Subject', allowWildcard: true },
  { name: 'has', type: 'boolean', values: ['attachment', 'star'], label: 'Has' },
  {
    name: 'label',
    type: 'enum',
    values: [{ value: 'spam' }, { value: 'inbox' }],
    label: 'Label',
  },
  { name: 'size', type: 'number', ops: ['eq', 'gte', 'lte', 'range'], label: 'Size' },
  { name: 'fixed', type: 'string', negatable: false, label: 'Fixed' },
];

const EMPTY: Query = { clauses: [], freeText: '' };

function Controlled({
  initial = EMPTY,
  onValue,
  ...rest
}: {
  initial?: Query;
  onValue?: (q: Query) => void;
} & Partial<React.ComponentProps<typeof SearchFacets>>) {
  const [value, setValue] = useState<Query>(initial);
  return (
    <SearchFacets
      schema={schema}
      value={value}
      onChange={(q) => {
        setValue(q);
        onValue?.(q);
      }}
      placeholder="Search..."
      {...rest}
    />
  );
}

describe('SearchFacets — controlled rendering', () => {
  test('renders chips for each clause in the AST', () => {
    const initial = parseQuery('from:bob -label:spam', schema).ast;
    render(<Controlled initial={initial} />);
    expect(screen.getByText(/from:bob/)).toBeInTheDocument();
    expect(screen.getByText(/-label:spam/)).toBeInTheDocument();
  });

  test('renders the input with the configured placeholder', () => {
    render(<Controlled />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  test("renders the default '+ Add filter' trigger", () => {
    render(<Controlled />);
    expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument();
  });
});

describe('SearchFacets — parse-on-space', () => {
  test("typing 'from:bob ' commits a chip and clears the input", async () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'from:bob ');
    const last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses).toEqual([
      { facet: 'from', negated: false, value: { kind: 'literal', raw: 'bob' } },
    ]);
    expect((input as HTMLInputElement).value).toBe('');
  });

  test("typing 'from:bob' (no trailing space) does NOT commit", async () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'from:bob');
    expect(onValue).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('from:bob');
  });

  test('space inside an open quote does NOT commit', async () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'from:"alice ');
    expect(onValue).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('from:"alice ');
  });

  test('typing a free-text token followed by space leaves the buffer alone', async () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'hello ');
    expect(onValue).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('hello ');
  });

  test('Enter on a complete token commits as well', async () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'from:alice{Enter}');
    const last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses[0]?.facet).toBe('from');
  });
});

describe('SearchFacets — chip removal via Backspace', () => {
  test('Backspace on empty input removes the last chip', async () => {
    const initial = parseQuery('from:bob has:attachment', schema).ast;
    const onValue = vi.fn();
    render(<Controlled initial={initial} onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    input.focus();
    await userEvent.keyboard('{Backspace}');
    const last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses).toHaveLength(1);
    expect(last.clauses[0]?.facet).toBe('from');
  });

  test('Backspace with non-empty input does NOT remove a chip', async () => {
    const initial = parseQuery('from:bob', schema).ast;
    const onValue = vi.fn();
    render(<Controlled initial={initial} onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await userEvent.type(input, 'x');
    onValue.mockClear();
    await userEvent.keyboard('{Backspace}');
    // Input change may or may not fire onValue, but no chip removal:
    const removed = onValue.mock.calls.find((call: unknown[]) => {
      const q = call[0] as Query;
      return q.clauses.length === 0;
    });
    expect(removed).toBeUndefined();
  });
});

describe('SearchFacets — negation toggle', () => {
  test('clicking the chip negate toggle flips negated', async () => {
    const initial = parseQuery('from:bob', schema).ast;
    const onValue = vi.fn();
    render(<Controlled initial={initial} onValue={onValue} />);
    const button = screen.getByLabelText('Negate filter');
    fireEvent.click(button);
    const last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses[0]?.negated).toBe(true);
  });

  test('non-negatable facet does not produce a working toggle (still flips visually but flips back via hook guard)', async () => {
    // The chip-strip renders the toggle unconditionally for visual symmetry,
    // but the hook's toggleNegation guards against non-negatable facets and
    // returns without dispatching onChange. So firing the click should be
    // a no-op for AST.
    const initial: Query = {
      clauses: [
        {
          facet: 'fixed',
          negated: false,
          value: { kind: 'literal', raw: 'x' },
        },
      ],
      freeText: '',
    };
    const onValue = vi.fn();
    render(<Controlled initial={initial} onValue={onValue} />);
    const button = screen.getByLabelText('Negate filter');
    fireEvent.click(button);
    expect(onValue).not.toHaveBeenCalled();
  });
});

describe('SearchFacets — controlled round-trip', () => {
  test('a parsed string round-trips through render -> AST -> stringify -> parse', () => {
    const inputs = [
      'from:bob has:attachment',
      '-label:spam',
      'from:"alice cooper" hello',
      'size:>=1024',
      'size:100..500',
    ];
    for (const s of inputs) {
      const ast = parseQuery(s, schema).ast;
      const out = queryToString(ast);
      const reparsed = parseQuery(out, schema).ast;
      expect(reparsed).toEqual(ast);
    }
  });

  test('clauses + free text render together', () => {
    const initial = parseQuery('hello from:bob world', schema).ast;
    render(<Controlled initial={initial} />);
    expect(screen.getByText(/from:bob/)).toBeInTheDocument();
    // free text isn't rendered as a chip; it lives in the AST until the
    // consumer renders it (e.g., as a search summary). Just confirm AST.
    expect(initial.freeText).toBe('hello world');
  });
});

describe('SearchFacets — facet-name suggestions', () => {
  test('typing a facet prefix shows matching suggestions', async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'fr');
    expect(screen.getByText('From')).toBeInTheDocument();
  });

  test("clicking a suggestion replaces the partial token with 'name:'", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await userEvent.type(input, 'fr');
    fireEvent.click(screen.getByText('From'));
    expect(input.value).toBe('from:');
  });
});

describe('SearchFacets — onSubmit', () => {
  test('Enter on empty input fires onSubmit with the current value', async () => {
    const initial = parseQuery('from:bob', schema).ast;
    const onSubmit = vi.fn();
    render(<Controlled initial={initial} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText('Search...');
    input.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0].clauses[0]?.facet).toBe('from');
  });

  test('Enter on a buffer with a complete token commits the chip and does NOT fire onSubmit', async () => {
    const onSubmit = vi.fn();
    const onValue = vi.fn();
    render(<Controlled onSubmit={onSubmit} onValue={onValue} />);
    const input = screen.getByPlaceholderText('Search...');
    await userEvent.type(input, 'from:alice{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onValue).toHaveBeenCalled();
  });
});

describe('useSearchFacets — direct hook contract', () => {
  test('addClause appends and triggers onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSearchFacets({ schema, value: EMPTY, onChange }));
    act(() => {
      result.current.addClause({
        facet: 'from',
        negated: false,
        value: { kind: 'literal', raw: 'bob' },
      });
    });
    expect(onChange).toHaveBeenCalledWith({
      clauses: [{ facet: 'from', negated: false, value: { kind: 'literal', raw: 'bob' } }],
      freeText: '',
    });
  });

  test('toggleNegation flips negated for negatable facets', () => {
    const initial = parseQuery('from:bob', schema).ast;
    const onChange = vi.fn();
    const { result } = renderHook(() => useSearchFacets({ schema, value: initial, onChange }));
    act(() => {
      result.current.toggleNegation(0);
    });
    expect(onChange.mock.calls[0]?.[0].clauses[0].negated).toBe(true);
  });

  test('toggleNegation is a no-op for non-negatable facets', () => {
    const initial: Query = {
      clauses: [{ facet: 'fixed', negated: false, value: { kind: 'literal', raw: 'x' } }],
      freeText: '',
    };
    const onChange = vi.fn();
    const { result } = renderHook(() => useSearchFacets({ schema, value: initial, onChange }));
    act(() => {
      result.current.toggleNegation(0);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('commitTrailingToken returns false when the buffer is incomplete', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useSearchFacets({ schema, value: EMPTY, onChange }));
    act(() => {
      result.current.setInputValue('from:');
    });
    let returned: boolean | undefined;
    act(() => {
      returned = result.current.commitTrailingToken();
    });
    expect(returned).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
