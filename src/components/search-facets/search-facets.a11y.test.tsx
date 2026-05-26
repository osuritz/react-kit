/**
 * Accessibility-focused tests for `<SearchFacets>`.
 *
 * The general suite in `search-facets.test.tsx` covers behavior; this file
 * locks down the a11y contract — accessible names, ARIA state, keyboard
 * interactions, focus management, and live announcements. Re-test what the
 * component layered on top of Base UI; don't re-test Base UI's primitives.
 */

import { useState } from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SearchFacets } from './search-facets';
import type { FacetSchema, Query } from './grammar/types';
import { parseQuery } from './grammar/parse';

const schema: FacetSchema = [
  { name: 'from', type: 'string', label: 'From' },
  { name: 'to', type: 'string', label: 'To' },
  { name: 'subject', type: 'string', label: 'Subject', allowWildcard: true },
  {
    name: 'has',
    type: 'boolean',
    values: ['attachment', 'star'],
    label: 'Has',
  },
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

describe('a11y — accessible names', () => {
  test('the search input is exposed as a combobox', () => {
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    // The trailing-token suggestion list is closed by default.
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test("the '+ Add filter' trigger has a button role and dialog haspopup", () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: /add filter/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('trigger aria-expanded flips to true when the popover opens', () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: /add filter/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  test("non-negated chip exposes 'Filter: <facet> is <value>' as accessible label", () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    // The chip root is labeled for SR users so the whole chip reads as one
    // unit on enter; the inner edit button repeats the same content with
    // an "Edit filter:" prefix so click-targets are unambiguous.
    expect(screen.getByRole('button', { name: 'Edit filter: from is bob' })).toBeInTheDocument();
  });

  test("negated chip uses 'is NOT' in its accessible label", () => {
    const initial = parseQuery('-label:spam', schema).ast;
    render(<Controlled initial={initial} />);
    expect(
      screen.getByRole('button', { name: 'Edit filter: label is NOT spam' })
    ).toBeInTheDocument();
  });

  test('chip remove button names the filter being removed (not just the facet)', () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    const remove = screen.getByRole('button', {
      name: /remove filter from is bob/i,
    });
    expect(remove).toBeInTheDocument();
  });

  test('negate toggle is a button with aria-pressed reflecting state', () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    const toggle = screen.getByRole('button', { name: 'Negate filter' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    // After flipping, label changes to "Remove negation" and pressed is true.
    const flipped = screen.getByRole('button', { name: 'Remove negation' });
    expect(flipped).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('a11y — keyboard flow', () => {
  test('a keyboard-only user can add a chip, toggle negation, and remove it', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);

    // Type a complete token and commit with space.
    const input = screen.getByRole('combobox');
    input.focus();
    await user.keyboard('from:bob ');
    let last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses).toHaveLength(1);
    expect(last.clauses[0]?.facet).toBe('from');

    // Activate the negate button via the keyboard. We use user.click after
    // focusing — userEvent simulates the full mouse/keyboard activation
    // path; jsdom doesn't synthesize a click from Enter on a <button>.
    const negate = screen.getByRole('button', { name: 'Negate filter' });
    negate.focus();
    expect(document.activeElement).toBe(negate);
    await user.click(negate);
    last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses[0]?.negated).toBe(true);

    // Remove via the chip remove button. Focus is keyboard-reachable
    // through the composite chip controls; activating it removes the chip.
    const remove = screen.getByRole('button', {
      name: /remove filter from is NOT bob/i,
    });
    remove.focus();
    expect(document.activeElement).toBe(remove);
    await user.click(remove);
    last = onValue.mock.calls.at(-1)?.[0] as Query;
    expect(last.clauses).toHaveLength(0);
  });

  test('Escape closes the builder popover and returns focus to the trigger', async () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: /add filter/i });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Esc on the dialog closes via Base UI's Popover.
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    // Wait one frame for our focus-restore rAF.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  test('Backspace on empty input removes the trailing chip and announces it', async () => {
    const initial = parseQuery('from:bob has:attachment', schema).ast;
    render(<Controlled initial={initial} />);
    const input = screen.getByRole('combobox');
    input.focus();
    await userEvent.keyboard('{Backspace}');
    expect(
      screen.queryByRole('button', { name: /edit filter: has is attachment/i })
    ).not.toBeInTheDocument();
    // Live region announces the removal.
    expect(screen.getByRole('status')).toHaveTextContent(/filter removed/i);
  });
});

describe('a11y — popover semantics & focus', () => {
  test('the builder popover exposes role=dialog with an accessible name', () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Either aria-label or aria-labelledby resolves to a name.
    expect(dialog).toHaveAccessibleName(/add filter/i);
  });

  test("the popover dialog's accessible name reflects edit mode", () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    const editBtn = screen.getByRole('button', {
      name: /edit filter: from is bob/i,
    });
    fireEvent.click(editBtn);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/edit filter/i);
  });

  test("opening the popover for 'add new' moves focus into the dialog", async () => {
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: /add filter/i }));
    // rAF fires our deferred focus call.
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  test('opening in edit mode focuses a control inside the matching row', async () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: /edit filter: from is bob/i }));
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    const dialog = screen.getByRole('dialog');
    // The "From" row's editor input has aria-label="From" and should be
    // focused when we open in edit mode for that clause.
    const fromRow = dialog.querySelector('[data-facet-name="from"]');
    expect(fromRow).not.toBeNull();
    expect(fromRow!.contains(document.activeElement)).toBe(true);
  });
});

describe('a11y — suggestion list semantics', () => {
  test('typing a facet prefix exposes a listbox of options', async () => {
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'fr');
    // Base UI provides role=listbox/option; we only assert they exist so
    // the contract is locked in.
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveTextContent(/from/i);
  });

  test("the input's aria-expanded flips when the suggestion list opens", async () => {
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.type(input, 'fr');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('a11y — live region', () => {
  test('committing a chip via parse-on-space announces its label', async () => {
    render(<Controlled />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'from:bob ');
    expect(screen.getByRole('status')).toHaveTextContent(/filter added: from is bob/i);
  });

  test('removing a chip via the remove button announces the removal', () => {
    const initial = parseQuery('from:bob', schema).ast;
    render(<Controlled initial={initial} />);
    fireEvent.click(screen.getByRole('button', { name: /remove filter from is bob/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/filter removed/i);
  });
});

describe('a11y — form embedding', () => {
  test('Enter on empty input fires onSubmit (component-level submit)', async () => {
    const initial = parseQuery('from:bob', schema).ast;
    const onSubmit = vi.fn();
    render(<Controlled initial={initial} onSubmit={onSubmit} />);
    const input = screen.getByRole('combobox');
    input.focus();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('non-negatable facet still presents the negate toggle but it does not change AST', () => {
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
    // A button is still present (visual symmetry) but firing it is a
    // no-op at the AST level — verified separately, here we just lock
    // that the accessible name still distinguishes state on init.
    const toggle = screen.getByRole('button', { name: 'Negate filter' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(onValue).not.toHaveBeenCalled();
  });
});
