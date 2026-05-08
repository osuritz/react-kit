import { useEffect, useRef, useState } from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Checkbox } from "@base-ui/react/checkbox";
import type { BooleanFacet, EditorProps, Value } from "../grammar/types";

export interface BooleanEditorProps extends EditorProps {
  facet: BooleanFacet;
  classNames?: { editor?: string };
}

/**
 * Single-row editor for `BooleanFacet`. Renders the available `values`
 * as radio buttons and a "Negate" toggle. Commits a `literal` Value.
 */
export function BooleanEditor(props: BooleanEditorProps) {
  const { facet, value, negated, onCommit, classNames } = props;

  const initialRaw =
    value && value.kind === "literal" ? value.raw : (facet.values[0] ?? "");
  const [selected, setSelected] = useState<string>(initialRaw);
  const [neg, setNeg] = useState<boolean>(negated);
  const firstRef = useRef<HTMLInputElement | null>(null);

  // Keep local state in sync if the prop changes (e.g. switching edit target).
  useEffect(() => {
    setSelected(initialRaw);
    setNeg(negated);
    // intentionally only re-run when identity of value/negated changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, negated]);

  const negatable = facet.negatable !== false;

  function handleApply() {
    const next: Value = { kind: "literal", raw: selected };
    onCommit({ value: next, negated: negatable ? neg : false });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  }

  return (
    <div
      className={classNames?.editor}
      data-facet-type="boolean"
      onKeyDown={handleKeyDown}
    >
      <RadioGroup
        value={selected}
        onValueChange={(v) => setSelected(String(v))}
        aria-label={facet.label ?? facet.name}
      >
        {facet.values.map((v, idx) => (
          <label
            key={v}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}
          >
            <Radio.Root
              value={v}
              inputRef={idx === 0 ? firstRef : undefined}
            >
              <Radio.Indicator />
            </Radio.Root>
            <span>{v}</span>
          </label>
        ))}
      </RadioGroup>
      {negatable ? (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <Checkbox.Root checked={neg} onCheckedChange={(c) => setNeg(Boolean(c))}>
            <Checkbox.Indicator />
          </Checkbox.Root>
          <span>Negate</span>
        </label>
      ) : null}
      <button type="button" onClick={handleApply} style={{ marginLeft: 8 }}>
        Apply
      </button>
    </div>
  );
}
