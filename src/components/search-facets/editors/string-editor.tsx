import { useEffect, useRef, useState } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import type { EditorProps, StringFacet, Value } from '../grammar/types';
import { cn, editorStyles } from '../lib/cn';

export interface StringEditorProps extends EditorProps {
  facet: StringFacet;
}

/**
 * Single-row editor for `StringFacet`. A free-text input that emits a
 * `literal` Value on commit. When `allowWildcard` is true, a small hint
 * about `*` is surfaced inline.
 */
export function StringEditor(props: StringEditorProps) {
  const { facet, value, negated, onCommit } = props;

  const initialRaw = value && value.kind === 'literal' ? value.raw : '';
  const [text, setText] = useState<string>(initialRaw);
  const [neg, setNeg] = useState<boolean>(negated);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText(initialRaw);
    setNeg(negated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, negated]);

  const negatable = facet.negatable !== false;

  function handleApply() {
    if (text.length === 0) return;
    const next: Value = { kind: 'literal', raw: text };
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div data-facet-type="string" className={editorStyles.row}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={facet.label ?? facet.name}
        placeholder={facet.label ?? facet.name}
        className={editorStyles.input}
      />
      {facet.allowWildcard ? (
        <span className="text-xs text-muted-foreground">
          (use <code className="font-mono">*</code> as wildcard)
        </span>
      ) : null}
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
