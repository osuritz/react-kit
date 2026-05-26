import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { StringEditor } from './string-editor';
import { BooleanEditor } from './boolean-editor';
import { NumberEditor } from './number-editor';
import { EnumEditor } from './enum-editor';
import type { BooleanFacet, EnumFacet, NumberFacet, StringFacet, Value } from '../grammar/types';

const noop = () => {};

const stringFacet: StringFacet = { name: 'subject', type: 'string', label: 'Subject' };
const booleanFacet: BooleanFacet = { name: 'has', type: 'boolean', values: ['attachment', 'star'] };
const enumFacet: EnumFacet = {
  name: 'label',
  type: 'enum',
  values: [{ value: 'spam' }, { value: 'inbox' }],
};
const numberFacet: NumberFacet = {
  name: 'size',
  type: 'number',
  ops: ['eq', 'gte', 'lte', 'range'],
};

// Stable references so a rerender only changes the prop under test (the editors
// resync their draft when the `value`/`negated` prop *identity* changes).
const fooLiteral: Value = { kind: 'literal', raw: 'foo' };
const barLiteral: Value = { kind: 'literal', raw: 'bar' };

describe('editor resync when value/negated props change', () => {
  test('StringEditor resets its text to match a new value prop', () => {
    const { rerender } = render(
      <StringEditor
        facet={stringFacet}
        value={fooLiteral}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('textbox')).toHaveValue('foo');

    rerender(
      <StringEditor
        facet={stringFacet}
        value={barLiteral}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('textbox')).toHaveValue('bar');
  });

  test('StringEditor resets its negate toggle to match a new negated prop', () => {
    const { rerender } = render(
      <StringEditor
        facet={stringFacet}
        value={fooLiteral}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(
      <StringEditor
        facet={stringFacet}
        value={fooLiteral}
        negated
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  test('BooleanEditor resets the selected radio to match a new value prop', () => {
    const attachment: Value = { kind: 'literal', raw: 'attachment' };
    const star: Value = { kind: 'literal', raw: 'star' };
    const { rerender } = render(
      <BooleanEditor
        facet={booleanFacet}
        value={attachment}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('radio', { name: 'attachment' })).toBeChecked();

    rerender(
      <BooleanEditor
        facet={booleanFacet}
        value={star}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('radio', { name: 'star' })).toBeChecked();
  });

  test('NumberEditor resets op and value to match a new value prop', () => {
    const eqFive: Value = { kind: 'literal', raw: '5' };
    const gteTen: Value = { kind: 'compare', op: 'gte', raw: '10' };
    const { rerender } = render(
      <NumberEditor
        facet={numberFacet}
        value={eqFive}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('eq');
    expect(screen.getByRole('spinbutton')).toHaveValue(5);

    rerender(
      <NumberEditor
        facet={numberFacet}
        value={gteTen}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('gte');
    expect(screen.getByRole('spinbutton')).toHaveValue(10);
  });

  test('EnumEditor resets the selected radio to match a new value prop', () => {
    const spam: Value = { kind: 'literal', raw: 'spam' };
    const inbox: Value = { kind: 'literal', raw: 'inbox' };
    const { rerender } = render(
      <EnumEditor facet={enumFacet} value={spam} negated={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('radio', { name: 'spam' })).toBeChecked();

    rerender(
      <EnumEditor facet={enumFacet} value={inbox} negated={false} onCommit={noop} onCancel={noop} />
    );
    expect(screen.getByRole('radio', { name: 'inbox' })).toBeChecked();
  });

  test('BooleanEditor resets its negate toggle to match a new negated prop', () => {
    // value is held referentially stable so only the negated prop changes.
    const attachment: Value = { kind: 'literal', raw: 'attachment' };
    const { rerender } = render(
      <BooleanEditor
        facet={booleanFacet}
        value={attachment}
        negated={false}
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(
      <BooleanEditor
        facet={booleanFacet}
        value={attachment}
        negated
        onCommit={noop}
        onCancel={noop}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
