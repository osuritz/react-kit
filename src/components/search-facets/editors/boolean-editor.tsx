import { useRef, useState } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Checkbox } from '@base-ui/react/checkbox';
import type { BooleanFacet, EditorProps, Value } from '../grammar/types';
import { cn, editorStyles } from '../lib/cn';

export interface BooleanEditorProps extends EditorProps {
  facet: BooleanFacet;
}

/**
 * Single-row editor for `BooleanFacet`. Renders the available `values`
 * as radio buttons and a "Negate" toggle. Commits a `literal` Value.
 */
export function BooleanEditor(props: BooleanEditorProps) {
  const { facet, value, negated, onCommit } = props;

  const initialRaw = value && value.kind === 'literal' ? value.raw : (facet.values[0] ?? '');
  const [selected, setSelected] = useState<string>(initialRaw);
  const [neg, setNeg] = useState<boolean>(negated);
  const firstRef = useRef<HTMLInputElement | null>(null);

  // Resync the draft when the incoming value/negated identity changes by
  // adjusting state during render rather than in an effect — this avoids the
  // extra commit + cascading render. See react.dev "You Might Not Need an Effect".
  const [prevValue, setPrevValue] = useState(value);
  const [prevNegated, setPrevNegated] = useState(negated);
  if (value !== prevValue || negated !== prevNegated) {
    setPrevValue(value);
    setPrevNegated(negated);
    setSelected(initialRaw);
    setNeg(negated);
  }

  const negatable = facet.negatable !== false;

  function handleApply() {
    const next: Value = { kind: 'literal', raw: selected };
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div data-facet-type="boolean" onKeyDown={handleKeyDown} className={editorStyles.row}>
      <RadioGroup
        value={selected}
        onValueChange={(v) => setSelected(String(v))}
        aria-label={facet.label ?? facet.name}
        className={editorStyles.radioGroup}
      >
        {facet.values.map((v, idx) => (
          <label key={v} className={editorStyles.radioLabel}>
            <Radio.Root
              value={v}
              inputRef={idx === 0 ? firstRef : undefined}
              className={editorStyles.radio}
            >
              <Radio.Indicator className={editorStyles.radioIndicator} />
            </Radio.Root>
            <span>{v}</span>
          </label>
        ))}
      </RadioGroup>
      {negatable ? (
        <label className={editorStyles.checkboxLabel}>
          <Checkbox.Root
            checked={neg}
            onCheckedChange={(c) => setNeg(Boolean(c))}
            className={editorStyles.checkbox}
          >
            <Checkbox.Indicator className="text-current">
              <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
                <path
                  d="M3 8l3 3 7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Checkbox.Indicator>
          </Checkbox.Root>
          Negate
        </label>
      ) : null}
      <button
        type="button"
        onClick={handleApply}
        className={cn(editorStyles.primaryButton, 'ml-auto')}
      >
        Apply
      </button>
    </div>
  );
}
