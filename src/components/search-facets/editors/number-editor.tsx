import { useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import type { CompareOp, EditorProps, NumberFacet, Value } from '../grammar/types';
import { cn, editorStyles } from '../lib/cn';

export interface NumberEditorProps extends EditorProps {
  facet: NumberFacet;
}

type Op = 'eq' | 'gte' | 'lte' | 'range';

const DEFAULT_OPS: Op[] = ['eq', 'gte', 'lte', 'range'];

const OP_LABEL: Record<Op, string> = {
  eq: '=',
  gte: '>=',
  lte: '<=',
  range: 'between',
};

/**
 * Single-row editor for `NumberFacet`. The op selector is driven by
 * `facet.ops` (default `["eq","gte","lte","range"]`). Range uses two
 * inputs (from / to). When the consumer passes only `["eq"]`, we hide
 * the op selector entirely and emit a plain `literal` (since the
 * canonical `field:value` is more idiomatic than `field:=value`).
 */
export function NumberEditor(props: NumberEditorProps) {
  const { facet, value, negated, onCommit } = props;

  const ops: Op[] = useMemo(
    () => (facet.ops && facet.ops.length > 0 ? facet.ops : DEFAULT_OPS),
    [facet.ops]
  );
  const eqOnly = ops.length === 1 && ops[0] === 'eq';

  const initial = useMemo(() => {
    if (!value) return { op: ops[0]!, raw: '', from: '', to: '' };
    if (value.kind === 'literal') {
      return { op: 'eq' as Op, raw: value.raw, from: '', to: '' };
    }
    if (value.kind === 'compare') {
      return { op: value.op as Op, raw: value.raw, from: '', to: '' };
    }
    return { op: 'range' as Op, raw: '', from: value.from, to: value.to };
  }, [value, ops]);

  const [op, setOp] = useState<Op>(initial.op);
  const [raw, setRaw] = useState<string>(initial.raw);
  const [from, setFrom] = useState<string>(initial.from);
  const [to, setTo] = useState<string>(initial.to);
  const [neg, setNeg] = useState<boolean>(negated);
  const firstRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setOp(initial.op);
    setRaw(initial.raw);
    setFrom(initial.from);
    setTo(initial.to);
    setNeg(negated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, negated]);

  const negatable = facet.negatable !== false;

  function buildValue(): Value | null {
    if (op === 'range') {
      if (from.length === 0 || to.length === 0) return null;
      return { kind: 'range', from, to };
    }
    if (raw.length === 0) return null;
    if (eqOnly) return { kind: 'literal', raw };
    return { kind: 'compare', op: op as CompareOp, raw };
  }

  function handleApply() {
    const next = buildValue();
    if (!next) return;
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div data-facet-type="number" onKeyDown={handleKeyDown} className={editorStyles.row}>
      {!eqOnly ? (
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as Op)}
          aria-label={`${facet.label ?? facet.name} operator`}
          className={editorStyles.select}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {OP_LABEL[o]}
            </option>
          ))}
        </select>
      ) : null}

      {op === 'range' ? (
        <>
          <input
            ref={firstRef}
            type="number"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="from"
            aria-label="from"
            className={cn(editorStyles.input, 'w-24 flex-none')}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="to"
            aria-label="to"
            className={cn(editorStyles.input, 'w-24 flex-none')}
          />
        </>
      ) : (
        <input
          ref={firstRef}
          type="number"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-label={facet.label ?? facet.name}
          placeholder={facet.unit ?? facet.label ?? facet.name}
          className={cn(editorStyles.input, 'w-32 flex-none')}
        />
      )}

      {facet.unit ? <span className="text-xs text-muted-foreground">{facet.unit}</span> : null}

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
